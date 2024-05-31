import { IDriverQuery, IDriversQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { getArea } from './reusable';

const prisma = new PrismaClient();

export async function getDriver(id: string): Promise<IDriverQuery> {
  try {
    const driver = await prisma.tB_Conductores.findUniqueOrThrow({ 
      where: { ID_Conductor: +id },
      include: {
        Solicitudes: {
          include: {
            Estado_Solicitud: true,
            Vehiculo: true
          }
        }
      }
    });

    const driverInfo = {
      ...driver,
      Solicitudes_Finalizadas: driver.Solicitudes.filter(s => s.Estado_Solicitud.Estado === 'Finalizada').length,
      Disponible: driver.Solicitudes.filter(s => s.Estado_Solicitud.Estado === 'Activo').length === 0
    }
    return { data: driverInfo };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getDrivers(username: string): Promise<IDriversQuery> {
  try {
    const area = await getArea(username);
    const drivers = await prisma.tB_Conductores.findMany({
      where: { deleted_at: null, Departamento: area },
      include: { Solicitudes: { select: { Estado_Solicitud: { select: {Estado: true}}}}}
    });

    const driverInfo = drivers.map(driver => ({
      ...driver, Solicitudes_Finalizadas: driver.Solicitudes.filter(s => s.Estado_Solicitud.Estado === 'Finalizada').length,
      Disponible: driver.Solicitudes.filter(s => s.Estado_Solicitud.Estado === 'Activo').length === 0
    }));
    return { data: driverInfo };
  } catch (error) {
    console.error('Error retrieving drivers info:', error);
    throw error;
  }
}