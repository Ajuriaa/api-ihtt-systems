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
  SELECT TOP (100) PERCENT
    p.PermisoCodigo AS permitCode,
    p.PermisoTipoCodigo AS permitTypeCode,
    p.ConductorCodigo AS driverCode,
    p.Permiso_Estado_Codigo AS permitStatusCode,
    pes.Permiso_Estado AS permitStatus,
    p.CodigoCenso AS censusCode,
    CASE WHEN c.RTN IS NOT NULL
                  THEN c.RTN WHEN certificadoPubli.RTN_Concesionario IS NOT NULL THEN certificadoPubli.RTN_Concesionario WHEN unidad.RTNTransportista IS NOT NULL
                  THEN unidad.RTNTransportista WHEN especial.RTN_Concesionario IS NOT NULL THEN especial.RTN_Concesionario END AS rtn,
    CASE WHEN c.Nombre IS NOT NULL
                  THEN c.Nombre WHEN certificadoPubli.NombreSolicitante IS NOT NULL THEN certificadoPubli.NombreSolicitante WHEN unidad.NombreTransportista IS NOT NULL
                  THEN unidad.NombreTransportista WHEN especial.NombreSolicitante IS NOT NULL THEN especial.NombreSolicitante END AS applicantName,
    CASE WHEN c.placa IS NOT NULL THEN c.placa WHEN certificadoPubli.id_placa IS NOT NULL
                  THEN certificadoPubli.id_placa WHEN unidad.placa IS NOT NULL THEN unidad.placa WHEN especial.id_placa IS NOT NULL THEN especial.id_placa END AS plate,
    p.CodigoValidacion AS validationCode,
    p.SistemaUsuario AS systemUser,
    ISNULL(CASE emp.Nombres + ' ' + emp.Apellidos WHEN '' THEN NULL ELSE emp.Nombres + ' ' + emp.Apellidos END, 'Creado desde portal') AS employeeName,
    ISNULL(CASE emp.DESC_Ciudad WHEN '' THEN NULL
                  ELSE emp.DESC_Ciudad END, 'Creado desde portal') AS regionalOffice,
    CONVERT(varchar, p.SistemaFecha, 127) AS systemDate,
    YEAR(p.SistemaFecha) AS creationYear,
    MONTH(p.SistemaFecha) AS creationMonth,
    DATENAME(MONTH, p.SistemaFecha) AS creationMonthName,
    ISNULL(CASE p.[codigo_tipo_servicio] WHEN '' THEN NULL ELSE p.[codigo_tipo_servicio] END, '0') AS serviceTypeCode,
    ISNULL(CASE pt.descripcion_tipo_servicio WHEN '' THEN NULL ELSE pt.descripcion_tipo_servicio END,
                  'No Especificado') AS serviceTypeDescription,
    CASE WHEN Isnull(CASE p.[codigo_tipo_servicio] WHEN '' THEN NULL ELSE p.[codigo_tipo_servicio] END, '0') = 2 OR
                  Isnull(CASE p.[codigo_tipo_servicio] WHEN '' THEN NULL ELSE p.[codigo_tipo_servicio] END, '0')
                  = 0 THEN 'Con Firma Digital' ELSE CASE WHEN Codigo_Tipo_Firma = 0 THEN 'Valido Solo con firma Fisica' ELSE 'Con Firma Digital' END END AS signatureType,
    CASE WHEN Isnull(CASE p.[codigo_tipo_servicio] WHEN '' THEN NULL
                  ELSE p.[codigo_tipo_servicio] END, '0') = 2 OR
                  Isnull(CASE p.[codigo_tipo_servicio] WHEN '' THEN NULL ELSE p.[codigo_tipo_servicio] END, '0')
                  = 0 THEN 'No Aplica' ELSE CASE WHEN codigo_tipo_firma = 0 THEN 'TRANSPORTE DE MIGRANTES' ELSE 'BUS INTERNACIONAL CON DESTINO/SALIDA HONDURAS' END END AS petiType,
    ISNULL(CASE avc.[CodigoAvisoCobro] WHEN '' THEN NULL ELSE avc.CodigoAvisoCobro END, '0') AS noticeCode,
    acd.Monto AS amount,
    origenCreacion.OrigenCreacion AS creationOrigin
  FROM
    IHTT_Portales.dbo.TB_Permiso AS p INNER JOIN
    IHTT_Portales.dbo.TB_Permiso_Estado AS pes ON pes.Permiso_Estado_Codigo = p.Permiso_Estado_Codigo LEFT OUTER JOIN
    IHTT_Portales.dbo.TB_Permiso_Tipo_Servicio AS pt ON pt.Codigo_Tipo_Servicio = p.Codigo_Tipo_Servicio LEFT OUTER JOIN
    IHTT_Portales.dbo.v_DatosCenso AS c ON c.CodigoCenso = p.CodigoCenso LEFT OUTER JOIN
    IHTT_SGCERP.dbo.v_solicitud_x_certificado AS certificadoPubli ON certificadoPubli.N_Certificado = p.CodigoCenso LEFT OUTER JOIN
    IHTT_Portales.dbo.TB_PermisoRegistroUnidadSinCenso AS unidad ON CONVERT(varchar, unidad.CodigoPermisoTransporteEspecial) = p.CodigoCenso LEFT OUTER JOIN
    IHTT_SGCERP.dbo.v_Permiso_Especial_Pasajero AS especial ON especial.N_Permiso_Especial_Pas = p.CodigoCenso LEFT OUTER JOIN
    IHTT_Portales.dbo.v_Empleados AS emp ON emp.Usuario_Nombre = p.SistemaUsuario LEFT OUTER JOIN
    IHTT_Webservice.dbo.TB_AvisoCobroEnc AS avc ON avc.ID_Solicitud = p.PermisoCodigo LEFT OUTER JOIN
    IHTT_Webservice.dbo.TB_AvisoCobroDET AS acd ON acd.CodigoAvisoCobro = avc.CodigoAvisoCobro INNER JOIN
    IHTT_Portales.dbo.TB_PermisoOrigenCreacion AS origenCreacion ON origenCreacion.CodigoOrigenCreacion = p.CodigoOrigenCreacion
  WHERE  (p.Permiso_Estado_Codigo IN (1, 2, 3))
  ORDER BY p.SistemaFecha
