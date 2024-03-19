import { IRequestsQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';

const prisma = new PrismaClient();

export async function getRequests(): Promise<IRequestsQuery> {
  try {
    const requests = await prisma.tB_Solicitudes.findMany({
      where: { deleted_at: null },
      include: {
        TB_Pasajeros: true,
        TB_Conductores: true,
        TB_Estado_Solicitud: true,
        TB_Vehiculos: true,
        TB_Tipo_Solicitudes: true,
        TB_Ciudad: true
      }
    });
    return { data: requests };
  } catch (error) {
    console.error('Error retrieving drivers info:', error);
    throw error;
  }
}