import { IDriversQuery, IVehicle, IVehicleBrandsQuery, IVehicleModelsQuery, IVehiclesQuery } from '../interfaces';
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
    const maintenance: [{id: number, kms: number}]= await prisma.$queryRaw`
      SELECT TOP 1 ID_Vehiculo as id, Kilometraje - Kilometraje_Mantenimiento AS kms
      FROM TB_Vehiculos
      WHERE deleted_at IS NULL
      ORDER BY kms ASC;
    `;
    const vehicles = await prisma.tB_Vehiculos.findMany({
      where: { deleted_at: null },
      include: { 
        TB_Estado_Vehiculo: { select: { Estado_Vehiculo: true } },
        TB_Modelo: { select: { Modelo: true, 
          TB_Marca_Vehiculo: { select: { Marca: true } },
          TB_Tipo_Vehiculo: { select: { Tipo_Vehiculo: true } }
        }
      }}
    });
    return { data: vehicles, maintenance: maintenance[0] };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleModels(): Promise<IVehicleModelsQuery> {
  try {
    const models = await prisma.tB_Modelo.findMany({
      include: {
        TB_Marca_Vehiculo: { select: { Marca: true } },
        TB_Tipo_Vehiculo: { select: { Tipo_Vehiculo: true } }
      }
    });
    return { data: models };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleBrands(): Promise<IVehicleBrandsQuery> {
  try {
    const brands = await prisma.tB_Marca_Vehiculo.findMany();
    return { data: brands };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}