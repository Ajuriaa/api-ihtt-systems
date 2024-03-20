import { PrismaClient } from '../../prisma/client/vehicles';
import { IMaintenanceQuery, IRequestsQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function getMaintenances(): Promise<IMaintenanceQuery> {
  try {
    const maintenances = await prisma.tB_Mantenimientos.findMany({
      where: { deleted_at: null },
      include: {
        Vehiculo: true
      },
      orderBy: { Fecha: 'desc' }
    });

    return { data: maintenances };
  } catch (error) {
    console.error('Error retrieving maintenances info:', error);
    throw error;
  }
}