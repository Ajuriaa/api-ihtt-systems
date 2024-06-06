import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as PrismaRRHHClient } from '../../prisma/client/rrhh';
import { requestMailInfo, sendMail } from '../../services';
import moment from 'moment';
import { getArea } from './reusable';

const prisma = new PrismaClient();
const rrhh = new PrismaRRHHClient();

export async function finishRequest(id: string): Promise<boolean> {
  const requestState = await prisma.tB_Estado_Solicitudes.findFirst({ where: { Estado: 'Finalizada' }});
  if(!requestState) {
    throw new Error('Request state not found');
  }

  try {
    const updated_request = await prisma.tB_Solicitudes.update({
      where: { ID_Solicitud: +id },
      data: { ID_Estado_Solicitud: requestState.ID_Estado_Solicitud }
    });

    if(updated_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error finishing request:', error);
    throw error;
  }
}

export async function cancelRequest(id: string): Promise<boolean> {
  const requestState = await prisma.tB_Estado_Solicitudes.findFirst({ where: { Estado: 'Cancelada' }});
  if(!requestState) {
    throw new Error('Request state not found');
  }

  try {
    const updated_request = await prisma.tB_Solicitudes.update({
      where: { ID_Solicitud: +id },
      data: { ID_Estado_Solicitud: requestState.ID_Estado_Solicitud }
    });

    if(updated_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error cancelling request:', error);
    throw error;
  }
}

export async function createRequest(data: any ) {
  const deparments = ['IHTT03', 'IHTT11', 'IHTT12', 'IHTT13', 'IHTT26', 'IHTT07']
  const requestState = await prisma.tB_Estado_Solicitudes.findFirst({ where: { Estado: 'Pendiente por jefe' }});
  let area = await getArea(data.Sistema_Usuario);

  if(!deparments.includes(area)) {
    area = 'IHTT03';
  }

  if(!requestState) {
    throw new Error('Request state not found');
  }

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
        Pasajeros: data.Pasajeros,
        Departamento: area,
        Documento_URL: data.Documento_URL,
        Numero_Memorando: data.Numero_Memorando
      }
    });

    if(new_request) {
      const employee = await rrhh.tB_Empleados.findFirst({
        where: { ID_Empleado: data.ID_Empleado }
      });
      const requestInfo: requestMailInfo = {
        employee: employee?.Nombres + ' ' + employee?.Apellidos,
        destination: data.Destino + ', ' + data.Ciudad.Nombre,
        purpose: data.Motivo,
        departureDate: moment.utc(data.Fecha).format('DD/MM/YYYY'),
        requestId: new_request.ID_Solicitud.toString()
      }

      const boss: any = await rrhh.$queryRaw`
        SELECT tc.Email
        FROM v_listado_empleados vle
        INNER JOIN TB_Contactos tc ON tc.ID_Empleado = vle.ID_Jefe
        WHERE vle.ID_Empleado = ${data.ID_Empleado};
      `;
      
      //sendMail(boss[0].Email, requestInfo)
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error creating request:', error);
    return error;
  }
}

export async function updateRequest(data: any) {
  const { ID_Solicitud, pastVehicle, ...updateData } = data;
  try {
    const updated_request = await prisma.tB_Solicitudes.update({
      where: { ID_Solicitud: data.ID_Solicitud },
      data: updateData
    });

    const usedVehicleState = await prisma.tB_Estado_Vehiculo.findFirst({
      where: { Estado_Vehiculo:  'En Uso' }
    });

    const availableVehicleState = await prisma.tB_Estado_Vehiculo.findFirst({
      where: { Estado_Vehiculo:  'Disponible' }
    });
    
    if(!usedVehicleState || !availableVehicleState) {
      throw new Error('Vehicle state not found');
    }

    if(pastVehicle) {
      await prisma.tB_Vehiculos.update({
        where: { ID_Vehiculo: pastVehicle },
        data: { ID_Estado_Vehiculo: availableVehicleState.ID_Estado_Vehiculo }
      });
    }

    const vehicle = await prisma.tB_Vehiculos.update({
      where: { ID_Vehiculo: data.ID_Vehiculo },
      data: { ID_Estado_Vehiculo: usedVehicleState.ID_Estado_Vehiculo }
    });

    if(updated_request && vehicle) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
}

export async function acceptRequest(id: string): Promise<boolean> {
  const requestState = await prisma.tB_Estado_Solicitudes.findFirst({ where: { Estado: 'Pendiente por admin' }});
  if(!requestState) {
    throw new Error('Request state not found');
  }

  try {
    const updated_request = await prisma.tB_Solicitudes.update({
      where: { ID_Solicitud: +id },
      data: { ID_Estado_Solicitud: requestState.ID_Estado_Solicitud }
    });

    if(updated_request) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error accepting request:', error);
    throw error;
  }
}