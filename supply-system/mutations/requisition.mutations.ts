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

export async function finishRequisition(id: number) {
  try {
    const finishState = await prisma.state.findFirst({ where: { state: 'Finalizada' }});

    if(!finishState) {
      throw new Error('Finalized state not found');
    }

    const finalized_requisition = await prisma.requisition.update({
      where: { id },
      data: { stateId: finishState.id }
    });

    if(finalized_requisition) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error finalizing requisition:', error);
    return error;
  }
}
