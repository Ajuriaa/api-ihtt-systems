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
    MU.ID_Multa AS fineId,
    MU.ID_Operativo AS operationId,
    EM.DESC_Estado AS fineStatus,
    MU.Origen AS origin,
    RE.Placa AS plate,
    CONVERT(varchar, OP.Fecha_Inicio, 127) AS startDate,
    CO.Nombre_Completo AS companyName,
    CO.ID_Conductor AS dniRtn,
    SOL.Telefono AS phone,
    SOL.Email AS email,
    RE.Certificado AS certificate,
    CU.DESC_Ciudad AS region,
    CONVERT(varchar, MU.Sistema_Fecha, 127) AS systemDate,
    AV.codigoAvisoCobro AS noticeCode,
    AD.Monto AS totalAmount,
    D.DESC_Departamento AS department,
    M.DESC_Municipio AS municipality,
    OP.Lugar AS place,
    MU.ID_Empleado as employeeId,
    CONCAT(emp.Nombres, ' ', emp.Apellidos) as employeeName,
    COALESCE(AV.CodigoBanco, '') AS bankCode,
    COALESCE(TB.DESC_Banco, '') AS bankDescription
  FROM
    IHTT_MULTAS.dbo.TB_Multas AS MU
    LEFT OUTER JOIN IHTT_MULTAS.dbo.TB_Reinicidencias AS RE ON MU.[ID_Multa] = RE.[ID_Multa]
    LEFT OUTER JOIN IHTT_MULTAS.dbo.TB_Operativo AS OP ON MU.ID_Operativo = OP.Cod_Operativo
    LEFT OUTER JOIN IHTT_MULTAS.dbo.TB_Conductor AS CO ON MU.ID_Conductor = CO.ID_Conductor
    LEFT OUTER JOIN IHTT_RRHH.dbo.TB_Empleados AS RH ON MU.ID_Empleado = RH.ID_Empleado
    INNER JOIN IHTT_RRHH.dbo.TB_Ciudades AS CU ON RH.Codigo_Ciudad = CU.Codigo_Ciudad
    INNER JOIN IHTT_MULTAS.dbo.TB_Estado_Multa AS EM ON MU.ID_Estado = EM.ID_Estado
    LEFT OUTER JOIN IHTT_DB.dbo.TB_Solicitante AS SOL ON MU.ID_Conductor = SOL.ID_Solicitante
    INNER JOIN IHTT_Webservice.dbo.TB_AvisoCobroEnc AS AV ON AV.ID_Solicitud = MU.ID_Multa
    INNER JOIN IHTT_Webservice.dbo.TB_AvisoCobroDET AS AD ON AV.codigoAvisoCobro = AD.codigoAvisoCobro
    INNER JOIN IHTT_MULTAS.dbo.TB_Municipios AS M ON OP.ID_Municipio = M.ID_Municipio
    INNER JOIN IHTT_MULTAS.dbo.TB_Departamentos AS D ON D.ID_Departamento = M.ID_Departamento
    INNER JOIN IHTT_RRHH.dbo.TB_Empleados AS emp ON MU.ID_Empleado = emp.ID_Empleado
    LEFT JOIN IHTT_Webservice.dbo.TB_Bancos AS TB ON AV.CodigoBanco = TB.ID_Banco
  WHERE
    MU.ID_Multa NOT IN (
      SELECT [Expediente_Actual]
      FROM IHTT_DB.[dbo].[TB_Expedientes]
      WHERE IHTT_DB.[dbo].[TB_Expedientes].[Expediente_Actual] LIKE '%mul%'
    )
    AND RE.ID_Infraccion IS NOT NULL
    AND RE.N_Reincidencia IS NOT NULL
    AND OP.Fecha_Inicio IS NOT NULL
    AND RE.ID_Infraccion <> '0'
    AND RE.N_Reincidencia <> '0'
    AND MU.ID_Empleado NOT IN (1265)
  ORDER BY
    CU.DESC_Ciudad ASC,
    CO.Nombre_Completo ASC,
    MU.Sistema_Fecha DESC
`;

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

export async function exportFines(): Promise<JobResult> {
  return new Promise(async (resolve) => {
    try {
      const pool = await mssql.connect(sqlConfig);
      const result = await pool.request().query(QUERY);
      console.log(`Registros obtenidos: ${result.recordset.length}`);

      const recordsObtained = result.recordset.length;

      if (recordsObtained === 0) {
        resolve({
          tableName: 'Multas',
          recordsObtained: 0,
          recordsImported: 0,
          success: true
        });
        return;
      }

      const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, 'fines.csv'),
        header: Object.keys(result.recordset[0]).map((key) => ({ id: key, title: key })),
        alwaysQuote: true,
        headerIdDelimiter: '.'
      });

      await csvWriter.writeRecords(result.recordset);
      console.log('CSV generado como fines.csv');
      const sqlitePath = path.resolve(__dirname, '../stats.sqlite');
      const csvPath = path.resolve(__dirname, 'fines.csv');
      const sqlCommand = `
        DROP TABLE IF EXISTS fines;
        CREATE TABLE fines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fineId TEXT, operationId TEXT, fineStatus TEXT, origin TEXT, plate TEXT,
          startDate TEXT, companyName TEXT, dniRtn TEXT, phone TEXT, email TEXT,
          certificate TEXT, region TEXT, systemDate TEXT, noticeCode INTEGER,
          totalAmount REAL, department TEXT, municipality TEXT, place TEXT,
          employeeId TEXT, employeeName TEXT, bankCode TEXT, bankDescription TEXT
        );
      `;

      const sqlCommand2 = `
        DROP TABLE IF EXISTS fines_raw;
        CREATE TABLE fines_raw (
          fineId TEXT, operationId TEXT, fineStatus TEXT, origin TEXT, plate TEXT,
          startDate TEXT, companyName TEXT, dniRtn TEXT, phone TEXT, email TEXT,
          certificate TEXT, region TEXT, systemDate TEXT, noticeCode INTEGER,
          totalAmount REAL, department TEXT, municipality TEXT, place TEXT,
          employeeId TEXT, employeeName TEXT, bankCode TEXT, bankDescription TEXT
        );
      `;

      // Ejecutar creación de tabla en SQLite
      exec(`sqlite3 ${sqlitePath} "${sqlCommand2}"`, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
          console.error(`Error creando tabla: ${err.message}`);
          resolve({
            tableName: 'Multas',
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
        sqliteProcess.stdin.write(`.import --skip 1 ${csvPath} fines_raw\n`);
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
                console.error(`Error creando fines: ${err.message}`);
                resolve({
                  tableName: 'Multas',
                  recordsObtained,
                  recordsImported: 0,
                  success: false,
                  error: err.message
                });
                return;
              }

              // Migrar datos de fines_raw a fines
              exec(`sqlite3 ${sqlitePath} "INSERT INTO fines SELECT NULL, * FROM fines_raw;"`, (err) => {
                if (err) {
                  console.error(`Error migrando a fines: ${err.message}`);
                  resolve({
                    tableName: 'Multas',
                    recordsObtained,
                    recordsImported: 0,
                    success: false,
                    error: err.message
                  });
                } else {
                  console.log('Migración a fines completada.');
                  resolve({
                    tableName: 'Multas',
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
              tableName: 'Multas',
              recordsObtained,
              recordsImported: 0,
              success: false,
              error: `sqlite3 process exited with code ${code}`
            });
          }
        });
      });
    } catch (error: any) {
      console.error('Error in exportFines:', error);
      resolve({
        tableName: 'Multas',
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
  exportFines().catch(err => console.error(err));
}
