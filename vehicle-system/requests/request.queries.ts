import { IAvailableForRequestQuery, IRequestQuery, IRequestsQuery, IRequestStatusQuery, IRequestTypesQuery } from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';
import { getArea } from './reusable';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

export async function getRequests(username: string): Promise<IRequestsQuery> {
  try {
    const area = await getArea(username);
    const requests = await prisma.tB_Solicitudes.findMany({
      where: { deleted_at: null, Departamento: area },
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

      const Departamento: any = await rrhh.$queryRaw`
        SELECT A.DESC_Area
        FROM TB_Empleado_Area_Cargo EAC
        JOIN TB_Areas A ON EAC.id_area = A.id_area
        WHERE EAC.id_empleado = 1321;
      `
      return { ...request, Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos, Departamento: Departamento[0].DESC_Area };
    }));

    return { data: requestsWithEmployee };
  } catch (error) {
    console.error('Error retrieving requests info:', error);
    throw error;
  }
}

export async function getVehicleRequests(vehicleId: string): Promise<IRequestsQuery> {
  try {
    const requests = await prisma.tB_Solicitudes.findMany({
      where: { deleted_at: null, ID_Vehiculo: +vehicleId },
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
      const Departamento: any = await rrhh.$queryRaw`
        SELECT A.DESC_Area
        FROM TB_Empleado_Area_Cargo EAC
        JOIN TB_Areas A ON EAC.id_area = A.id_area
        WHERE EAC.id_empleado = 1321;
      `
      return { ...request, Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos, Departamento: Departamento[0].DESC_Area };
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

    const passengers = await rrhh.tB_Empleados.findMany({
      where: { ID_Empleado: { in: request.Pasajeros.split(',').map(Number) }}
    });

    const passengerNames = passengers.map((passenger) => passenger.Nombres + ' ' + passenger.Apellidos).join(', ');
    const Departamento: any = await rrhh.$queryRaw`
      SELECT A.DESC_Area
      FROM TB_Empleado_Area_Cargo EAC
      JOIN TB_Areas A ON EAC.id_area = A.id_area
      WHERE EAC.id_empleado = 1321;
    `

    const requestWithEmployee = {
      ...request,
      Nombre_Empleado: empleado?.Nombres + ' ' + empleado?.Apellidos,
      Nombres_Pasajeros: passengerNames,
      Departamento: Departamento[0].DESC_Area
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

    const allVehicles = await prisma.tB_Vehiculos.findMany({
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

    const allDrivers = await prisma.tB_Conductores.findMany({
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

export async function getResquestStatus(): Promise<IRequestStatusQuery> {
  try {
    const status = await prisma.tB_Estado_Solicitudes.findMany();

    return { data: status };
  } catch (error) {
    console.error('Error retrieving request status info:', error);
    throw error;
  }
}