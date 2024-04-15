import { IAvailableForRequestQuery, IRequestQuery, IRequestsQuery, IRequestTypesQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

export async function getRequests(): Promise<IRequestsQuery> {
  try {
    const requests = await prisma.tB_Solicitudes.findMany({
      where: { deleted_at: null },
      include: {
        Conductor: true,
        Estado_Solicitud: true,
        Vehiculo: {include: { Modelo: { include: { Marca_Vehiculo: true }}}},
        Tipo_Solicitud: true,
        Ciudad: true
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
        Conductor: true,
        Estado_Solicitud: true,
        Vehiculo: {include: { Modelo: { include: { Marca_Vehiculo: true }}}},
        Tipo_Solicitud: true,
        Ciudad: true
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

export async function getRequestTypes(): Promise<IRequestTypesQuery> {
  try {
    const types = await prisma.tB_Tipo_Solicitudes.findMany();

    return { data: types };
  } catch (error) {
    console.error('Error retrieving request info:', error);
    throw error;
  }
}

export async function availableForRequest(id: string): Promise<IAvailableForRequestQuery> {
  try {
    const request = await prisma.tB_Solicitudes.findUnique({
      where: { ID_Solicitud: +id },
      include: {
        Conductor: true,
        Estado_Solicitud: true,
        Vehiculo: {
          include: { 
            Mantenimientos: {
              orderBy: { Fecha: 'desc' }
            },
            Bitacoras: {
              include: { Conductor: true },
              orderBy: { Fecha: 'desc' }
            },
            Estado_Vehiculo: true,
            Modelo: { include: { 
              Marca_Vehiculo: true,
              Tipo_Vehiculo: true
            }
          }}
        },
      }
    });

    let allVehicles = await prisma.tB_Vehiculos.findMany({
      where: { deleted_at: null, Estado_Vehiculo: { Estado_Vehiculo: 'Disponible'}},
      include: { 
        Mantenimientos: {
          orderBy: { Fecha: 'desc' }
        },
        Bitacoras: {
          include: { Conductor: true },
          orderBy: { Fecha: 'desc' }
        },
        Estado_Vehiculo: true,
        Modelo: { include: { 
          Marca_Vehiculo: true,
          Tipo_Vehiculo: true
        }
      }}
    });

    let allDrivers = await prisma.tB_Conductores.findMany({
      where: { deleted_at: null, Solicitudes: { every: { Estado_Solicitud:{ Estado: { not: 'Activo'}}}}}
    });

    if(request && request.Conductor && !allDrivers.includes(request.Conductor)) {
      allDrivers.push(request.Conductor);
    }

    if(request && request.Vehiculo && !allVehicles.includes(request.Vehiculo)) {
      allVehicles.push(request.Vehiculo);
    }

    const users = await rrhh.tB_Empleados.findMany({ where: { ID_Estado: 1, ID_Empleado: { not: 0 }}});

    return { vehicles: allVehicles, drivers: allDrivers, employees: users };
  } catch (error) {
    console.error('Error retrieving request info:', error);
    throw error;
  }
}