import { PrismaClient } from '../../prisma/client/supply';
import { IHistoryQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function getHistoryInfo(): Promise<IHistoryQuery> {
  try {
    const entries = await prisma.entry.findMany({
      include: {
        supplier: true,
        productsEntry: {
          include: { product: { include: { group: true }}}
        },
        batches: true
      },
      orderBy: { systemDate: 'desc' }
    });

    const outputs = await prisma.output.findMany({
      include: {
        product: { include: { group: true }},
        requisition: true
      },
      orderBy: { systemDate: 'desc' }
    });

    return { entries, outputs };
  } catch (error: any) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}
