import {
  IVehicleBrandsQuery, IVehicleInfoQuery, IVehicleModelsQuery, IVehicleQuery,
  IVehicleStatusesQuery, IVehicleTypesQuery, IVehiclesQuery
} from '../interfaces';
import { PrismaClient } from '../../prisma/client/vehicles';
import { getArea } from './reusable';
import moment from 'moment';

const prisma = new PrismaClient();

export async function getVehicle(id: string): Promise<IVehicleQuery> {
  try {
    const vehicle = await prisma.tB_Vehiculos.findUniqueOrThrow({ 
      where: { ID_Vehiculo: +id },
      include: {
        Solicitudes: { include: { Ciudad: true }, orderBy: { Fecha: 'desc' } },
        Estado_Vehiculo: true,
        Modelo: {
          include: {
            Marca_Vehiculo: true,
            Tipo_Vehiculo: true
          }
        },
        Bitacoras: {
          orderBy: { Fecha: 'desc' },
          include: {
            Llenados_Combustible: {
              include: { Unidad_Combustible: true }
            },
            Conductor: true,
            Ciudad: true
          }
        }
      }
    });
    return { data: vehicle };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicles(username: string): Promise<IVehiclesQuery> {
  try {
    const area = await getArea(username);
    const maintenance: [{id: number, kms: number}]= await prisma.$queryRaw`
      SELECT TOP 1 v.ID_Vehiculo AS id, 
        (m.Kilometraje + 5000) - v.Kilometraje AS kms
      FROM TB_Vehiculos v
      JOIN TB_Mantenimientos m ON v.ID_Vehiculo = m.ID_Vehiculo
      WHERE v.deleted_at IS NULL AND v.Departamento = ${area}
        AND m.Tipo_Mantenimiento = 'Preventivo'
        AND m.Kilometraje = (
          SELECT MAX(Kilometraje) FROM TB_Mantenimientos 
          WHERE ID_Vehiculo = v.ID_Vehiculo AND Fecha <= GETDATE()
        )
      ORDER BY (m.Kilometraje + 5000) - v.Kilometraje ASC;
    `;
    const vehicles = await prisma.tB_Vehiculos.findMany({
      where: { deleted_at: null, Departamento: area },
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
    return { data: vehicles, maintenance: maintenance[0] };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleModels(): Promise<IVehicleModelsQuery> {
  try {
    const models = await prisma.tB_Modelo.findMany({
      include: {
        Marca_Vehiculo: true,
        Tipo_Vehiculo: true
      }
    });
    return { data: models };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleStatuses(): Promise<IVehicleStatusesQuery> {
  try {
    const status = await prisma.tB_Estado_Vehiculo.findMany();
    return { data: status };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleTypes(): Promise<IVehicleTypesQuery> {
  try {
    const status = await prisma.tB_Tipo_Vehiculo.findMany();
    return { data: status };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleBrands(): Promise<IVehicleBrandsQuery> {
  try {
    const brands = await prisma.tB_Marca_Vehiculo.findMany();
    return { data: brands };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}

export async function getVehicleInfo(vehicleId: string, start: string, end: string): Promise<IVehicleInfoQuery> {
  try {
    const startDate = moment.utc(start).format("YYYY-MM-DD");
    const endDate = moment.utc(end).format("YYYY-MM-DD");
    const kmsHistory: { month: string, kms: number }[] = await prisma.$queryRaw`
    DECLARE @VehicleId INT = ${vehicleId};
    WITH Meses AS (
    SELECT TOP 5 DATEADD(MONTH, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), DATEADD(DAY, 1, EOMONTH(GETDATE()))) AS month
    FROM sys.objects
    )
    SELECT
      FORMAT(M.month, 'MMMM') AS month,
      COALESCE(SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida), 0) AS kms
    FROM Meses M
    LEFT JOIN TB_Bitacoras b ON MONTH(b.Fecha) = MONTH(M.month) AND YEAR(b.Fecha) = YEAR(M.month) AND b.ID_Vehiculo = @VehicleId
    GROUP BY M.month
    ORDER BY M.month;
    `;

    const maintenance: any = await prisma.$queryRaw`
    DECLARE @VehicleId INT = ${vehicleId};
    SELECT
      (SELECT MAX(Fecha) FROM TB_Mantenimientos WHERE ID_Vehiculo = @VehicleId AND Tipo_Mantenimiento = 'Preventivo') AS date,
      (SELECT TOP 1 (m.Kilometraje + 5000) - v.Kilometraje
      FROM TB_Mantenimientos m
      JOIN TB_Vehiculos v ON m.ID_Vehiculo = v.ID_Vehiculo
      WHERE m.ID_Vehiculo = @VehicleId AND m.Tipo_Mantenimiento = 'Preventivo' AND m.Kilometraje + 5000 > v.Kilometraje 
      ORDER BY m.Fecha DESC) AS km
    `;

    const last: any= await prisma.$queryRaw`
    DECLARE @VehicleId INT = ${vehicleId};
    SELECT 
      COALESCE(
        SUM(CASE WHEN DATEPART(year, b.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, b.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN b.Kilometraje_Entrada - b.Kilometraje_Salida ELSE 0 END), 
        0
      ) AS kms,
      COALESCE(
        ROUND(
          SUM(CASE WHEN DATEPART(year, lc.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, lc.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN CASE WHEN uc.Unidad = 'Litro' THEN lc.Cantidad * 0.264172 ELSE lc.Cantidad END ELSE 0 END), 
          2
        ), 0) AS gas,
      COALESCE(
        ROUND(
          SUM(CASE WHEN DATEPART(year, lc.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, lc.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN lc.Precio ELSE 0 END), 
          2
        ), 0) AS cost,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN DATEPART(year, b.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, b.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN b.Kilometraje_Entrada - b.Kilometraje_Salida ELSE 0 END), 0) <= 0 THEN 0 
        ELSE ROUND(COALESCE(SUM(CASE WHEN DATEPART(year, b.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, b.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN b.Kilometraje_Entrada - b.Kilometraje_Salida ELSE 0 END), 0) / 
          COALESCE(SUM(CASE WHEN DATEPART(year, lc.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, lc.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN CASE WHEN uc.Unidad = 'Litro' THEN lc.Cantidad * 0.264172 ELSE lc.Cantidad END ELSE 1 END), 0), 2) 
      END AS kpg,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN DATEPART(year, b.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, b.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN b.Kilometraje_Entrada - b.Kilometraje_Salida ELSE 0 END), 0) <= 0 THEN 0 
        ELSE ROUND(COALESCE(SUM(CASE WHEN DATEPART(year, lc.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, lc.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN lc.Precio ELSE 0 END), 0) / 
          COALESCE(SUM(CASE WHEN DATEPART(year, b.Fecha) = DATEPART(year, DATEADD(month, -1, GETDATE())) AND DATEPART(month, b.Fecha) = DATEPART(month, DATEADD(month, -1, GETDATE())) THEN b.Kilometraje_Entrada - b.Kilometraje_Salida ELSE 0 END), 0), 2) 
      END AS cpk
      FROM TB_Bitacoras b
      JOIN TB_Vehiculos v ON b.ID_Vehiculo = v.ID_Vehiculo
      LEFT JOIN TB_Llenado_Combustible lc ON b.ID_Bitacora = lc.ID_Bitacora
      LEFT JOIN TB_Unidad_Combustible uc ON lc.ID_Unidad_Combustible  = uc.ID_Unidad_Combustible 
      WHERE 
        b.ID_Vehiculo = @VehicleId
        AND (
          (b.Fecha >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 1, 0) AND b.Fecha < DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) OR -- Mes pasado
          (lc.Fecha >= DATEADD(month, DATEDIFF(month, 0, GETDATE()) - 1, 0) AND lc.Fecha < DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)) -- Mes pasado
        )
    `;
    
    const current: any= await prisma.$queryRaw`
    DECLARE @VehicleId INT = ${vehicleId};
    SELECT
    COALESCE(
      CASE 
        WHEN SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida) <= 0 THEN 0 
        ELSE SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida) 
      END, 0) AS kms,
    COALESCE(
      ROUND(SUM(CASE WHEN uc.Unidad = 'Litro' THEN lc.Cantidad * 0.264172 ELSE lc.Cantidad END), 2), 0) AS gas,
    COALESCE(
      ROUND(SUM(lc.Precio), 2), 0) AS cost,
    COALESCE(
      CASE 
        WHEN SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida) <= 0 THEN 0 
        ELSE ROUND(SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida) / 
          SUM(CASE WHEN uc.Unidad = 'Litro' THEN lc.Cantidad * 0.264172 ELSE lc.Cantidad END), 2) 
      END, 0) AS kpg,
    COALESCE(
      CASE 
        WHEN SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida) <= 0 THEN 0 
        ELSE ROUND(SUM(lc.Precio) / SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida), 2) 
      END, 0) AS cpk
    FROM TB_Bitacoras b
    LEFT JOIN TB_Vehiculos v ON b.ID_Vehiculo = v.ID_Vehiculo
    LEFT JOIN TB_Llenado_Combustible lc ON b.ID_Bitacora = lc.ID_Bitacora
    LEFT JOIN TB_Unidad_Combustible uc ON lc.ID_Unidad_Combustible  = uc.ID_Unidad_Combustible 
    WHERE b.ID_Vehiculo = @VehicleId
      AND b.Fecha >= ${startDate}
      AND b.Fecha < ${endDate}
      AND (lc.Fecha >= ${startDate} OR lc.Fecha IS NULL)
      AND (lc.Fecha < ${endDate} OR lc.Fecha IS NULL);
    `;

    const kms = kmsHistory.map(h => h.kms);
    const months = kmsHistory.map(h => h.month);
    const history: { months: string[], kms: number[] } = { months, kms };
    
    return { maintenance: maintenance[0], current: current[0], last: last[0], history };
  } catch (error) {
    console.error('Error retrieving vehicle info:', error);
    throw error;
  }
}