import { PrismaClient } from '../../prisma/client/supply';
import { IProductsQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function test(): Promise<IProductsQuery> {
  try {
    const product = await prisma.product.findMany({include: {group: true}});
    return { data: product };
  } catch (error) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}