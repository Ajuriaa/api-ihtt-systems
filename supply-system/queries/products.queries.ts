import { PrismaClient } from '../../prisma/client/supply';
import { IProductQuery, IProductsQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function getProducts(): Promise<IProductsQuery> {
  try {
    const data = await prisma.product.findMany({
      include: {
        batches: true,
        group: true,
        productRequisitions: true,
        outputs: true
      }
    });
    return { data };
  } catch (error: any) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}

export async function getProduct(id: string): Promise<IProductQuery> {
  try {
    const data = await prisma.product.findFirstOrThrow({
      where: { id: +id },
      include: {
        batches: { orderBy: { due: 'desc' } },
        group: true,
        productRequisitions: true,
        outputs: true
      }
    });
    return { data };
  } catch (error: any) {
    console.error('Error retrieving product info:', error);
    throw error.message;
  }
}