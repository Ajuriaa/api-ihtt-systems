import cron from 'node-cron';
import nodemailer from 'nodemailer';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import { PrismaClient } from '../prisma/client/stats';

const prisma = new PrismaClient();

// Mailer setup
const transporter = nodemailer.createTransport({
  host: "122.8.183.193",
  port: 465,
  secure: true,
  tls: {
    rejectUnauthorized: false
  },
  auth: {
    user: '',
    pass: ''
  }
});

// Utility function to send mail
async function sendMail(subject: string, text: string): Promise<void> {
  const mailOptions = {
    from: `"Temp Tables Notifier" <vehiculos.ihtt@transporte.gob.hn>`,
    to: "aajuria@transporte.gob.hn",
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${formatDateForLog()} --- Email sent: ${subject}`);
  } catch (error) {
    console.error(`Error sending email: ${error}`);
  }
}

// Functions to save stats to SQLite
async function saveFinesToSQLite(data: any[]): Promise<void> {
  const dbPath = './stats.sqlite';
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop the fines table if it exists
      db.run(`DROP TABLE IF EXISTS fines`, (err) => {
        if (err) {
          console.error("Error dropping fines table:", err);
          reject(err);
          return;
        }
        console.log("Dropped existing fines table.");
      });

      // Create the fines table
      db.run(`
        CREATE TABLE fines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fineId TEXT NULL,
          operationId TEXT NULL,
          fineStatus TEXT NULL,
          origin TEXT NULL,
          plate TEXT NULL,
          startDate TEXT NULL,
          companyName TEXT NULL,
          dniRtn TEXT NULL,
          phone TEXT NULL,
          email TEXT NULL,
          certificate TEXT NULL,
          region TEXT NULL,
          systemDate TEXT NULL,
          noticeCode INTEGER NULL,
          totalAmount REAL NULL,
          department TEXT NULL,
          municipality TEXT NULL,
          place TEXT NULL
        )
      `, (err) => {
        if (err) {
          console.error("Error creating fines table:", err);
          reject(err);
          return;
        }
        console.log("Created fines table.");
      });

      // Insert new data
      const stmt = db.prepare(`
        INSERT INTO fines (
          fineId, operationId, fineStatus, origin, plate, startDate, companyName,
          dniRtn, phone, email, certificate, region, systemDate, noticeCode,
          totalAmount, department, municipality, place
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      data.forEach((row) => {
        stmt.run([
          row.fineId,
          row.operationId,
          row.fineStatus,
          row.origin,
          row.plate,
          new Date(row.startDate).toISOString(),
          row.companyName,
          row.dniRtn,
          row.phone,
          row.email,
          row.certificate,
          row.region,
          new Date(row.systemDate).toISOString(),
          row.noticeCode,
          parseFloat(row.totalAmount),
          row.department,
          row.municipality,
          row.place,
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          console.log("Fines successfully saved to SQLite.");
          resolve();
        }
      });
    });
  });
}

