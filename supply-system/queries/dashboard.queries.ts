import moment from 'moment';
import { PrismaClient } from '../../prisma/client/supply';

export interface IYearlyStats {
  month: string;
  revenue: number;
}

export interface IYearlyStatsQuery {
  data: IYearlyStats[];
}

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
