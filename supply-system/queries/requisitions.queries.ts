import { PrismaClient } from '../../prisma/client/supply';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';
import { IRequisitionQuery, IRequisitionsQuery } from '../interfaces';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

export async function getRequisitions(): Promise<IRequisitionsQuery> {
  try {
    const requisitons = await prisma.requisition.findMany({
      include: {
        productsRequisition: { include: { product: true } },
        state: true
      },
      orderBy: { systemDate: 'desc' }
    });

    const data = await Promise.all(requisitons.map(async (requisition) => {
      const employee = await rrhh.tB_Empleados.findUnique({
        where: { ID_Empleado: requisition.employeeId }
      });
      const info: { Nombre_Jefe: string, Area: string }[] = await rrhh.$queryRaw`
        SELECT Nombre_Jefe, Area FROM v_listado_empleados vle
        WHERE ID_Empleado = ${requisition.employeeId}
      `
      return { ...requisition, employeeName: employee?.Nombres + ' ' + employee?.Apellidos, bossName: info[0].Nombre_Jefe, department: info[0].Area };
    }));
    return { data };
  } catch (error: any) {
    console.error('Error retrieving requisitions info:', error);
    throw error;
  }
}

export async function getRequisition(id: string): Promise<IRequisitionQuery> {
  try {
    const requisition = await prisma.requisition.findFirstOrThrow({
      where: { id: +id },
      include: {
        productsRequisition: { include: { product: true } },
        state: true
      }
    });

    const employee = await rrhh.tB_Empleados.findUnique({
      where: { ID_Empleado: requisition.employeeId }
    });

    const info: { Nombre_Jefe: string, Area: string }[] = await rrhh.$queryRaw`
      SELECT Nombre_Jefe, Area FROM v_listado_empleados vle
      WHERE ID_Empleado = ${requisition.employeeId}
    `

    const data = { ...requisition, employeeName: employee?.Nombres + ' ' + employee?.Apellidos, bossName: info[0].Nombre_Jefe, department: info[0].Area };

    return { data };
  } catch (error: any) {
    console.error('Error retrieving requisition info:', error);
    throw error.message;
  }
}