// Function to retrieve fines and save them to SQLite
async function getFinesAndSave(): Promise<void> {
  try {
    const data: any[] = await prisma.$queryRaw`
      SELECT
        MU.ID_Multa AS fineId,
        MU.ID_Operativo AS operationId,
        EM.DESC_Estado AS fineStatus,
        MU.Origen AS origin,
        RE.Placa AS plate,
        OP.Fecha_Inicio AS startDate,
        CO.Nombre_Completo AS companyName,
        CO.ID_Conductor AS dniRtn,
        SOL.Telefono AS phone,
        SOL.Email AS email,
        RE.Certificado AS certificate,
        CU.DESC_Ciudad AS region,
        MU.Sistema_Fecha AS systemDate,
        AV.codigoAvisoCobro AS noticeCode,
        AD.Monto AS totalAmount,
        D.DESC_Departamento AS department,
        M.DESC_Municipio AS municipality,
        OP.Lugar AS place
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

    await saveFinesToSQLite(data);
    await sendMail("Fines Saved", "Fines have been successfully retrieved and saved to SQLite.");
  } catch (error: any) {
    console.error("Error retrieving fines:", error);
    await sendMail("Fines Retrieval Failed", `Error: ${error}`);
  }
}

async function saveStatsToSQLite(data: any[]): Promise<void> {
  const dbPath = './stats.sqlite';
  const db = new sqlite3.Database(dbPath);
  console.log(`${formatDateForLog()} ---Saving stats to SQLite...`);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop the stats table if it exists
      db.run(`DROP TABLE IF EXISTS certificates`, (err) => {
        if (err) {
          console.error("Error dropping table:", err);
          reject(err);
          return;
        }
        console.log(`${formatDateForLog()} ---Dropped existing certificates table.`);
      });

      // Create the stats table
      db.run(`
        CREATE TABLE certificates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          areaName TEXT NULL,
          documentStatus TEXT NULL,
          coStatus TEXT NULL,
          deliveryDate TEXT NULL,
          shelfNumber TEXT NULL,
          rowNumber TEXT NULL,
          ringNumber TEXT NULL,
          certificateNumber TEXT NULL,
          plateId TEXT NULL,
          exploitationPermissionNumber TEXT NULL,
          modality TEXT NULL,
          documentType TEXT NULL,
          department TEXT NULL,
          requestId TEXT NULL,
          fileId TEXT NULL,
          isAutomaticRenewal INTEGER NULL,
          preform TEXT NULL,
          concessionaireRtn TEXT NULL,
          concessionaireName TEXT NULL,
          concessionairePhone TEXT NULL,
          concessionaireEmail TEXT NULL,
          legalRepresentativeName TEXT NULL,
          legalRepresentativeEmail TEXT NULL,
          legalRepresentativePhone TEXT NULL,
          unifiedRequirement TEXT NULL,
          noticeCode INTEGER NULL,
          noticeStatusDescription TEXT NULL,
          totalNoticeAmount REAL NULL,
          systemUser TEXT NULL,
          inventoryDate TEXT NULL,
          certificateExpirationDate TEXT NULL,
          paymentDate TEXT NULL,
          permissionExpirationDate TEXT NULL
        )
      `, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
          return;
        }
        console.log(`${formatDateForLog()} ---Created stats table.`);
      });

      // Insert new data
      const stmt = db.prepare(`
        INSERT INTO certificates (
          areaName, documentStatus, coStatus, deliveryDate, shelfNumber,
          rowNumber, ringNumber, certificateNumber, plateId, exploitationPermissionNumber,
          modality, documentType, department, requestId, fileId, isAutomaticRenewal,
          preform, concessionaireRtn, concessionaireName, concessionairePhone,
          concessionaireEmail, legalRepresentativeName, legalRepresentativeEmail,
          legalRepresentativePhone, unifiedRequirement, noticeCode,
          noticeStatusDescription, totalNoticeAmount, systemUser, inventoryDate,
          certificateExpirationDate, paymentDate, permissionExpirationDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      data.forEach((row) => {
        stmt.run([
          row.areaName,
          row.documentStatus,
          row.coStatus,
          new Date(row.deliveryDate).toISOString(),
          row.shelfNumber,
          row.rowNumber,
          row.ringNumber,
          row.certificateNumber,
          row.plateId,
          row.exploitationPermissionNumber,
          row.modality,
          row.documentType,
          row.department,
          row.requestId,
          row.fileId,
          row.isAutomaticRenewal,
          row.preform,
          row.concessionaireRtn,
          row.concessionaireName,
          row.concessionairePhone,
          row.concessionaireEmail,
          row.legalRepresentativeName,
          row.legalRepresentativeEmail,
          row.legalRepresentativePhone,
          row.unifiedRequirement,
          row.noticeCode,
          row.noticeStatusDescription,
          parseFloat(row.totalNoticeAmount),
          row.systemUser,
          new Date(row.inventoryDate).toISOString(),
          new Date(row.certificateExpirationDate).toISOString(),
          row.paymentDate ? new Date(row.paymentDate).toISOString() : row.paymentDate,
          new Date(row.permissionExpirationDate).toISOString()
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`${formatDateForLog()} ---Stats successfully saved to SQLite.`);
          resolve();
        }
      });
    });
  });
}

