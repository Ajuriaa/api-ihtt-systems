import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function deleteVehicle(id: number) {
  try {
    await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: id },
      data: { deleted_at: new Date() }
    });

    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return false;
  }
}
