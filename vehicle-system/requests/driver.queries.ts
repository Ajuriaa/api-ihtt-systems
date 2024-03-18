import { IDriversQuery } from '../interfaces';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getDrivers(): Promise<IDriversQuery> {
  try {
    const drivers = await prisma.tB_Conductores.findMany({
      include: { TB_Solicitudes: { select: { TB_Estado_Solicitud: { select: {Estado: true}}}}}
    });

    const driverInfo = drivers.map(driver => ({
      ...driver, Solicitudes_Finalizadas: driver.TB_Solicitudes.filter(s => s.TB_Estado_Solicitud.Estado === 'Finalizada').length,
      Disponible: driver.TB_Solicitudes.filter(s => s.TB_Estado_Solicitud.Estado === 'Activo').length === 0
    }));
    return { data: driverInfo };
  } catch (error) {
    console.error('Error retrieving drivers info:', error);
    throw error;
  }
}