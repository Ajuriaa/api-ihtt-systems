import { PrismaClient } from '../../prisma/client/vehicles';
import { IFuelRefill, ILog, IVehicle } from '../interfaces';

interface FuesWithLog {
  ID_Vehiculo?: number;
  Kilometraje_Vehiculo: number;
  Cantidad: number;
  Estacion_Combustible: string;
  Kilometraje_Recarga: number;
  Fecha: Date;
  Precio: number;
  ID_Unidad_Combustible: number;
}

interface Data {
  logs: ILog[];
  refills: FuesWithLog[];
}

const prisma = new PrismaClient();

export async function createLogs(data: Data) {
  const refills = data.refills;
  const logs = data.logs;
  const vehicleId = data.logs[0].ID_Vehiculo;
  const fuels: IFuelRefill[] = [];

  try {
    const new_logs = await prisma.tB_Bitacoras.createMany({
      data: logs
    });

    for (const refill of refills) {
      const log = await prisma.tB_Bitacoras.findFirst({
        where: { ID_Vehiculo: refill.ID_Vehiculo, Kilometraje_Entrada: refill.Kilometraje_Vehiculo },
      });

      if(!log) {
        throw new Error('Log not found');
      }

      const { ID_Vehiculo, Kilometraje_Vehiculo, ...rest } = refill;
      
      (rest as any).ID_Bitacora = log.ID_Bitacora;

      fuels.push(rest as IFuelRefill);
    }

    const new_refills = await prisma.tB_Llenado_Combustible.createMany({
      data: fuels
    });

    const vehicle = await prisma.tB_Vehiculos.findFirst({ 
      where: { 
        ID_Vehiculo: vehicleId
      },
      include: { 
        Bitacoras: {orderBy: {Kilometraje_Entrada: 'desc'}}
      }});

    let updatedVehicle: IVehicle | null = null;

    if(vehicle) {
      const currentKms = vehicle.Bitacoras[0].Kilometraje_Entrada;
      updatedVehicle = await prisma.tB_Vehiculos.update({
        where: { ID_Vehiculo: vehicleId },
        data: { Kilometraje: currentKms }
      });
    }

    if(new_logs  && new_refills && updatedVehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating driver:', error);
    return error;
  }
}