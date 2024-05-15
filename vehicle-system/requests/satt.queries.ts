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
        TB_Solicitudes.Hora_Regreso
      FROM TB_Solicitudes
      JOIN IHTT_RRHH.dbo.v_listado_empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.v_listado_empleados.ID_Empleado
      JOIN TB_Ciudades ON TB_Solicitudes.ID_Ciudad = TB_Ciudades.ID_Ciudad
      JOIN IHTT_RRHH.dbo.TB_Empleados ON TB_Solicitudes.ID_Empleado = IHTT_RRHH.dbo.TB_Empleados.ID_Empleado
      WHERE IHTT_RRHH.dbo.v_listado_empleados.ID_Jefe = @BossId AND TB_Solicitudes.ID_Estado_Solicitud = 1;
    `;

    return { data: requests };
  } catch (error) {
    console.error('Error retrieving requests info:', error);
    throw error;
  }
}