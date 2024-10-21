import moment from 'moment';
import { PrismaClient } from '../../prisma/client/supply';
import { IYearlyStatsQuery, IYearlyStats, IDashboardQuery, IDashboard } from '../interfaces';

const prisma = new PrismaClient();

export async function getYearlyStats(): Promise<IYearlyStatsQuery> {
  try {
    const currentYear = moment().year();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const query = await prisma.$queryRaw<{ month: number, revenue: number }[]>`
      SELECT
        MONTH(Fecha) AS month,
        COALESCE(SUM(Precio), 0) AS revenue
      FROM
        TB_Salidas
      WHERE
        YEAR(Fecha) = ${currentYear}
      GROUP BY
        MONTH(Fecha)
      ORDER BY
        MONTH(Fecha)
    `;

    const data: IYearlyStats[] = months.map((month, index) => {
      const monthData = query.find(q => q.month === index + 1);
      return {
        month,
        revenue: monthData ? monthData.revenue : 0
      };
    });

    return { data };
  } catch (error: any) {
    console.error('Error retrieving yearly info:', error);
    throw error;
  }
}

export async function getDashboardInfo(startDate: string, endDate: string): Promise<IDashboardQuery> {
  try {
      const topProducts = await prisma.$queryRaw<{ name: string, quantity: number }[]>`
      SELECT
        p.Nombre AS name,
        SUM(te.Precio) AS quantity
      FROM
        TB_Productos p
      INNER JOIN
        TB_Salidas te ON p.ID_Producto = te.ID_Producto
      WHERE
        te.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        p.Nombre
      ORDER BY
        quantity DESC
    `;

    const daysOfWeek = [
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    ];

    const dailyCosts = await prisma.$queryRaw<{ day: number, cost: number }[]>`
      SELECT
        DATEPART(WEEKDAY, ts.Fecha) AS day,
        COALESCE(SUM(ts.Precio), 0) AS cost
      FROM
        TB_Productos p
      INNER JOIN
        TB_Salidas ts ON ts.ID_Producto = p.ID_Producto
      WHERE
        ts.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        DATEPART(WEEKDAY, ts.Fecha)
      ORDER BY
        DATEPART(WEEKDAY, ts.Fecha)
    `;

    const days = daysOfWeek.map((dayName, index) => {
      const dayData = dailyCosts.find(d => d.day === (index + 1));
      return {
        day: dayName,
        quantity: dayData ? dayData.cost.toFixed(2) : 0.00
      };
    });

    const totalCostResult = await prisma.$queryRaw<{ totalCost: number }[]>`
      SELECT
        COALESCE(SUM(ts.Precio), 0) AS totalCost
      FROM
        TB_Salidas ts
      WHERE
        ts.Fecha BETWEEN ${startDate} AND ${endDate}
    `;

    const totalCost = totalCostResult[0]?.totalCost || 0;

    const departments = await prisma.$queryRaw<{ department: string, quantity: number }[]>`
      SELECT
        vle.Area AS department,
        SUM(ts.Precio) AS quantity
      FROM
        TB_Requisiciones r
      INNER JOIN
        TB_Salidas ts ON ts.ID_Requisicion = r.ID_Requisicion
      INNER JOIN
        IHTT_RRHH.dbo.v_listado_empleados vle ON vle.ID_Empleado = r.ID_Empleado
      WHERE
        ts.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        vle.Area
    `;

    const groups = await prisma.$queryRaw<{ groupName: string, quantity: number }[]>`
      SELECT
        g.Nombre AS groupName,
        COALESCE(SUM(ts.Precio), 0) AS quantity
      FROM
        TB_Productos p
      INNER JOIN
        TB_Salidas ts ON ts.ID_Producto = p.ID_Producto
      INNER JOIN
      	TB_Grupos g ON g.ID_Grupo = p.ID_Grupo
      WHERE
        ts.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        g.Nombre
    `;

    const dashboardData: IDashboard = {
      products: topProducts.slice(0, 5).map(p => ({
        name: p.name,
        quantity: +p.quantity.toFixed(2)
      })),
      days: days.map(d => ({
        day: d.day,
        quantity: +d.quantity
      })),
      groups: groups.map(g => ({
        name: g.groupName,
        quantity: +g.quantity.toFixed(2)
      })),
      departments: departments.map(d => ({
        department: d.department,
        quantity: +d.quantity
      })),
      total: parseFloat(totalCost.toFixed(2))
    };

    return { data: dashboardData };
  } catch (error: any) {
    console.error('Error retrieving yearly info:', error);
    throw error;
  }
}
