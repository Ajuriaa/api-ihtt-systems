import * as mssql from 'mssql';
import { createObjectCsvWriter } from 'csv-writer';
import { exec, spawn} from 'child_process';
import path from 'path';

let pool: mssql.ConnectionPool;

// MSSQL config
const sqlConfig: mssql.config = {
  user: 'jajuria',
  password: 'Ihtt2024**',
  server: '110.238.83.176',
  port: 1433,
  database: 'IHTT_ARCHIVO_ENTREGA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function createTempTables(): Promise<void> {
  try {
    await deleteTempTables();

    // Create tempExpedientes
    await pool.request().query(`
      SELECT
        ex.ID_Solicitud,
        ex.id_expediente,
        ex.es_renovacion_automatica,
        ex.preforma,
        rq.Requisito as requisito_GDL
      INTO IHTT_ARCHIVO_ENTREGA.dbo.tempExpedientes
      FROM [IHTT_DB].dbo.tb_expedientes AS ex
      LEFT JOIN [IHTT_GDL].dbo.TB_RequerimientosExpediente AS rq
        ON ex.ID_Solicitud = rq.ID_Solicitud
    `);

    // Create tempAvisosCobro
    await pool.request().query(`
      SELECT
        ac.expediente,
        ac.codigoavisocobro,
        ea.desc_estadoaviso,
        ac.FechaPagadoAnulado as Fecha_Pagado_Anulado,
        AC.Requeridos AS Requisito_AVISO,
        (SELECT SUM(TB_AvisoCobroDET.Monto) AS total
        FROM [IHTT_Webservice].dbo.TB_AvisoCobroEnc
        INNER JOIN [IHTT_Webservice].dbo.TB_AvisoCobroDET
        ON TB_AvisoCobroEnc.CodigoAvisoCobro= TB_AvisoCobroDET.CodigoAvisoCobro
        WHERE TB_AvisoCobroEnc.CodigoAvisoCobro = ac.codigoavisocobro) AS Total_Aviso
      INTO IHTT_ARCHIVO_ENTREGA.dbo.tempAvisosCobro
      FROM [IHTT_Webservice].dbo.tb_avisocobroenc AS ac
      LEFT JOIN [IHTT_Webservice].dbo.tb_estadoaviso AS ea
        ON ea.id_estadoaviso = ac.avisocobroestado
      WHERE ac.expediente IN (SELECT id_expediente FROM IHTT_ARCHIVO_ENTREGA.dbo.tempExpedientes)
    `);

    // Create tempCertificados
    await pool.request().query(`
      SELECT
        lg.n_certificado,
        lg.n_permiso_explotacion,
        lg.Modalidad,
        lg.TIPO_DOCUMENTO,
        lg.Departamento,
        CONVERT(DATETIME, lg.[fecha vencimiento certificado], 101) AS [Fecha_Vencimiento_Certificado],
        CONVERT(DATETIME, lg.[fecha vencimiento permiso], 101) AS [Fecha_Vencimiento_Permiso]
      INTO IHTT_ARCHIVO_ENTREGA.dbo.tempCertificados
      FROM ihtt_sgcerp.[dbo].[v_listado_general] AS lg
      WHERE lg.N_Certificado IN
        (SELECT n_certificado
        FROM IHTT_ARCHIVO_ENTREGA.dbo.tb_ubicacion_documentos_scd
        WHERE expediente IN (SELECT id_expediente FROM IHTT_ARCHIVO_ENTREGA.dbo.tempExpedientes))
    `);

    console.log('Temporary tables created successfully.');
  } catch (error) {
    console.error('Error creating temp tables:', error);
    throw error;
  }
}

async function deleteTempTables(): Promise<void> {
  try {
    await pool.request().query(`
      DROP TABLE IF EXISTS IHTT_ARCHIVO_ENTREGA.dbo.tempExpedientes;
      DROP TABLE IF EXISTS IHTT_ARCHIVO_ENTREGA.dbo.tempAvisosCobro;
      DROP TABLE IF EXISTS IHTT_ARCHIVO_ENTREGA.dbo.tempCertificados;
    `);
    console.log('Temporary tables dropped.');
  } catch (error) {
    console.error('Error dropping temp tables:', error);
  }
}

