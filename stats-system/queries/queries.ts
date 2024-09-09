import moment from 'moment';
import { PrismaClient } from '../../prisma/client/stats';
import { IChargesSummaryQuery, IEmissionsByExpirationAndAmountQuery, IExpedientByModalityAndProcedureQuery, IExpedientByProcedureAndCategoryQuery, IExpedientRenovationQuery, IFinesByDepartmentQuery, IFinesByInfractionDescriptionQuery, IFinesByInfractionQuery, IFinesByRegionalQuery, IFinesByTypeQuery, ISeizuresByDepartmentQuery } from './interfaces';

const prisma = new PrismaClient();

export async function getExpedientsByType() {
  const stats: IExpedientRenovationQuery[] = await prisma.$queryRaw`
    SELECT
      Codigo_Ciudad AS cityCode,
      COUNT(DISTINCT CASE WHEN Es_Renovacion_Automatica = 0 THEN ID_Expediente END) AS normalProcessExpedientCount,
      COUNT(DISTINCT CASE WHEN Es_Renovacion_Automatica = 1 THEN ID_Expediente END) AS automaticRenovationExpedientCount
    FROM
      [IHTT_DB].[dbo].[V_busq_solicitudes] a
    WHERE
      CAST(a.SitemaFecha AS DATE) < '2024-09-01'
      AND CAST(a.SitemaFecha AS DATE) > '2024-07-31'
    GROUP BY
      Codigo_Ciudad;
  `

  return stats;
}

export async function getExpedientsByProcedureAndCategory() {
  const stats: IExpedientByProcedureAndCategoryQuery[] = await prisma.$queryRaw`
    SELECT
      DESC_Tipo_Tramite AS procedureType,
      DESC_Categoria AS category,
      COUNT(ID_Expediente) AS expedientCount
    FROM
      [IHTT_DB].[dbo].[V_busq_solicitudes] a
    WHERE
      CAST(a.SitemaFecha AS DATE) < '2024-09-01'
      AND CAST(a.SitemaFecha AS DATE) > '2024-07-31'
    GROUP BY
      DESC_Tipo_Tramite, DESC_Categoria;
  `;

  return stats;
}

export async function getExpedientsByModalityAndProcedure() {
  const stats: IExpedientByModalityAndProcedureQuery[] = await prisma.$queryRaw`
    SELECT
      DESC_Tipo_Tramite AS procedureType,
      COALESCE(DESC_Modalidad, DESC_Categoria) AS modalityOrCategory,
      COUNT(ID_Expediente) AS expedientCount
    FROM
      [IHTT_DB].[dbo].[V_busq_solicitudes] a
    WHERE
      CAST(a.SitemaFecha AS DATE) < '2024-09-01'
      AND CAST(a.SitemaFecha AS DATE) > '2024-07-31'
    GROUP BY
      COALESCE(DESC_Modalidad, DESC_Categoria),
      DESC_Tipo_Tramite;
  `;

  return stats;
}

export async function getEmissionsByExpirationAndAmount(startDate: string, endDate: string) {
  const stats: IEmissionsByExpirationAndAmountQuery[] = await prisma.$queryRaw`
    SELECT
      YEAR([Fecha Vencimiento Certificado]) AS year,
      DATENAME(MONTH, [Fecha Vencimiento Certificado]) AS month,
      Modalidad AS modality,
      COUNT(*) AS expiredCertificateCount,
      COUNT(*) * 1000 AS amountToCollect
    FROM
      [IHTT_SGCERP].[dbo].[v_Listado_General] a
    WHERE
      Departamento IS NOT NULL
      AND [Estado Certificado] <> 'Denegado'
      AND [Fecha Vencimiento Certificado] > ${startDate}
      AND [Fecha Vencimiento Certificado] < ${endDate}
    GROUP BY
      YEAR([Fecha Vencimiento Certificado]),
      DATENAME(MONTH, [Fecha Vencimiento Certificado]),
      MONTH([Fecha Vencimiento Certificado]),
      Modalidad
    ORDER BY
      YEAR([Fecha Vencimiento Certificado]),
      MONTH([Fecha Vencimiento Certificado]),
      Modalidad;
  `;

  return stats;
}

