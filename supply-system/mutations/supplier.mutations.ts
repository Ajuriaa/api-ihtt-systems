import { PrismaClient } from '../../prisma/client/supply';
import { ISupplier } from '../interfaces';

const prisma = new PrismaClient();

export async function createSupplier(data: ISupplier) {
  const { id, ...createData } = data;
  try {
    const new_supplier = await prisma.supplier.create({
      data: createData
    });

    if(new_supplier) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating supplier:', error);
    return error;
  }
}

export async function updateSupplier(data: ISupplier) {
  const { id, ...updateData } = data;
  try {
    const updated_product = await prisma.supplier.update({
      where: { id },
      data: updateData
    });

    if(updated_product) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating supplier:', error);
    return error;
  }
}

export async function deleteSupplier(id: number) {
  try {
    const deleted_supplier = await prisma.supplier.update({
      where: { id },
      data: { deleted_at: new Date() }
    });

    if(deleted_supplier) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return error;
  }
}
