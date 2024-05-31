import { PrismaClient } from '../../prisma/client/vehicles';
import { IMaintenanceQuery, IRequestsQuery } from '../interfaces';
import { getArea } from './reusable';

const prisma = new PrismaClient();

export async function getMaintenances(username: string): Promise<IMaintenanceQuery> {
  try {
    const area = await getArea(username);
    const maintenances = await prisma.tB_Mantenimientos.findMany({
      where: { deleted_at: null, Departamento: area },
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