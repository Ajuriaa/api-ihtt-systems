import { PrismaClient } from '../../prisma/client/vehicles';

const prisma = new PrismaClient();

export async function getRequestByBoss(id: string): Promise<any> {
  try {
    const requests = await prisma.$queryRaw`
      DECLARE @BossId INT = ${id};
      SELECT
        TB_Solicitudes.ID_Solicitud as id,
        TB_Ciudades.Nombre as Ciudad,
        TB_Solicitudes.Motivo,
        TB_Solicitudes.Destino,
        CONCAT(IHTT_RRHH.dbo.TB_Empleados.Nombres, ' ', IHTT_RRHH.dbo.TB_Empleados.Apellidos) as Empleado,
        TB_Solicitudes.Fecha,
        TB_Solicitudes.Hora_Salida,
        TB_Solicitudes.Hora_Regreso,
        tes.Estado as Estado
      FROM TB_Solicitudes
      JOIN IHTT_RRHH.dbo.v_listado_empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.v_listado_empleados.ID_Empleado
      JOIN TB_Ciudades ON TB_Solicitudes.ID_Ciudad = TB_Ciudades.ID_Ciudad
      JOIN IHTT_RRHH.dbo.TB_Empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.TB_Empleados.ID_Empleado
      JOIN TB_Estado_Solicitudes tes ON TB_Solicitudes.ID_Estado_Solicitud = tes.ID_Estado_Solicitud
      WHERE IHTT_RRHH.dbo.v_listado_empleados.ID_Jefe = @BossId;
    `;

    return { data: requests };
  } catch (error) {
    console.error('Error retrieving requests info:', error);
    throw error;
  }
}

export async function getUserRequestList(id: string): Promise<any> {
  try {
    const requests = await prisma.$queryRaw`
      DECLARE @UserId INT = ${id};
      SELECT
        TB_Solicitudes.ID_Solicitud as id,
        TB_Ciudades.Nombre as Ciudad,
        TB_Solicitudes.Motivo,
        TB_Solicitudes.Destino,
        CONCAT(IHTT_RRHH.dbo.TB_Empleados.Nombres, ' ', IHTT_RRHH.dbo.TB_Empleados.Apellidos) as Empleado,
        TB_Solicitudes.Fecha,
        TB_Solicitudes.Hora_Salida,
        TB_Solicitudes.Hora_Regreso,
        tes.Estado as Estado
      FROM TB_Solicitudes
      JOIN IHTT_RRHH.dbo.v_listado_empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.v_listado_empleados.ID_Empleado
      JOIN TB_Ciudades ON TB_Solicitudes.ID_Ciudad = TB_Ciudades.ID_Ciudad
      JOIN IHTT_RRHH.dbo.TB_Empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.TB_Empleados.ID_Empleado
      JOIN TB_Estado_Solicitudes tes ON TB_Solicitudes.ID_Estado_Solicitud = tes.ID_Estado_Solicitud
      WHERE TB_Solicitudes.ID_Empleado = @UserId;
    `;

    return { data: requests };
  } catch (error) {
    console.error('Error retrieving requests info:', error);
    throw error;
  }
}
