import { PrismaClient } from '../../prisma/client/supply';
import { IProduct } from '../interfaces';

const prisma = new PrismaClient();

export async function createProduct(data: IProduct) {
  const { id, ...createData } = data;
  try {
    const new_product = await prisma.product.create({
      data: createData
    });

    if(new_product) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating product:', error);
    return error;
  }
}

export async function updateProduct(data: IProduct) {
  const { id, ...updateData } = data;
  try {
    const updated_product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    if(updated_product) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating product:', error);
    return error;
  }
}
