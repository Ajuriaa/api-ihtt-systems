import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as PrismaRRHHClient } from '../../prisma/client/rrhh';
import { IUsersQuery, IVehicleLogQuery } from '../interfaces';

const prisma = new PrismaClient();
const rrhh_prisma = new PrismaRRHHClient();

export async function getVehicleLogs(id: string): Promise<IVehicleLogQuery> {
  try {
    const logs = await prisma.tB_Bitacoras.findMany({
      where: { deleted_at: null, ID_Vehiculo: +id },
      orderBy: { Fecha: 'desc' }
    });

    return { data: logs };
  } catch (error) {
    console.error('Error retrieving logs info:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<IUsersQuery> {
  try {
    const users = await rrhh_prisma.tB_Empleados.findMany({ where: { ID_Estado: 1, ID_Empleado: { not: 0 }}});

    return { data: users };
  } catch (error) {
    console.error('Error retrieving users info:', error);
    throw error;
  }
}