const QUERY = `
  SELECT
    a.nombre_area AS areaName,
    COALESCE(d.estado_documento, '') AS documentStatus,
    COALESCE(co.Estado, '') AS coStatus,
    COALESCE(co.fecha_entrega, '') AS deliveryDate,
    COALESCE(e.num_estante, '') AS shelfNumber,
    COALESCE(f.num_fila, '') AS rowNumber,
    COALESCE(an.num_anillo, '') AS ringNumber,
    COALESCE(d.n_certificado, '') AS certificateNumber,
    COALESCE(vp.id_placa, '') AS plateId,
    COALESCE(ct.n_permiso_explotacion, 'N/A') AS exploitationPermissionNumber,
    COALESCE(ct.Modalidad, '') AS modality,
    COALESCE(ct.TIPO_DOCUMENTO, '') AS documentType,
    COALESCE(ct.Departamento, '') AS department,
    COALESCE(et.ID_Solicitud, '') AS requestId,
    COALESCE(et.id_expediente, '') AS fileId,
    COALESCE(et.es_renovacion_automatica, 0) AS isAutomaticRenewal,
    CASE
        WHEN ( et.preforma LIKE 'FTT%' ) THEN 'VENTANILLA UNICA'
        WHEN ( et.preforma LIKE 'FSL%' ) AND et.es_renovacion_automatica = 0 THEN 'VENTANILLA EN LINEA'
        WHEN et.preforma LIKE 'FSL%' AND et.es_renovacion_automatica = 1 THEN 'RENOVACION AUTOMATICA'
        WHEN ( et.preforma IS NULL ) THEN 'NO DEFINIDO'
        ELSE 'VENTANILLA'
    END AS preform,
    COALESCE(d.rtn_concesionario, '') AS concessionaireRtn,
    COALESCE(d.nombre_concesionario, '') AS concessionaireName,
    COALESCE(tbs.telefono, '') AS concessionairePhone,
    COALESCE(tbs.email, '') AS concessionaireEmail,
    COALESCE(apo.nombre_apoderado_legal, '') AS legalRepresentativeName,
    COALESCE(apo.email, '') AS legalRepresentativeEmail,
    COALESCE(apo.telefono, '') AS legalRepresentativePhone,
    COALESCE(COALESCE(act.Requisito_AVISO, et.requisito_GDL), 'Sin Requerimientos') AS unifiedRequirement,
    COALESCE(act.codigoavisocobro, 0) AS noticeCode,
    COALESCE(act.desc_estadoaviso, 'NO TIENE') AS noticeStatusDescription,
    COALESCE(act.Total_Aviso, 0) AS totalNoticeAmount,
    act.Fecha_Pagado_Anulado AS paymentDate,
    COALESCE(d.sistema_usuario, '') AS systemUser,
    COALESCE(d.sistema_fecha, '') AS inventoryDate,
    COALESCE(ct.[Fecha_Vencimiento_Certificado], '') AS certificateExpirationDate,
    COALESCE(ct.[Fecha_Vencimiento_Permiso], '') AS permissionExpirationDate
  FROM IHTT_ARCHIVO_ENTREGA.dbo.tb_ubicacion_documentos_scd AS d
  INNER JOIN IHTT_ARCHIVO_ENTREGA.dbo.tb_areas_scd AS a ON a.cod_area = d.cod_area
  INNER JOIN IHTT_ARCHIVO_ENTREGA.dbo.tb_estantes_scd AS e ON e.cod_estante = d.cod_estante
  INNER JOIN IHTT_ARCHIVO_ENTREGA.dbo.tb_fila_scd AS f ON f.cod_fila = d.cod_fila
  INNER JOIN IHTT_ARCHIVO_ENTREGA.dbo.tb_anillos_scd AS an ON an.cod_anillo = d.cod_anillo
  LEFT JOIN ihtt_sgcerp.dbo.v_estados_documentos AS co ON d.n_certificado = co.n_certificado
  LEFT JOIN ihtt_sgcerp.dbo.v_validacion_placas_scd AS vp ON vp.n_certificado = d.n_certificado
  LEFT JOIN IHTT_ARCHIVO_ENTREGA.dbo.tempCertificados AS ct ON d.n_certificado = ct.n_certificado
  LEFT JOIN [IHTT_DB].dbo.tb_solicitante AS tbs ON tbs.id_solicitante = d.rtn_concesionario
  INNER JOIN IHTT_ARCHIVO_ENTREGA.dbo.tempExpedientes AS et ON d.expediente = et.id_expediente
  LEFT JOIN [IHTT_DB].dbo.tb_expediente_x_apoderado AS epa ON epa.id_solicitud = et.ID_Solicitud
  LEFT JOIN [IHTT_DB].dbo.tb_apoderado_legal AS apo ON apo.id_colegiacionapl = epa.id_colegiacionapl
  LEFT JOIN IHTT_ARCHIVO_ENTREGA.dbo.tempAvisosCobro AS act ON d.expediente = act.expediente
`;

interface JobResult {
  tableName: string;
  recordsObtained: number;
  recordsImported: number;
  success: boolean;
  error?: string;
}

