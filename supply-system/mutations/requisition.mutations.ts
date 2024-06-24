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
