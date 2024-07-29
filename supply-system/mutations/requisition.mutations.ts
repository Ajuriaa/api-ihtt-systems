import { PrismaClient } from '../../prisma/client/supply';
import { PrismaClient as RhPrismaClient } from '../../prisma/client/rrhh';
import { IProductRequisition } from '../interfaces';
import { PDFHelper } from '../../services';

const prisma = new PrismaClient();
const rhPrisma = new RhPrismaClient();
const pdfHelper = new PDFHelper();

export interface IRange {
  id: number;
  startRange: number;
  endRange: number;
}

export async function createRequisition(
  requisitions: IProductRequisition[],
  username: string
) {
  const requestState = await prisma.state.findFirst({
    where: { state: 'Pendiente por jefe' },
  });
  const employeeId: { ID_Empleado: number }[] = await rhPrisma.$queryRaw`
    SELECT ID_Empleado  from IHTT_USUARIOS.dbo.TB_Usuarios tu
    WHERE Usuario_Nombre = ${username}
  `;

  const id = +employeeId[0].ID_Empleado;

  if (!employeeId) {
    throw new Error('Employee not found');
  }
  if (!requestState) {
    throw new Error('Request state not found');
  }

  try {
    const new_requisition = await prisma.requisition.create({
      data: {
        employeeId: id,
        stateId: requestState.id,
        systemUser: username,
      },
    });

    if (new_requisition) {
      requisitions.forEach(async (requisition) => {
        requisition.requisitionId = new_requisition.id;
        requisition.systemUser = username;
        requisition.requestedQuantity = requisition.quantity;
      });

      const new_products_requisition =
        await prisma.productRequisition.createMany({
          data: requisitions,
        });

      if (new_products_requisition) {
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
    const cancelState = await prisma.state.findFirst({
      where: { state: 'Cancelada' },
    });

    if (!cancelState) {
      throw new Error('Cancel state not found');
    }

    const cancelled_requisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: cancelState.id },
    });

    if (cancelled_requisition) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error cancelling requisition:', error);
    return error;
  }
}

export async function acceptRequisition(id: number) {
  try {
    const adminState = await prisma.state.findFirst({
      where: { state: 'Pendiente por admin' },
    });

    if (!adminState) {
      throw new Error('Admin state not found');
    }

    const cancelled_requisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: adminState.id },
    });

    if (cancelled_requisition) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error cancelling requisition:', error);
    return error;
  }
}

export async function getBossRequisitions(id: string): Promise<any> {
  try {
    const requisitions = await prisma.$queryRaw<{ ID_Requisicion: number, Url_Documento: string, Estado: string }[]>`
    	DECLARE @BossId INT = ${id};
      SELECT
      r.ID_Requisicion,
      r.Url_Documento ,
      te.Estado
      FROM TB_Requisiciones r
      INNER JOIN IHTT_RRHH.dbo.v_listado_empleados vle ON r.ID_Empleado = vle.ID_Empleado
      INNER JOIN TB_Estados te ON te.ID_Estado = r.ID_Estado
      WHERE vle.ID_Jefe = @BossId;
    `;

    return requisitions;
  } catch (error) {
    console.error('Error retrieving requisitions info:', error);
    throw error;
  }
}

export async function printRequisition(id: number): Promise<ArrayBuffer> {
  try {
    const requisition = await prisma.requisition.findUnique({
      where: { id },
      include: {
        outputs: true,
        productsRequisition: {
          include: {
            product: { include: { batches: { orderBy: { due: 'desc' } } } },
          },
        },
      },
    });

    if (!requisition) {
      throw new Error('requisition not found');
    }
    const department: { Area: string }[] = await rhPrisma.$queryRaw`
      SELECT Area
      FROM v_listado_empleados vle
      INNER JOIN TB_Contactos tc ON tc.ID_Empleado = vle.ID_Jefe
      WHERE vle.ID_Empleado = ${requisition.employeeId};
    `;

    if (department) {
      return pdfHelper.generateRequisitionsPDF(requisition, department[0].Area);
    }

    return new ArrayBuffer(0);
  } catch (error) {
    console.error('Error printing requisition:', error);
    return new ArrayBuffer(0);
  }
}

export async function finishRequisition(id: number): Promise<boolean> {
  try {
    const finishState = await prisma.state.findFirst({
      where: { state: 'Finalizada' },
    });

    if (!finishState) {
      throw new Error('Finalized state not found');
    }

    const finalizedRequisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: finishState.id },
    });

    return !!finalizedRequisition;
  } catch (error) {
    console.error('Error finalizing requisition:', error);
    return false;
  }
}

export async function updateRequisitionFile(
  id: number,
  file: string
): Promise<boolean> {
  try {
    const requisition = await prisma.requisition.update({
      where: { id },
      data: { documentUrl: file },
    });

    return !!requisition;
  } catch (error) {
    console.error('Error updating requisition document:', error);
    return false;
  }
}

export async function updateProductsRequisition(
  productRequisitions: IProductRequisition[],
  ranges: IRange[]
) {
  try {
    const activeState = await prisma.state.findFirst({
      where: { state: 'Activa' },
    });

    if (!activeState) {
      throw new Error('Active state not found');
    }

    for (const productReq of productRequisitions) {
      const product = await prisma.product.findUnique({
        where: { id: productReq.productId },
        include: { batches: { orderBy: { due: 'desc' } } },
      });

      if (!product) {
        throw new Error(`Product not found: ${productReq.productId}`);
      }

      const totalBatchQuantity =
        product.batches.reduce((acc, batch) => acc + batch.quantity, 0) || 0;

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
            data: { quantity: batch.quantity - remainingQuantity },
          });
          price += remainingQuantity * +batch.price;
          remainingQuantity = 0;
        } else {
          price += batch.quantity * +batch.price;
          remainingQuantity -= batch.quantity;
          await prisma.batch.update({
            where: { id: batch.id },
            data: { quantity: 0 },
          });
        }
      }

      const range = ranges.find((range) => range.id === productReq.id);

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
          price,
          endRange: range?.endRange || 0,
          startRange: range?.startRange || 0,
        },
      });

      if (range && range.endRange) {
        await prisma.product.update({
          where: { id: productReq.productId },
          data: { batchedNumber: range.endRange + 1 },
        });
      }
    }

    const id = productRequisitions[0].requisitionId;
    const finalizedRequisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: activeState.id },
    });

    return !!finalizedRequisition;
  } catch (error) {
    console.error('Error updating product requisitions:', error);
    return false;
  }
}
