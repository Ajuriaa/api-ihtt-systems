import { ICitiesQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';

const prisma = new PrismaClient();

export async function getCities(): Promise<ICitiesQuery> {
  try {
    const cities = await prisma.tB_Ciudades.findMany();
    return { data: cities };
  } catch (error) {
    console.error('Error retrieving cities info:', error);
    throw error;
  }
}