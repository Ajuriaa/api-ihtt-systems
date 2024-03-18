import {
  IVehicleBrandsQuery, IVehicleModelsQuery, IVehicleQuery,
  IVehicleStatusesQuery, IVehicleTypesQuery, IVehiclesQuery
} from '../interfaces';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getVehicle(id: string): Promise<IVehicleQuery> {
  try {
    const vehicle = await prisma.tB_Vehiculos.findUniqueOrThrow({ 
      where: { ID_Vehiculo: +id },
      include: {
        TB_Estado_Vehiculo: true,
        TB_Modelo: {
          include: {
            TB_Marca_Vehiculo: true,
            TB_Tipo_Vehiculo: true
          }
        },
        TB_Bitacoras: {
          include: {
            TB_Llenado_Combustible: {
              include: { TB_Unidad_Combustible: true }
            }
          }
        }
      }
    });
    return { data: vehicle };
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
        TB_Estado_Vehiculo: true,
        TB_Modelo: { include: { 
          TB_Marca_Vehiculo: true,
          TB_Tipo_Vehiculo: true
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
        TB_Marca_Vehiculo: true,
        TB_Tipo_Vehiculo: true
      }
    });
    return { data: models };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleStatuses(): Promise<IVehicleStatusesQuery> {
  try {
    const status = await prisma.tB_Estado_Vehiculo.findMany();
    return { data: status };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleTypes(): Promise<IVehicleTypesQuery> {
  try {
    const status = await prisma.tB_Tipo_Vehiculo.findMany();
    return { data: status };
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