import { PrismaClient } from '../../prisma/client/supply';
import { IBatch, IEntry, IProductEntry } from '../interfaces';

const prisma = new PrismaClient();

export async function createEntries(entry: IEntry, productsEntry: IProductEntry[], batchesInfo: IBatch[]) {

  try {
    const new_entry = await prisma.entry.create({ data: entry });

    if(new_entry) {
      const products_entry = productsEntry.map(product => {
        return {
          ...product,
          entryId: new_entry.id
        }
      });
      const batches = batchesInfo.map(batch => {
        return {
          ...batch,
          entryId: new_entry.id
        }
      });

      const new_batches = await prisma.batch.createMany({ data: batches });
      const new_products_entry = await prisma.productEntry.createMany({ data: products_entry });

      if(new_batches && new_products_entry) {
        return true;
      }

      return false;
    }

    return false;
  } catch (error) {
    console.error('Error creating entries:', error);
    return error;
  }
}
