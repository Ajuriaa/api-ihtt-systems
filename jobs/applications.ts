import * as mssql from 'mssql';
import { createObjectCsvWriter } from 'csv-writer';
import { exec, spawn} from 'child_process';
import path from 'path';

// MSSQL config
const sqlConfig: mssql.config = {
  user: 'jajuria',
  password: 'Ihtt2024**',
  server: '110.238.83.176',
  port: 1433,
  database: 'IHTT_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const QUERY = `
  SELECT
    ID AS applicationCode,
    ID_Solicitud AS applicationId,
    ID_Solicitante AS applicantId,
    ID_Expediente AS fileId,
    Expediente_Actual AS currentFile,
    NombreSolicitante AS applicantName,
    NombreEmpresa AS companyName,
    Folio AS folio,
    FechaRecibido AS receivedDate,
    Preforma AS preform,
    ID_Placa AS plateId,
    Placa_ingresa AS enteredPlate,
    EXP_Varias_Placas AS multiplePlatesFile,
    Placa_Efectiva AS effectivePlate,
    Permiso_Explotacion AS operationPermit,
    Certificado_Operacion AS operationCertificate,
    Observacion AS observation,
    ID_ColegiacionAPL AS legalRepresentativeId,
    Nombre_Apoderado_Legal AS legalRepresentativeName,
    Telefono AS phone,
    Email AS email,
    ID_Tramite AS procedureId,
    ID_Categoria AS categoryId,
    DESC_Categoria AS categoryDescription,
    DESC_Clase_Tramite AS procedureClassDescription,
    DESC_Tipo_Tramite AS procedureTypeDescription,
    DESC_Modalidad AS modalityDescription,
    SistemaUsuario AS systemUser,
    Codigo_Ciudad AS cityCode,
    SitemaFecha AS systemDate,
    Fuente AS source,
    ID_gea AS geaId,
    Unidad_Censada AS censusUnit,
    Vin AS vin,
    ID_Clase_Servicio AS serviceClassId,
    DESC_Clase_Servico AS serviceClassDescription,
    Expediente_Estado AS fileStatus,
    Es_Renovacion_Automatica AS isAutomaticRenewal,
    Aldea AS village
  FROM IHTT_DB.dbo.V_busq_solicitudes
  ORDER BY SitemaFecha DESC
`;

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

export async function exportApplications(): Promise<JobResult> {
  return new Promise(async (resolve) => {
    try {
      const pool = await mssql.connect(sqlConfig);
      const result = await pool.request().query(QUERY);
      console.log(`Registros obtenidos: ${result.recordset.length}`);

      const recordsObtained = result.recordset.length;

      if (recordsObtained === 0) {
        resolve({
          tableName: 'Applications',
          recordsObtained: 0,
          recordsImported: 0,
          success: true
        });
        return;
      }

      const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, 'applications.csv'),
        header: Object.keys(result.recordset[0]).map((key) => ({ id: key, title: key })),
        alwaysQuote: true,
        headerIdDelimiter: '.'
      });

      await csvWriter.writeRecords(result.recordset);
      console.log('CSV generado como applications.csv');
      const sqlitePath = path.resolve(__dirname, '../stats.sqlite');
      const csvPath = path.resolve(__dirname, 'applications.csv');
      const sqlCommand = `
        DROP TABLE IF EXISTS applications;
        CREATE TABLE applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          applicationCode TEXT, applicationId TEXT, applicantId TEXT, fileId TEXT, currentFile TEXT,
          applicantName TEXT, companyName TEXT, folio INTEGER, receivedDate TEXT, preform TEXT,
          plateId TEXT, enteredPlate TEXT, multiplePlatesFile TEXT, effectivePlate TEXT,
          operationPermit TEXT, operationCertificate TEXT, observation TEXT,
          legalRepresentativeId TEXT, legalRepresentativeName TEXT,
          phone TEXT, email TEXT, procedureId TEXT, categoryId TEXT, categoryDescription TEXT,
          procedureClassDescription TEXT, procedureTypeDescription TEXT, modalityDescription TEXT,
          systemUser TEXT, cityCode TEXT, systemDate TEXT, source TEXT, geaId TEXT,
          censusUnit TEXT, vin TEXT, serviceClassId TEXT, serviceClassDescription TEXT,
          fileStatus TEXT, isAutomaticRenewal TEXT, village TEXT
        );
      `;

      const sqlCommand2 = `
        DROP TABLE IF EXISTS applications_raw;
        CREATE TABLE applications_raw (
          applicationCode TEXT, applicationId TEXT, applicantId TEXT, fileId TEXT, currentFile TEXT,
          applicantName TEXT, companyName TEXT, folio INTEGER, receivedDate TEXT, preform TEXT,
          plateId TEXT, enteredPlate TEXT, multiplePlatesFile TEXT, effectivePlate TEXT,
          operationPermit TEXT, operationCertificate TEXT, observation TEXT,
          legalRepresentativeId TEXT, legalRepresentativeName TEXT,
          phone TEXT, email TEXT, procedureId TEXT, categoryId TEXT, categoryDescription TEXT,
          procedureClassDescription TEXT, procedureTypeDescription TEXT, modalityDescription TEXT,
          systemUser TEXT, cityCode TEXT, systemDate TEXT, source TEXT, geaId TEXT,
          censusUnit TEXT, vin TEXT, serviceClassId TEXT, serviceClassDescription TEXT,
          fileStatus TEXT, isAutomaticRenewal TEXT, village TEXT
        );
      `;


      // Ejecutar creación de tabla en SQLite
      exec(`sqlite3 ${sqlitePath} "${sqlCommand2}"`, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
          console.error(`Error creando tabla: ${err.message}`);
          resolve({
            tableName: 'Applications',
            recordsObtained,
            recordsImported: 0,
            success: false,
            error: err.message
          });
          return;
        }
        // Ejecutar import CSV
        const sqliteProcess = spawn('sqlite3', [sqlitePath]);
        sqliteProcess.stdin.write(`.mode csv\n`);
        sqliteProcess.stdin.write(`.nullvalue null\n`);
        sqliteProcess.stdin.write(`.import --skip 1 ${csvPath} applications_raw\n`);
        sqliteProcess.stdin.end();

        sqliteProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
        });

        sqliteProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });

        sqliteProcess.on('close', (code) => {
          if (code === 0) {
            console.log('Importación a SQLite completada.');
            exec(`sqlite3 ${sqlitePath} "${sqlCommand}"`, (err) => {
              if (err) {
                console.error(`Error creando applications: ${err.message}`);
                resolve({
                  tableName: 'Applications',
                  recordsObtained,
                  recordsImported: 0,
                  success: false,
                  error: err.message
                });
                return;
              }

              // Migrar datos de applications_raw a applications
              exec(`sqlite3 ${sqlitePath} "INSERT INTO applications SELECT NULL, * FROM applications_raw;"`, (err) => {
                if (err) {
                  console.error(`Error migrando a applications: ${err.message}`);
                  resolve({
                    tableName: 'Applications',
                    recordsObtained,
                    recordsImported: 0,
                    success: false,
                    error: err.message
                  });
                } else {
                  console.log('Migración a applications completada.');
                  resolve({
                    tableName: 'Applications',
                    recordsObtained,
                    recordsImported: recordsObtained,
                    success: true
                  });
                }
              });
            });
          } else {
            console.error(`sqlite3 process exited with code ${code}`);
            resolve({
              tableName: 'Applications',
              recordsObtained,
              recordsImported: 0,
              success: false,
              error: `sqlite3 process exited with code ${code}`
            });
          }
        });
      });
    } catch (error: any) {
      console.error('Error in exportApplications:', error);
      resolve({
        tableName: 'Applications',
        recordsObtained: 0,
        recordsImported: 0,
        success: false,
        error: error.message
      });
    }
  });
}

// Only run if called directly
if (require.main === module) {
  exportApplications().catch(err => console.error(err));
}
