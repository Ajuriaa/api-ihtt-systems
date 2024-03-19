import { PrismaClient } from '../../prisma/client/vehicles';
import { IRequest } from '../interfaces';

const prisma = new PrismaClient();

export async function createRequest(data: IRequest ) {
  const { ID_Solicitud, ...createData } = data;
  try {
    const new_request = await prisma.tB_Solicitudes.create({
      data: createData
    });

    if(new_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating request:', error);
    return error;
  }
}

export async function updateRequest(data: IRequest) {
  const { ID_Solicitud, ...updateData } = data;
  try {
    const updated_request = await prisma.tB_Solicitudes.update({
      where: { ID_Solicitud: data.ID_Solicitud },
      data: updateData
    });

    if(updated_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
}