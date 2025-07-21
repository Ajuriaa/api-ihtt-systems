import * as mssql from 'mssql';
import { createObjectCsvWriter } from 'csv-writer';
import { exec, spawn} from 'child_process';
import path from 'path';

let pool: mssql.ConnectionPool;

// MSSQL config for ENTT_CERTIFICADOS database
const sqlConfig: mssql.config = {
  user: 'jajuria',
  password: 'Ihtt2024**',
  server: '110.238.83.176',
  port: 1433,
  database: 'ENTT_CERTIFICADOS',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const QUERY = `
SELECT 
  pr.CodigoPreRegistro as preRegistrationCode, 
  CONVERT(varchar, pr.preRegistro_Fecha, 127) as preRegistrationDate, 
  pr.RTNConcesionario as dealerRtn, 
  pr.NombreConcesionario as dealerName, 
  pr.CodigoAvisoCobro as paymentNoticeCode, 
  pr.Monto as amount, 
  pr.DESC_EstadoAviso as noticeStatus, 
  CONVERT(varchar, pr.FechaPagadoAnulado, 127) as paidCancelledDate, 
  CASE WHEN CHARINDEX('CARGA', w.DESC_Categoria) > 0 THEN 'CARGA' ELSE 'PASAJEROS' END as transportType,
  w.DESC_Categoria as categoryDescription, 
  c.Tipo as type, 
  cer.CodigoCertificado as certificateCode, 
  CONVERT(varchar, cer.FechaEmision, 127) as issueDate, 
  CONVERT(varchar, ec.SistemaFecha, 127) as deliveryDate 
FROM ENTT_CERTIFICADOS.dbo.V_Preregistro_AvisosCobro AS PR
INNER JOIN IHTT_DB.dbo.TB_Tramite AS T ON pr.CodigoTipoTramite=T.ID_Tramite
INNER JOIN IHTT_DB.dbo.TB_Categoria AS W ON T.ID_CATEGORIA = W.ID_Categoria
LEFT JOIN ENTT_CERTIFICADOS.dbo.TB_CERTIFICADOS_CONDUCTOR AS CER ON PR.RTNConcesionario=cer.CodigoConductor AND PR.CodigoPreRegistro=cer.CodigoSolicitud AND cer.CodigoEstado <> 'EDC-03'
LEFT JOIN ENTT_CERTIFICADOS.dbo.TB_Certificados_Conductor_Entrega AS EC ON cer.CodigoCertificado=ec.CodigoCertificado
LEFT JOIN ENTT_CERTIFICADOS.dbo.TB_Certificados_Conductor_Modalidad AS CM ON  cm.CodigoCertificado=cer.CodigoCertificado
LEFT JOIN IHTT_DB.dbo.TB_Tipo_Categoria_ENTT AS C ON cm.CodigoModalidad=c.ID
ORDER BY pr.CodigoAvisoCobro desc
`;

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

export async function exportSchoolCertificates(): Promise<JobResult> {
  return new Promise(async (resolve) => {
    try {
      pool = await mssql.connect(sqlConfig);

      // Execute main query
      const result = await pool.request().query(QUERY);
      console.log(`Registros obtenidos: ${result.recordset.length}`);

      const recordsObtained = result.recordset.length;

      if (recordsObtained === 0) {
        console.log('No records found, skipping CSV generation.');
        resolve({
          tableName: 'School Certificates',
          recordsObtained: 0,
          recordsImported: 0,
          success: true
        });
        return;
      }

      const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, 'school_certificates.csv'),
        header: Object.keys(result.recordset[0]).map((key) => ({ id: key, title: key })),
        alwaysQuote: true,
        headerIdDelimiter: '.'
      });

      await csvWriter.writeRecords(result.recordset);
      console.log('CSV generado como school_certificates.csv');
      
      const sqlitePath = path.resolve(__dirname, '../stats.sqlite');
      const csvPath = path.resolve(__dirname, 'school_certificates.csv');
      
      const sqlCommand = `
        DROP TABLE IF EXISTS school_certificates;
        CREATE TABLE school_certificates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          preRegistrationCode TEXT, preRegistrationDate TEXT, dealerRtn TEXT, 
          dealerName TEXT, paymentNoticeCode INTEGER, amount REAL, 
          noticeStatus TEXT, paidCancelledDate TEXT, transportType TEXT,
          categoryDescription TEXT, type TEXT, certificateCode TEXT, 
          issueDate TEXT, deliveryDate TEXT
        );
      `;

      const sqlCommand2 = `
        DROP TABLE IF EXISTS school_certificates_raw;
        CREATE TABLE school_certificates_raw (
          preRegistrationCode TEXT, preRegistrationDate TEXT, dealerRtn TEXT, 
          dealerName TEXT, paymentNoticeCode INTEGER, amount REAL, 
          noticeStatus TEXT, paidCancelledDate TEXT, transportType TEXT,
          categoryDescription TEXT, type TEXT, certificateCode TEXT, 
          issueDate TEXT, deliveryDate TEXT
        );
      `;

      // Ejecutar creación de tabla en SQLite
      exec(`sqlite3 ${sqlitePath} "${sqlCommand2}"`, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
          console.error(`Error creando tabla: ${err.message}`);
          resolve({
            tableName: 'School Certificates',
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
        sqliteProcess.stdin.write(`.import --skip 1 ${csvPath} school_certificates_raw\n`);
        sqliteProcess.stdin.end();

        sqliteProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
        });

        sqliteProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
        });

        sqliteProcess.on('close', async (code) => {
          if (code === 0) {
            console.log('Importación a SQLite completada.');
            exec(`sqlite3 ${sqlitePath} "${sqlCommand}"`, (err) => {
              if (err) {
                console.error(`Error creando school_certificates: ${err.message}`);
                resolve({
                  tableName: 'School Certificates',
                  recordsObtained,
                  recordsImported: 0,
                  success: false,
                  error: err.message
                });
                return;
              }

              // Migrar datos de school_certificates_raw a school_certificates
              exec(`sqlite3 ${sqlitePath} "INSERT INTO school_certificates SELECT NULL, * FROM school_certificates_raw;"`, async (err) => {
                if (err) {
                  console.error(`Error migrando a school_certificates: ${err.message}`);
                  resolve({
                    tableName: 'School Certificates',
                    recordsObtained,
                    recordsImported: 0,
                    success: false,
                    error: err.message
                  });
                } else {
                  console.log('Migración a school_certificates completada.');
                  resolve({
                    tableName: 'School Certificates',
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
              tableName: 'School Certificates',
              recordsObtained,
              recordsImported: 0,
              success: false,
              error: `sqlite3 process exited with code ${code}`
            });
          }
        });
      });
    } catch (error: any) {
      console.error('Error in exportSchoolCertificates:', error);
      resolve({
        tableName: 'School Certificates',
        recordsObtained: 0,
        recordsImported: 0,
        success: false,
        error: error.message
      });
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  });
}

// Only run if called directly
if (require.main === module) {
  exportSchoolCertificates().catch(err => console.error(err));
}