import { PrismaClient } from '../../prisma/client/vehicles';
import { IDriver } from '../interfaces';

const prisma = new PrismaClient();

export async function deleteDriver(id: number) {
  try {
    const deleted_driver = await prisma.tB_Conductores.update({
      where: { ID_Conductor: id },
      data: { deleted_at: new Date() }
    });

    if(deleted_driver) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting driver:', error);
    return error;
  }
}

export async function createDriver(data: IDriver ) {
  const { ID_Conductor, ...createData } = data;
  try {
    const new_driver = await prisma.tB_Conductores.create({
      data: createData
    });

    if(new_driver) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating driver:', error);
    return error;
  }
}

export async function updateDriver(data: IDriver) {
  const { ID_Conductor, ...updateData } = data;
  try {
    const updated_driver = await prisma.tB_Conductores.update({
      where: { ID_Conductor: data.ID_Conductor },
      data: updateData
    });

    if(updated_driver) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
}