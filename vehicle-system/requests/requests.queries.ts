import { IRequestsQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

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

    const requestsWithEmployee = await Promise.all(requests.map(async (request) => {
      const empleado = await rrhh.tB_Empleados.findUnique({
        where: { ID_Empleado: request.ID_Empleado }
      });
      return { ...request, Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos };
    }));

    return { data: requestsWithEmployee };
  } catch (error) {
    console.error('Error retrieving drivers info:', error);
    throw error;
  }
}