`;

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

export async function exportEventualPermits(): Promise<JobResult> {
  return new Promise(async (resolve) => {
    try {
      const pool = await mssql.connect(sqlConfig);
      const result = await pool.request().query(QUERY);
      console.log(`Registros obtenidos: ${result.recordset.length}`);

      const recordsObtained = result.recordset.length;

      if (recordsObtained === 0) {
        resolve({
          tableName: 'Permisos Eventuales',
          recordsObtained: 0,
          recordsImported: 0,
          success: true
        });
        return;
      }

      const cleanedRecords = result.recordset.map(record => {
        if (record.amount === '' || record.amount === null || record.amount === undefined) {
          record.amount = 0;
        }
        return record;
      });

      const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, 'eventual_permits.csv'),
        header: Object.keys(result.recordset[0]).map((key) => ({ id: key, title: key })),
        alwaysQuote: true,
        headerIdDelimiter: '.'
      });

      await csvWriter.writeRecords(cleanedRecords);
      console.log('CSV generado como eventual_permits.csv');
      const sqlitePath = path.resolve(__dirname, '../stats.sqlite');
      const csvPath = path.resolve(__dirname, 'eventual_permits.csv');
      const sqlCommand = `
        DROP TABLE IF EXISTS eventual_permits;
        CREATE TABLE eventual_permits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          permitCode TEXT, permitTypeCode TEXT, driverCode TEXT, permitStatusCode TEXT,
          permitStatus TEXT, censusCode TEXT, rtn TEXT, applicantName TEXT, plate TEXT,
          validationCode TEXT, systemUser TEXT, employeeName TEXT, regionalOffice TEXT,
          systemDate TEXT, creationYear INTEGER, creationMonth INTEGER, creationMonthName TEXT,
          serviceTypeCode TEXT, serviceTypeDescription TEXT, signatureType TEXT,
          petiType TEXT, noticeCode TEXT, amount REAL, creationOrigin TEXT
        );
      `;

      const sqlCommand2 = `
        DROP TABLE IF EXISTS eventual_permits_raw;
        CREATE TABLE eventual_permits_raw (
          permitCode TEXT, permitTypeCode TEXT, driverCode TEXT, permitStatusCode TEXT,
          permitStatus TEXT, censusCode TEXT, rtn TEXT, applicantName TEXT, plate TEXT,
          validationCode TEXT, systemUser TEXT, employeeName TEXT, regionalOffice TEXT,
          systemDate TEXT, creationYear INTEGER, creationMonth INTEGER, creationMonthName TEXT,
          serviceTypeCode TEXT, serviceTypeDescription TEXT, signatureType TEXT,
          petiType TEXT, noticeCode TEXT, amount REAL, creationOrigin TEXT
        );
      `;

      // Ejecutar creación de tabla en SQLite
      exec(`sqlite3 ${sqlitePath} "${sqlCommand2}"`, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
          console.error(`Error creando tabla: ${err.message}`);
          resolve({
            tableName: 'Permisos Eventuales',
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
        sqliteProcess.stdin.write(`.import --skip 1 ${csvPath} eventual_permits_raw\n`);
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
                console.error(`Error creando eventual_permits: ${err.message}`);
                resolve({
                  tableName: 'Permisos Eventuales',
                  recordsObtained,
                  recordsImported: 0,
                  success: false,
                  error: err.message
                });
                return;
              }

              // Migrar datos de eventual_permits_raw a eventual_permits
              exec(`sqlite3 ${sqlitePath} "INSERT INTO eventual_permits SELECT NULL, * FROM eventual_permits_raw;"`, (err) => {
                if (err) {
                  console.error(`Error migrando a eventual_permits: ${err.message}`);
                  resolve({
                    tableName: 'Permisos Eventuales',
                    recordsObtained,
                    recordsImported: 0,
                    success: false,
                    error: err.message
                  });
                } else {
                  console.log('Migración a eventual_permits completada.');
                  resolve({
                    tableName: 'Permisos Eventuales',
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
              tableName: 'Permisos Eventuales',
              recordsObtained,
              recordsImported: 0,
              success: false,
              error: `sqlite3 process exited with code ${code}`
            });
          }
        });
      });
    } catch (error: any) {
      console.error('Error in exportEventualPermits:', error);
      resolve({
        tableName: 'Permisos Eventuales',
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
  exportEventualPermits().catch(err => console.error(err));
}
