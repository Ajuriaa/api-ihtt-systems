import { PrismaClient } from '../../prisma/client/supply';
import { DepartmentReport, DepartmentReportQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function generateReport(type: string, startDate: string, endDate: string): Promise<any> {
  switch (type) {
    case 'departments':
      return await getDepartmentsReport(startDate, endDate);
  }
}

async function getDepartmentsReport(startDate: string, endDate: string): Promise<DepartmentReportQuery> {
  try {
    const query: { department: string, totalRequisitions: number, totalCost: number }[] = await prisma.$queryRaw`
      SELECT
        vle.Area AS department,
        COUNT(DISTINCT r.ID_Requisicion) AS totalRequisitions,
        SUM(o.Precio) AS totalCost
      FROM
        IHTT_RRHH.dbo.v_listado_empleados vle
      INNER JOIN
        TB_Requisiciones r ON r.ID_Empleado = vle.ID_Empleado
      INNER JOIN
        TB_Salidas o ON o.ID_Requisicion = r.ID_Requisicion
      WHERE
        r.ID_Estado = 4
      AND r.Sistema_Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        vle.Area;
    `;

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.totalCost as any), 0);

    const data = {
      info: query,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving departments report:', error);
    throw error;
  }
}
