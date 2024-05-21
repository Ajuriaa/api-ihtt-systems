import { PrismaClient } from '../../prisma/client/supply';
import { ISupplierQuery, ISuppliersQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function getSuppliers(): Promise<ISuppliersQuery> {
  try {
    const product = await prisma.supplier.findMany({
      include: {
        entries: { 
          include: { productsEntry: true, batches: true },
          orderBy: { date: 'desc' }
        }
      }
    });
    return { data: product };
  } catch (error: any) {
    console.error('Error retrieving suppliers info:', error);
    throw error;
  }
}

export async function getSupplier(id: string): Promise<ISupplierQuery> {
  try {
    const product = await prisma.supplier.findFirstOrThrow({
      where: { id: +id },
      include: {
        entries: { 
          include: { productsEntry: true, batches: true },
          orderBy: { date: 'desc' }
        }
      }
    });
    return { data: product };
  } catch (error: any) {
    console.error('Error retrieving supplier info:', error);
    throw error.message;
  }
}