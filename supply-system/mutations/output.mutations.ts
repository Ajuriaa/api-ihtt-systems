import { PrismaClient } from '../../prisma/client/supply';

const prisma = new PrismaClient();

export async function createOutput(output: any) {
  try {
    const { batchId, ...data } = output;
    const new_output = await prisma.output.create({ data });
    const updated_batch = await prisma.batch.update({
      where: { id: batchId },
      data: { quantity: { decrement: output.quantity } }
    });

    if(new_output && updated_batch) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating output:', error);
    return error;
  }
}
