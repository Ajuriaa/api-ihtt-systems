import { PrismaClient } from '../../prisma/client/supply';

const prisma = new PrismaClient();

export async function test(): Promise<any> {
  try {
    const product = await prisma.entry.findMany({
      include: { supplier: true }
    });
    return { data: product };
  } catch (error) {
    console.error('Error retrieving product info:', error);
    throw error;
  }
}