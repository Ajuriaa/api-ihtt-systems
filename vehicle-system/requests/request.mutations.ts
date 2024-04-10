import { PrismaClient } from '../../prisma/client/vehicles';
import { IRequest } from '../interfaces';

const prisma = new PrismaClient();

export async function createRequest(data: any ) {
  const requestState = await prisma.tB_Estado_Solicitudes.findUniqueOrThrow({ where: { ID_Estado_Solicitud: 1 }});

  try {
    const new_request = await prisma.tB_Solicitudes.create({
      data: {
        ID_Empleado: data.ID_Empleado,
        Destino: data.Destino,
        Motivo: data.Motivo,
        Fecha: data.Fecha,
        Hora_Regreso: data.Hora_Regreso,
        Hora_Salida: data.Hora_Salida,
        ID_Ciudad: data.Ciudad.ID_Ciudad,
        ID_Estado_Solicitud: requestState.ID_Estado_Solicitud,
        ID_Tipo_Solicitud: data.Tipo_Solicitud.ID_Tipo_Solicitud,
        Sistema_Usuario: data.Sistema_Usuario,
        Pasajeros: data.Pasajeros
      }
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

    const requestState = await prisma.tB_Estado_Solicitudes.findUniqueOrThrow({
      where: { ID_Estado_Solicitud: data.ID_Estado_Solicitud }
    });

    const usedVehicleState = await prisma.tB_Estado_Vehiculo.findFirst({
      where: { Estado_Vehiculo:  'En Uso' }
    });

    const availableVehicleState = await prisma.tB_Estado_Vehiculo.findFirst({
      where: { Estado_Vehiculo:  'Disponible' }
    });

    if(requestState.Estado === 'Activo') {
      await prisma.tB_Vehiculos.update({
        where: { ID_Vehiculo: data.ID_Vehiculo || 0},
        data: { ID_Estado_Vehiculo: usedVehicleState?.ID_Estado_Vehiculo }
      });
    } else {
      await prisma.tB_Vehiculos.update({
        where: { ID_Vehiculo: data.ID_Vehiculo || 0},
        data: { ID_Estado_Vehiculo: availableVehicleState?.ID_Estado_Vehiculo }
      });
    }

    if(updated_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
}