import { PrismaClient } from '../../prisma/client/vehicles';
import { IModel, IVehicle } from '../interfaces/interfaces';
import { getArea } from './reusable';

const prisma = new PrismaClient();

export async function deleteVehicle(id: number) {
  try {
    const deleted_vehicle = await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: id },
      data: { deleted_at: new Date() }
    });

    if(deleted_vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return error;
  }
}

export async function createVehicle(data: IVehicle ) {
  const area = await getArea(data.Sistema_Usuario as string);
  const { ID_Vehiculo, ...createData } = data;
  createData.Departamento = area;
  try {
    const new_vehicle = await prisma.tB_Vehiculos.create({
      data: createData
    });

    if(new_vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return error;
  }
}

export async function updateVehicle(data: IVehicle) {
  const { ID_Vehiculo, ...updateData } = data;
  try {
    const updated_vehicle = await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: data.ID_Vehiculo },
      data: updateData
    });

    if(updated_vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

export async function createVehicleModels(data: IModel) {
  const { ID_Modelo, ...createData } = data;
  try {
    const updated_vehicle = await prisma.tB_Modelo.create({
      data: createData
    });

    if(updated_vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating vehicle model:', error);
    throw error;
  }
}

export async function createVehicleBrands(data: string) {
  try {
    const updated_vehicle = await prisma.tB_Marca_Vehiculo.create({
      data: { Marca: data }
    });

    if(updated_vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating vehicle brand:', error);
    throw error;
  }
}