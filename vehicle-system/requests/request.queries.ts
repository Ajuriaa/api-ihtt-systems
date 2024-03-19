import { IAvailableForRequestQuery, IRequestQuery, IRequestsQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

export async function getRequests(): Promise<IRequestsQuery> {
  try {
    const requests = await prisma.tB_Solicitudes.findMany({
      where: { deleted_at: null },
      include: {
        TB_Pasajeros: true,
        TB_Conductores: true,
        TB_Estado_Solicitud: true,
        TB_Vehiculos: {include: { TB_Modelo: { include: { TB_Marca_Vehiculo: true }}}},
        TB_Tipo_Solicitudes: true,
        TB_Ciudad: true
      },
      orderBy: { Fecha: 'desc' }
    });

    const requestsWithEmployee = await Promise.all(requests.map(async (request) => {
      const empleado = await rrhh.tB_Empleados.findUnique({
        where: { ID_Empleado: request.ID_Empleado }
      });
      return { ...request, Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos };
    }));

    return { data: requestsWithEmployee };
  } catch (error) {
    console.error('Error retrieving requests info:', error);
    throw error;
  }
}

export async function getRequest(id: string): Promise<IRequestQuery> {
  try {
    const request = await prisma.tB_Solicitudes.findUniqueOrThrow({
      where: { ID_Solicitud: +id },
      include: {
        TB_Pasajeros: true,
        TB_Conductores: true,
        TB_Estado_Solicitud: true,
        TB_Vehiculos: {include: { TB_Modelo: { include: { TB_Marca_Vehiculo: true }}}},
        TB_Tipo_Solicitudes: true,
        TB_Ciudad: true
      }
    });

    const empleado = await rrhh.tB_Empleados.findUnique({
      where: { ID_Empleado: request.ID_Empleado }
    });

    const requestWithEmployee = {
      ...request,
      Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos
    };

    return { data: requestWithEmployee };
  } catch (error) {
    console.error('Error retrieving request info:', error);
    throw error;
  }
}

export async function availableForRequest(id: string): Promise<IAvailableForRequestQuery> {
  try {
    const request = await prisma.tB_Solicitudes.findUniqueOrThrow({
      where: { ID_Solicitud: +id },
      include: {
        TB_Conductores: true,
        TB_Estado_Solicitud: true,
        TB_Vehiculos: {include: { TB_Modelo: { include: { TB_Marca_Vehiculo: true }}}},
      }
    });

    let allVehicles = await prisma.tB_Vehiculos.findMany({
      where: { deleted_at: null, TB_Estado_Vehiculo: { Estado_Vehiculo: 'Disponible'}},
    });

    let allDrivers = await prisma.tB_Conductores.findMany({
      where: { deleted_at: null, TB_Solicitudes: { every: { TB_Estado_Solicitud:{ Estado: { not: 'Activo'}}}}}
    });

    if(request.TB_Conductores && !allDrivers.includes(request.TB_Conductores)) {
      allDrivers.push(request.TB_Conductores);
    }

    if(request.TB_Vehiculos && !allVehicles.includes(request.TB_Vehiculos)) {
      allVehicles.push(request.TB_Vehiculos);
    }

    const allStates = await prisma.tB_Estado_Solicitudes.findMany();

    return { vehicles: allVehicles, drivers: allDrivers, states: allStates };
  } catch (error) {
    console.error('Error retrieving request info:', error);
    throw error;
  }
}