export async function getFinesByRegional() {
  const stats: IFinesByRegionalQuery[] = await prisma.$queryRaw`
    SELECT
      fr.ID_Oficina AS officeId,
      fr.DESC_Oficina AS officeDescription,
      COUNT(o.ID_Oficina) AS totalRegional
    FROM IHTT_MULTAS.dbo.TB_Multas AS m
    INNER JOIN IHTT_MULTAS.dbo.TB_Estado_Multa AS e ON e.ID_Estado = m.ID_Estado
    INNER JOIN IHTT_MULTAS.dbo.TB_Operativo AS o ON o.Cod_Operativo = m.ID_Operativo
    INNER JOIN IHTT_MULTAS.dbo.TB_Oficina_Regional AS fr ON fr.ID_Oficina = o.ID_Oficina
    WHERE m.id_estado IN ('1', '2')
    GROUP BY fr.DESC_Oficina, fr.ID_Oficina
    ORDER BY fr.ID_Oficina;
  `;

  return stats;
}

export async function getFinesByInfraction() {
  const stats: IFinesByInfractionQuery[] = await prisma.$queryRaw`
    SELECT
      CASE WHEN r.id_infraccion IS NULL THEN '3' ELSE r.id_infraccion END AS infractionId,
      CASE
        WHEN i.desc_infraccion = 'Art.80 Muy Grave' THEN 'Muy Grave'
        WHEN i.desc_infraccion = 'Art.81 Grave' THEN 'Grave'
        WHEN i.desc_infraccion = 'Art.82 Leve' THEN 'Leve'
        WHEN i.desc_infraccion IS NULL THEN 'Leve Afines'
        ELSE i.desc_infraccion
      END AS infractionType,
      COUNT(m.id_multa) AS totalByInfraction
    FROM IHTT_MULTAS.dbo.TB_Infraccion AS i
    INNER JOIN IHTT_MULTAS.dbo.TB_Reinicidencias AS r ON i.ID_Infraccion = r.ID_Infraccion
    FULL OUTER JOIN IHTT_MULTAS.dbo.TB_Multas AS m ON r.ID_Multa = m.ID_Multa
    WHERE m.id_estado IN ('1', '2')
    GROUP BY i.DESC_Infraccion, r.ID_Infraccion
    ORDER BY r.ID_Infraccion DESC;
  `;

  return stats;
}

export async function getFinesByDepartment() {
  const stats: IFinesByDepartmentQuery[] = await prisma.$queryRaw`
    SELECT
      dep.DESC_Departamento AS departmentDescription,
      dep.ID_Departamento AS departmentId,
      COUNT(mun.ID_Municipio) AS totalByDepartment
    FROM IHTT_MULTAS.dbo.TB_Multas AS m
    INNER JOIN IHTT_MULTAS.dbo.TB_Estado_Multa AS e ON e.ID_Estado = m.ID_Estado
    INNER JOIN IHTT_MULTAS.dbo.TB_Operativo AS o ON o.Cod_Operativo = m.ID_Operativo
    INNER JOIN IHTT_MULTAS.dbo.TB_Municipios AS mun ON mun.ID_Municipio = o.ID_Municipio
    INNER JOIN IHTT_MULTAS.dbo.TB_Departamentos AS dep ON dep.ID_Departamento = mun.ID_Departamento
    WHERE m.id_estado IN ('1', '2')
    GROUP BY dep.DESC_Departamento, dep.ID_Departamento;
  `;

  return stats;
}

