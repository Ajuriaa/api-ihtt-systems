import { IDriversQuery, IVehiclesQuery } from '../interfaces';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getDrivers(): Promise<IDriversQuery> {
  try {
    const drivers = await prisma.tB_Conductores.findMany();
    return { data: drivers };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicles(): Promise<IVehiclesQuery> {
  try {
    const vehicles = await prisma.tB_Vehiculos.findMany({
      include: { TB_Modelo: { select: { Modelo: true, TB_Marca_Vehiculo: { select: { Marca: true } } } } }
    });
    return { data: vehicles };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}