export async function exportCertificates(): Promise<JobResult> {
  return new Promise(async (resolve) => {
    try {
      pool = await mssql.connect(sqlConfig);

      // Create temporary tables first
      await createTempTables();
      // Execute main query
      const result = await pool.request().query(QUERY);
      console.log(`Registros obtenidos: ${result.recordset.length}`);

      const recordsObtained = result.recordset.length;

      if (recordsObtained === 0) {
        console.log('No records found, skipping CSV generation.');
        await deleteTempTables();
        resolve({
          tableName: 'Certificados',
          recordsObtained: 0,
          recordsImported: 0,
          success: true
        });
        return;
      }

      const csvWriter = createObjectCsvWriter({
        path: path.resolve(__dirname, 'certificates.csv'),
        header: Object.keys(result.recordset[0]).map((key) => ({ id: key, title: key })),
        alwaysQuote: true,
        headerIdDelimiter: '.'
      });

      await csvWriter.writeRecords(result.recordset);
      console.log('CSV generado como certificates.csv');
      const sqlitePath = path.resolve(__dirname, '../stats.sqlite');
      const csvPath = path.resolve(__dirname, 'certificates.csv');
      const sqlCommand = `
        DROP TABLE IF EXISTS certificates;
        CREATE TABLE certificates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          areaName TEXT, documentStatus TEXT, coStatus TEXT, deliveryDate TEXT,
          shelfNumber TEXT, rowNumber TEXT, ringNumber TEXT, certificateNumber TEXT,
          plateId TEXT, exploitationPermissionNumber TEXT, modality TEXT,
          documentType TEXT, department TEXT, requestId TEXT, fileId TEXT,
          isAutomaticRenewal INTEGER, preform TEXT, concessionaireRtn TEXT,
          concessionaireName TEXT, concessionairePhone TEXT, concessionaireEmail TEXT,
          legalRepresentativeName TEXT, legalRepresentativeEmail TEXT,
          legalRepresentativePhone TEXT, unifiedRequirement TEXT, noticeCode INTEGER,
          noticeStatusDescription TEXT, totalNoticeAmount REAL, paymentDate TEXT,
          systemUser TEXT, inventoryDate TEXT, certificateExpirationDate TEXT,
          permissionExpirationDate TEXT
        );
      `;

      const sqlCommand2 = `
        DROP TABLE IF EXISTS certificates_raw;
        CREATE TABLE certificates_raw (
          areaName TEXT, documentStatus TEXT, coStatus TEXT, deliveryDate TEXT,
          shelfNumber TEXT, rowNumber TEXT, ringNumber TEXT, certificateNumber TEXT,
          plateId TEXT, exploitationPermissionNumber TEXT, modality TEXT,
          documentType TEXT, department TEXT, requestId TEXT, fileId TEXT,
          isAutomaticRenewal INTEGER, preform TEXT, concessionaireRtn TEXT,
          concessionaireName TEXT, concessionairePhone TEXT, concessionaireEmail TEXT,
          legalRepresentativeName TEXT, legalRepresentativeEmail TEXT,
          legalRepresentativePhone TEXT, unifiedRequirement TEXT, noticeCode INTEGER,
          noticeStatusDescription TEXT, totalNoticeAmount REAL, paymentDate TEXT,
          systemUser TEXT, inventoryDate TEXT, certificateExpirationDate TEXT,
          permissionExpirationDate TEXT
        );
      `;

      // Ejecutar creación de tabla en SQLite
      exec(`sqlite3 ${sqlitePath} "${sqlCommand2}"`, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
        if (err) {
          console.error(`Error creando tabla: ${err.message}`);
          deleteTempTables();
          resolve({
            tableName: 'Certificados',
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
        sqliteProcess.stdin.write(`.import --skip 1 ${csvPath} certificates_raw\n`);
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
                console.error(`Error creando certificates: ${err.message}`);
                deleteTempTables();
                resolve({
                  tableName: 'Certificados',
                  recordsObtained,
                  recordsImported: 0,
                  success: false,
                  error: err.message
                });
                return;
              }

              // Migrar datos de certificates_raw a certificates
              exec(`sqlite3 ${sqlitePath} "INSERT INTO certificates SELECT NULL, * FROM certificates_raw;"`, async (err) => {
                if (err) {
                  console.error(`Error migrando a certificates: ${err.message}`);
                  await deleteTempTables();
                  resolve({
                    tableName: 'Certificados',
                    recordsObtained,
                    recordsImported: 0,
                    success: false,
                    error: err.message
                  });
                } else {
                  console.log('Migración a certificates completada.');
                  await deleteTempTables();
                  resolve({
                    tableName: 'Certificados',
                    recordsObtained,
                    recordsImported: recordsObtained,
                    success: true
                  });
                }
              });
            });
          } else {
            console.error(`sqlite3 process exited with code ${code}`);
            await deleteTempTables();
            resolve({
              tableName: 'Certificados',
              recordsObtained,
              recordsImported: 0,
              success: false,
              error: `sqlite3 process exited with code ${code}`
            });
          }
        });
      });
    } catch (error: any) {
      console.error('Error in exportCertificates:', error);
      await deleteTempTables();
      resolve({
        tableName: 'Certificados',
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
  exportCertificates().catch(err => console.error(err));
}