// Function to retrieve and save stats
export async function getStatsAndSave(): Promise<void> {
  try {
    const data: any[] = await prisma.$queryRaw`
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
      FROM tb_ubicacion_documentos_scd AS d
      INNER JOIN tb_areas_scd AS a ON a.cod_area = d.cod_area
      INNER JOIN tb_estantes_scd AS e ON e.cod_estante = d.cod_estante
      INNER JOIN tb_fila_scd AS f ON f.cod_fila = d.cod_fila
      INNER JOIN tb_anillos_scd AS an ON an.cod_anillo = d.cod_anillo
      LEFT JOIN ihtt_sgcerp.dbo.v_estados_documentos AS co ON d.n_certificado = co.n_certificado
      LEFT JOIN ihtt_sgcerp.dbo.v_validacion_placas_scd AS vp ON vp.n_certificado = d.n_certificado
      LEFT JOIN tempCertificados AS ct ON d.n_certificado = ct.n_certificado
      LEFT JOIN [IHTT_DB].dbo.tb_solicitante AS tbs ON tbs.id_solicitante = d.rtn_concesionario
      INNER JOIN tempExpedientes AS et ON d.expediente = et.id_expediente
      LEFT JOIN [IHTT_DB].dbo.tb_expediente_x_apoderado AS epa ON epa.id_solicitud = et.ID_Solicitud
      LEFT JOIN [IHTT_DB].dbo.tb_apoderado_legal AS apo ON apo.id_colegiacionapl = epa.id_colegiacionapl
      LEFT JOIN tempAvisosCobro AS act ON d.expediente = act.expediente;
    `;

    await saveStatsToSQLite(data);
    await sendMail("Stats Saved", "Stats have been successfully retrieved and saved to SQLite.");

    await deleteTempTables();
  } catch (error: any) {
    console.error("Error retrieving stats:", error);
    await sendMail("Stats Retrieval Failed", `Error: ${error}`);
  }
}

// Add getStatsAndSave after temp table creation
export async function createTempTables(): Promise<void> {
  try {
    await deleteTempTables(false);
    // Create temp tables
    await prisma.$queryRaw`
      SELECT
        ex.ID_Solicitud,
        ex.id_expediente,
        ex.es_renovacion_automatica,
        ex.preforma,
        rq.Requisito as requisito_GDL
      INTO tempExpedientes
      FROM [IHTT_DB].dbo.tb_expedientes AS ex
      LEFT JOIN [IHTT_GDL].dbo.TB_RequerimientosExpediente AS rq
        ON ex.ID_Solicitud = rq.ID_Solicitud;
    `;

    await prisma.$queryRaw`
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
      INTO tempAvisosCobro
      FROM [IHTT_Webservice].dbo.tb_avisocobroenc AS ac
      LEFT JOIN [IHTT_Webservice].dbo.tb_estadoaviso AS ea
        ON ea.id_estadoaviso = ac.avisocobroestado
      WHERE ac.expediente IN (SELECT id_expediente FROM tempExpedientes);
    `;

    await prisma.$queryRaw`
      SELECT
        lg.n_certificado,
        lg.n_permiso_explotacion,
        lg.Modalidad,
        lg.TIPO_DOCUMENTO,
        lg.Departamento,
        CONVERT(DATETIME, lg.[fecha vencimiento certificado], 101) AS [Fecha_Vencimiento_Certificado],
        CONVERT(DATETIME, lg.[fecha vencimiento permiso], 101) AS [Fecha_Vencimiento_Permiso]
      INTO tempCertificados
      FROM ihtt_sgcerp.[dbo].[v_listado_general] AS lg
      WHERE lg.N_Certificado IN
        (SELECT n_certificado
        FROM tb_ubicacion_documentos_scd
        WHERE expediente IN (SELECT id_expediente FROM tempExpedientes));
    `;

    await sendMail("Temp Tables Created", "Temporary tables have been successfully created.");

    // Retrieve and save stats
    await getStatsAndSave();
    await getFinesAndSave();
  } catch (error) {
    console.error("Error creating temp tables:", error);
    await sendMail("Temp Tables Creation Failed", `Error: ${error}`);
  }
}

export async function deleteTempTables(notify = true): Promise<void> {
  await prisma.$queryRaw`
    DROP TABLE IF EXISTS tempExpedientes;
    DROP TABLE IF EXISTS tempAvisosCobro;
    DROP TABLE IF EXISTS tempCertificados;
  `;
  notify ? await sendMail("Temp Tables Removed", "Temporary tables have been successfully removed.") : '';
}

function formatDateForLog(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Main function wrapping everything
async function main() {
  try {
    console.log("Starting script...");
    await createTempTables();
    console.log("Script completed successfully!");
  } catch (error) {
    console.error("Error in script execution:", error);
    await sendMail("Script Failed", `Error: ${error}`);
    process.exit(1); // Exit with error
  } finally {
    // Disconnect Prisma to release resources
    await prisma.$disconnect();
    console.log("Prisma disconnected. Exiting...");
    process.exit(0); // Exit successfully
  }
}

// Call the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1); // Exit with error
});