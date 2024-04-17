import {
  IVehicleBrandsQuery, IVehicleModelsQuery, IVehicleQuery,
  IVehicleStatusesQuery, IVehicleTypesQuery, IVehiclesQuery
} from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';

const prisma = new PrismaClient();

export async function getVehicle(id: string): Promise<IVehicleQuery> {
  try {
    const vehicle = await prisma.tB_Vehiculos.findUniqueOrThrow({ 
      where: { ID_Vehiculo: +id },
      include: {
        Estado_Vehiculo: true,
        Modelo: {
          include: {
            Marca_Vehiculo: true,
            Tipo_Vehiculo: true
          }
        },
        Bitacoras: {
          include: {
            Llenados_Combustible: {
              include: { Unidad_Combustible: true }
            },
            Conductor: true
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
      SELECT TOP 1 v.ID_Vehiculo AS id, 
             (m.Kilometraje + 5000) - v.Kilometraje AS kms
      FROM TB_Vehiculos v
      JOIN TB_Mantenimientos m ON v.ID_Vehiculo = m.ID_Vehiculo
      WHERE v.deleted_at IS NULL
            AND m.Tipo_Mantenimiento = 'Preventivo'
            AND m.Kilometraje = (SELECT MAX(Kilometraje) FROM TB_Mantenimientos 
                                  WHERE ID_Vehiculo = v.ID_Vehiculo AND Fecha <= GETDATE())
      ORDER BY (m.Kilometraje + 5000) - v.Kilometraje ASC;
    `;
    const vehicles = await prisma.tB_Vehiculos.findMany({
      where: { deleted_at: null },
      include: { 
        Mantenimientos: {
          orderBy: { Fecha: 'desc' }
        },
        Bitacoras: {
          include: { Conductor: true },
          orderBy: { Fecha: 'desc' }
        },
        Estado_Vehiculo: true,
        Modelo: { include: { 
          Marca_Vehiculo: true,
          Tipo_Vehiculo: true
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
        Marca_Vehiculo: true,
        Tipo_Vehiculo: true
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