export async function getSeizuresByDepartment() {
  const stats: ISeizuresByDepartmentQuery[] = await prisma.$queryRaw`
    SELECT
      dep.DESC_Departamento AS departmentDescription,
      dep.ID_Departamento AS departmentId,
      COUNT(mun.ID_Municipio) AS totalByDepartment
    FROM IHTT_MULTAS.dbo.TB_Multas AS m
    INNER JOIN IHTT_MULTAS.dbo.TB_Operativo AS o ON o.Cod_Operativo = m.ID_Operativo
    INNER JOIN IHTT_MULTAS.dbo.TB_Municipios AS mun ON mun.ID_Municipio = o.ID_Municipio
    INNER JOIN IHTT_MULTAS.dbo.TB_Departamentos AS dep ON dep.ID_Departamento = mun.ID_Departamento
    INNER JOIN IHTT_MULTAS.dbo.TB_Decomiso AS De ON m.ID_Multa = De.ID_Multa
    WHERE De.Decomiso_Unidad = 1
    GROUP BY dep.DESC_Departamento, dep.ID_Departamento;
  `;

  return stats;
}

export async function getFinesByInfractionDescription() {
  const stats: IFinesByInfractionDescriptionQuery[] = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN ti.Infraccion_Abrev IS NULL THEN '7 -Afines a la Ley de Tránsito vigente'
        ELSE ti.Infraccion_Abrev
      END AS infractionAbbreviation,
      COUNT(m.ID_Multa) AS totalInfraction
    FROM IHTT_MULTAS.dbo.TB_Reinicidencias AS r
    INNER JOIN IHTT_MULTAS.dbo.TB_Infraccion_X_Tipo_Multa AS ti
      ON r.ID_Descripcion = ti.N_Infraccion
      AND r.ID_Infraccion = ti.ID_Tipo
    FULL OUTER JOIN IHTT_MULTAS.dbo.TB_Multas AS m
      ON r.ID_Multa = m.ID_Multa
    WHERE m.id_estado IN ('1', '2')
    GROUP BY ti.Infraccion_Abrev, ti.ID_Tipo
    ORDER BY ti.ID_Tipo DESC;
  `;

  return stats;
}

export async function getFinesByType() {
  const stats: IFinesByTypeQuery[] = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN D.Detalle IS NULL THEN 'Multas Varias'
        ELSE D.Detalle
      END AS detail,
      COUNT(m.ID_Multa) AS totalFines
    FROM IHTT_MULTAS.dbo.TB_Multas AS m
    INNER JOIN IHTT_MULTAS.dbo.TB_Operativo AS C
      ON m.ID_Operativo = C.Cod_Operativo
    LEFT OUTER JOIN IHTT_MULTAS.dbo.V_Multas_Tipo AS D
      ON m.ID_Multa = D.ID_Multa
    WHERE m.id_estado IN ('1', '2')
    GROUP BY D.Detalle
    ORDER BY totalFines DESC;
  `;

  return stats;
}

export async function getChargesSummary(startDate: string, endDate: string) {
  const stats: IChargesSummaryQuery[] = await prisma.$queryRaw`
    SELECT
      d.CodigoTipoTramite AS procedureTypeCode,
      d.DescripcionDetalle AS detailDescription,
      d.Monto AS amount,
      COUNT(*) AS count,
      SUM(d.Monto) AS totalAmount
    FROM
      IHTT_Webservice.dbo.TB_AvisoCobroEnc AS e
    INNER JOIN
      IHTT_Webservice.dbo.TB_AvisoCobroDET AS d ON e.CodigoAvisoCobro = d.CodigoAvisoCobro
    INNER JOIN
      IHTT_Webservice.dbo.TB_Tarifas AS t ON d.CodigoTipoTramite = t.CodigoTramite
    WHERE
      CAST(e.FechaPagadoAnulado AS DATE) BETWEEN ${startDate} AND ${endDate}
      AND e.AvisoCobroEstado = 2
      AND e.ID_TipoCobro IN (1, 3)
      AND t.ID_EstadoTarifa = 1
    GROUP BY
      d.CodigoTipoTramite,
      d.DescripcionDetalle,
      d.Monto
    ORDER BY
      d.CodigoTipoTramite,
      d.DescripcionDetalle,
      d.Monto;
  `;

  return stats;
}
