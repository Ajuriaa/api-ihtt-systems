import { PrismaClient } from '../../prisma/client/supply';
import { IGroup, IProduct } from '../interfaces';

const prisma = new PrismaClient();

export async function createGroup(data: IGroup) {
  const { id, ...createData } = data;
  try {
    const new_group = await prisma.group.create({
      data: createData
    });

    if(new_group) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating group:', error);
    return error;
  }
}
