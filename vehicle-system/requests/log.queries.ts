import { PrismaClient } from '../../prisma/client/vehicles';
import { IVehicleLogQuery } from '../interfaces';

const prisma = new PrismaClient();

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