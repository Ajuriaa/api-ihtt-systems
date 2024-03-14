import { PrismaClient } from '@prisma/client';
import { IBrand, IModel, IVehicle } from '../interfaces/interfaces';

const prisma = new PrismaClient();

export async function deleteVehicle(id: number) {
  try {
    const deleted_vehicle = await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: id },
      data: { deleted_at: new Date() }
    });

    if(deleted_vehicle) {
      true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return error;
  }
}

export async function createVehicle(data: IVehicle ) {
  try {
    const new_vehicle = await prisma.tB_Vehiculos.create({
      data: data
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

export async function updateVehicle(id: number, data: IVehicle) {
  try {
    const updated_vehicle = await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: id },
      data: data
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
  try {
    const updated_vehicle = await prisma.tB_Modelo.create({
      data: data
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

export async function createVehicleBrands(data: IBrand) {
  try {
    const updated_vehicle = await prisma.tB_Marca_Vehiculo.create({
      data: data
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