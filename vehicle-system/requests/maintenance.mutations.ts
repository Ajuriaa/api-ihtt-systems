import { PrismaClient } from '../../prisma/client/vehicles';
import { IMaintenance } from '../interfaces';

const prisma = new PrismaClient();

export async function createMaintenance(data: IMaintenance ) {
  try {
    const new_maintenance = await prisma.tB_Mantenimientos.create({ data });

    if(new_maintenance) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating maintenance:', error);
    return error;
  }
}