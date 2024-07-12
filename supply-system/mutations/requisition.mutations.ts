import { PrismaClient } from '../../prisma/client/supply';
import { PrismaClient as RhPrismaClient } from '../../prisma/client/rrhh';
import { IProductRequisition, IRequisition } from '../interfaces';

const prisma = new PrismaClient();
const rhPrisma = new RhPrismaClient();

export async function createRequisition(requisitions: IProductRequisition[], username: string) {
  const requestState = await prisma.state.findFirst({ where: { state: 'Pendiente por jefe' }});
  const employeeId: {ID_Empleado: number}[] = await rhPrisma.$queryRaw`
    SELECT ID_Empleado  from IHTT_USUARIOS.dbo.TB_Usuarios tu
    WHERE Usuario_Nombre = ${username}
  `;

  const id = +employeeId[0].ID_Empleado;

  if(!employeeId) {
    throw new Error('Employee not found');
  }
  if(!requestState) {
    throw new Error('Request state not found');
  }

  try {
    const new_requisition = await prisma.requisition.create({
      data: {
        employeeId: id,
        stateId: requestState.id,
        systemUser: username
      }
    });

    if(new_requisition) {
      requisitions.forEach(async (requisition) => {
        requisition.requisitionId = new_requisition.id;
        requisition.systemUser = username;
      });

      const new_products_requisition = await prisma.productRequisition.createMany({
        data: requisitions
      });

      if(new_products_requisition) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error creating requisition:', error);
    return error;
  }
}

export async function cancelRequisition(id: number) {
  try {
    const cancelState = await prisma.state.findFirst({ where: { state: 'Cancelada' }});

    if(!cancelState) {
      throw new Error('Cancel state not found');
    }

    const cancelled_requisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: cancelState.id }
    });

    if(cancelled_requisition) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error cancelling requisition:', error);
    return error;
  }
}

export async function finishRequisition(id: number): Promise<boolean> {
  try {
    const finishState = await prisma.state.findFirst({ where: { state: 'Finalizada' } });

    if (!finishState) {
      throw new Error('Finalized state not found');
    }

    const finalizedRequisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: finishState.id }
    });

    return !!finalizedRequisition;
  } catch (error) {
    console.error('Error finalizing requisition:', error);
    return false;
  }
}

export async function updateRequisitionFile(id: number, file: string): Promise<boolean> {
  try {
    const requisition = await prisma.requisition.update({
      where: { id },
      data: { documentUrl: file }
    });

    return !!requisition;
  } catch (error) {
    console.error('Error updating requisition document:', error);
    return false;
  }
}

export async function updateProductsRequisition(productRequisitions: IProductRequisition[]) {
  try {
    const activeState = await prisma.state.findFirst({ where: { state: 'Activa' } });

    if (!activeState) {
      throw new Error('Active state not found');
    }

    for (const productReq of productRequisitions) {
      const product = await prisma.product.findUnique({
        where: { id: productReq.productId },
        include: { batches: { orderBy: { due: 'desc' } } }
      });

      if (!product) {
        throw new Error(`Product not found: ${productReq.productId}`);
      }

      const totalBatchQuantity = product.batches.reduce((acc, batch) => acc + batch.quantity, 0) || 0;

      if (totalBatchQuantity < productReq.quantity) {
        throw new Error(`Not enough stock for product ${product.name}`);
      }

      let remainingQuantity = productReq.quantity;
      let price = 0;

      for (const batch of product.batches) {
        if (remainingQuantity <= 0) break;

        if (batch.quantity >= remainingQuantity) {
          await prisma.batch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - remainingQuantity }
          });
          price += remainingQuantity * +batch.price;
          remainingQuantity = 0;
        } else {
          price += batch.quantity * +batch.price;
          remainingQuantity -= batch.quantity;
          await prisma.batch.update({
            where: { id: batch.id },
            data: { quantity: 0 }
          });
        }
      }

      await prisma.productRequisition.update({
        where: { id: productReq.id },
        data: { quantity: productReq.quantity },
      });

      await prisma.output.create({
        data: {
          productId: productReq.productId,
          quantity: productReq.quantity,
          requisitionId: productReq.requisitionId,
          observation: 'Salida por requisición',
          motive: 'requisicion',
          systemUser: productReq.systemUser,
          date: new Date(),
          currentQuantity: totalBatchQuantity - productReq.quantity,
          price
        }
      });
    }

    const id = productRequisitions[0].requisitionId;
    const finalizedRequisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: activeState.id }
    });

    return !!finalizedRequisition;
  } catch (error) {
    console.error('Error updating product requisitions:', error);
    return false;
  }
}
