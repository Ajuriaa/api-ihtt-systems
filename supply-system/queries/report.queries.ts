import moment from 'moment-business-days';
import { Prisma, PrismaClient } from '../../prisma/client/supply';
import { DepartmentReportQuery } from '../interfaces';

const daysOfWeek: { [key: number]: string } = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado"
};

const prisma = new PrismaClient();

export async function generateReport(type: string, startDate: string, endDate: string): Promise<any> {
  switch (type) {
    case 'departments':
      return await getDepartmentsReport(startDate, endDate);
    case 'products':
      return await getProductsReport(startDate, endDate);
    case 'daily':
      return await getDailyReport();
    case 'groups':
      return await getGroupsReport(startDate, endDate);
    case 'entries':
      return await getEntriesReport(startDate, endDate);
    case 'suppliers':
      return await getProvidersReport(startDate, endDate);
    case 'stock':
      return await getStockReport();
    default:
      return null;
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
        r.ID_Estado = 10
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

async function getGroupsReport(startDate: string, endDate: string): Promise<any> {
  try {
    const query = await prisma.$queryRaw<{ group: string, totalProducts: number, totalCost: number }[]>`
      SELECT
       	tg.Nombre AS department,
        COUNT(DISTINCT ts.ID_Salida) AS totalProducts,
        SUM(ts.Precio) AS totalCost
      FROM
        TB_Grupos tg
      INNER JOIN
      	TB_Productos p ON p.ID_Grupo = tg.ID_Grupo
      INNER JOIN
      	TB_Salidas ts ON ts.ID_Producto = p.ID_Producto
      AND ts.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        tg.Nombre;
    `;

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.totalCost as any), 0);

    const data = {
      info: query,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving groups report:', error);
    throw error;
  }
}

async function getProductsReport(startDate: string, endDate: string): Promise<any> {
  try {
    const query: { product: string, unit: string, quantity: number, cost: number }[] = await prisma.$queryRaw`
      SELECT
        p.Nombre AS product,
        p.Unidad AS unit,
        SUM(o.Cantidad) AS quantity,
        SUM(o.Precio) AS cost
      FROM
        TB_Productos p
      INNER JOIN
        TB_Salidas o ON o.ID_Producto = p.ID_Producto
      WHERE
        o.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        p.Nombre, p.Unidad;
    `;

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.cost as any), 0);

    const data = {
      info: query,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving products report:', error);
    throw error;
  }
}

async function getDailyReport(): Promise<any> {
  const businessDays = getLastFiveBusinessDays();
  try {
    const query = await prisma.$queryRaw<{ date: string, totalAmount: number }[]>`
      SELECT
        CAST(o.Fecha AS DATE) AS date,
        SUM(o.Precio) AS totalAmount
      FROM
        TB_Salidas o
      WHERE
        CAST(o.Fecha AS DATE) IN (${Prisma.join(businessDays)})
      GROUP BY
        CAST(o.Fecha AS DATE)
      ORDER BY
        date DESC;
    `;

    const resultsMap = query.reduce((acc, curr) => {
      acc[moment.utc(curr.date).format('DD/MM/YYYY')] = curr.totalAmount;
      return acc;
    }, {} as { [key: string]: number });

    const formattedResult = businessDays.map(stringDate => {
      const date = moment(stringDate);
      const dateString = date.format('DD/MM/YYYY');
      return {
        date: date.format('DD/MM/YYYY'),
        day: daysOfWeek[date.day()],
        cost: 'L.' + (resultsMap[dateString] ? resultsMap[dateString] : 0).toFixed(2)
      };
    });

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.totalAmount as any), 0);

    const data = {
      info: formattedResult,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving daily report:', error);
    throw error;
  }
}

function getLastFiveBusinessDays(): string[] {
  const businessDays: moment.Moment[] = [];
  let currentDay = moment();

  while (businessDays.length < 5) {
    if (currentDay.isBusinessDay()) {
      businessDays.push(currentDay.clone());
    }
    currentDay = currentDay.subtract(1, 'days');
  }

  return businessDays.reverse().map(date => date.format('YYYY-MM-DD'));
}

async function getEntriesReport(startDate: string, endDate: string): Promise<any> {
  try{
    const query = await prisma.$queryRaw<{ product: string, unit: string, totalInputs: number, totalCost: number }[]>`
      SELECT
        p.Nombre AS product,
        p.Unidad AS unit,
        COUNT(DISTINCT te.ID_Entrada) AS totalInputs,
        SUM(tp.Precio) AS totalCost
      FROM
      TB_Productos p
      INNER JOIN
        TB_Productos_Entrada tp ON tp.ID_Producto = p.ID_Producto
      INNER JOIN
        TB_Entradas te ON tp.ID_Entrada = te.ID_Entrada
      AND
        te.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        p.Nombre, p.Unidad;
    `;

    const formattedResult = query.map(result => {
      return {
        product: result.product,
        unit: result.unit,
        totalInputs: result.totalInputs,
        totalCost: 'L.' + result.totalCost.toFixed(2)
      };
    });

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.totalCost as any), 0);

    const data = {
      info: formattedResult,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving entries report:', error);
    throw error;
  }
}

async function getProvidersReport(startDate: string, endDate: string): Promise<any> {
  try {
    const query = await prisma.$queryRaw<{ provider: string, totalInputs: number, totalCost: number }[]>`
      SELECT
        p.Nombre AS provider,
        COUNT(DISTINCT te.ID_Entrada) AS totalInputs,
        SUM(tpe.Precio) AS totalCost
      FROM
        TB_Proveedores p
      INNER JOIN
        TB_Entradas te ON te.ID_Proveedor = p.ID_Proveedor
      INNER JOIN
      	TB_Productos_Entrada tpe ON tpe.ID_Entrada = te.ID_Entrada
      AND te.Fecha BETWEEN ${startDate} AND ${endDate}
      GROUP BY
        p.Nombre;
    `;

    const formattedResult = query.map(result => {
      return {
        provider: result.provider,
        totalInputs: result.totalInputs,
        totalCost: 'L.' + result.totalCost.toFixed(2)
      };
    });

    const total = query.reduce((acc, curr) => acc + parseFloat(curr.totalCost as any), 0);

    const data = {
      info: formattedResult,
      total: +total.toFixed(2)
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving providers report:', error);
    throw error;
  }
}

async function getStockReport(): Promise<any> {
  try {
    const products = await prisma.product.findMany({
      select: { minimum: true, unit: true, name: true, batches: { select: { quantity: true }}}
    });

    const losStockProducts = products.filter(product => {
      const totalStock = product.batches.reduce((acc, curr) => acc + curr.quantity, 0);
      return totalStock < product.minimum;
    });

    const formattedResult = losStockProducts.map(product => {
      const totalStock = product.batches.reduce((acc, curr) => acc + curr.quantity, 0);
      return {
        product: product.name,
        unit: product.unit,
        totalStock,
        minimum: product.minimum
      };
    });

    const data = {
      info: formattedResult,
      total: 0
    };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving stock report:', error);
    throw error;
  }
}
