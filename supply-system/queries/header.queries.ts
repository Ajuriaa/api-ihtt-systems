import moment from 'moment';
import { PrismaClient } from '../../prisma/client/supply';
import { IProductsQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function getNotifications(): Promise<IProductsQuery> {
  try {
    const products = await prisma.product.findMany({
      where: { batches: { some: {}}, deleted_at: null },
      include: { batches: { orderBy: { due: 'desc' }} }
    });

    const productsWith0Stock = await prisma.product.findMany({
      where: { batches: { none: {} }, deleted_at: null },
      include: { batches: { orderBy: { due: 'desc' } } }
    });

    const minimumStock = products.filter(product => {
      const totalStock = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
      return totalStock < product.minimum;
    });

    const soonExpired = products.filter(product => {
      const now = moment.utc();
      const date = moment.utc(product.batches[0].due);
      return date.isSameOrAfter(now, 'D') && date.diff(now, 'days') < 30;
    });

    const data = minimumStock.concat(soonExpired.filter(product =>
      !minimumStock.some(stockProduct => stockProduct.id === product.id)
    )).concat(productsWith0Stock);

    return { data };
  } catch (error: any) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}
