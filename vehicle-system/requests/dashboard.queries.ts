import { PrismaClient } from "../../prisma/client/vehicles";
import { IVehicle } from "../interfaces";
import { getArea } from "./reusable";

interface monthData {
  gas: number;
  cost: number;
  kms: number;
  request: number;
  trips: number;
}

interface IDashboardQuery {
  current_month: monthData;
  last_month: monthData;
  kms: { month: string; kms: number }[];
  cities: { city: string; trips: number }[];
  vehicle: IVehicle;
  cost: { month: string; cost: number }[];
}

const prisma = new PrismaClient();

export async function dashboardQuery(username: string): Promise<IDashboardQuery | number> {
  try {
    const area = await getArea(username);
    const current: any = await prisma.$queryRaw`
      WITH GasCostKms AS (
      SELECT
        COALESCE(SUM(CASE WHEN UC.Unidad = 'Galon' THEN LC.Cantidad ELSE LC.Cantidad * 0.264172 END), 0) AS gas,
        COALESCE(SUM(LC.Precio), 0) AS cost,
        COALESCE(SUM(B.Kilometraje_Entrada - B.Kilometraje_Salida), 0) AS kms
      FROM
        TB_Bitacoras B
      LEFT JOIN
        TB_Llenado_Combustible LC ON B.ID_Bitacora = LC.ID_Bitacora
      LEFT JOIN
        TB_Unidad_Combustible UC ON LC.ID_Unidad_Combustible = UC.ID_Unidad_Combustible
      WHERE
        B.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
        AND B.Fecha <= GETDATE()
        AND B.Departamento = ${area}
      ),
      RequestsTrips AS (
        SELECT
          COALESCE(COUNT(DISTINCT S.ID_Solicitud), 0) AS requests,
          COALESCE(COUNT(DISTINCT CASE WHEN ES.Estado IN ('Activo', 'Finalizada') THEN S.ID_Solicitud END), 0) AS trips
        FROM
          TB_Solicitudes S
        LEFT JOIN
          TB_Estado_Solicitudes ES ON S.ID_Estado_Solicitud = ES.ID_Estado_Solicitud
        WHERE
          S.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
          AND S.Fecha <= GETDATE()
          AND S.Departamento = ${area}
      )
      SELECT * FROM GasCostKms, RequestsTrips;
    `;

    const last: any = await prisma.$queryRaw`
      WITH GasCostKms AS (
      SELECT 
        COALESCE(SUM(CASE WHEN UC.Unidad = 'Galon' THEN LC.Cantidad ELSE LC.Cantidad * 0.264172 END), 0) AS gas,
        COALESCE(SUM(LC.Precio), 0) AS cost,
        COALESCE(SUM(B.Kilometraje_Entrada - B.Kilometraje_Salida), 0) AS kms
      FROM 
        TB_Bitacoras B
      LEFT JOIN 
        TB_Llenado_Combustible LC ON B.ID_Bitacora = LC.ID_Bitacora
      LEFT JOIN 
        TB_Unidad_Combustible UC ON LC.ID_Unidad_Combustible = UC.ID_Unidad_Combustible
      WHERE 
        B.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH, -1, GETDATE())), 0) 
        AND B.Fecha < DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
        AND B.Departamento = ${area}
      ),
      RequestsTrips AS (
        SELECT 
          COALESCE(COUNT(DISTINCT S.ID_Solicitud), 0) AS requests,
          COALESCE(COUNT(DISTINCT CASE WHEN ES.Estado IN ('Activo', 'Finalizada') THEN S.ID_Solicitud END), 0) AS trips
        FROM 
          TB_Solicitudes S
        LEFT JOIN 
          TB_Estado_Solicitudes ES ON S.ID_Estado_Solicitud = ES.ID_Estado_Solicitud
        WHERE 
          S.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, DATEADD(MONTH, -1, GETDATE())), 0) 
          AND S.Fecha < DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
          AND S.Departamento = ${area}
      )
      SELECT * FROM GasCostKms, RequestsTrips;
    `;

    const kms: any = await prisma.$queryRaw`
      WITH Meses AS (
      SELECT TOP 3 DATEADD(MONTH, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), DATEADD(DAY, 1, EOMONTH(GETDATE()))) AS month
      FROM sys.objects
      )
      SELECT
        FORMAT(M.month, 'MMMM') AS month,
        COALESCE(SUM(b.Kilometraje_Entrada - b.Kilometraje_Salida), 0) AS kms
      FROM 
        Meses M
      LEFT JOIN 
        TB_Bitacoras b ON MONTH(b.Fecha) = MONTH(M.month) AND YEAR(b.Fecha) = YEAR(M.month) AND b.Departamento = ${area}
      GROUP BY 
        M.month
      ORDER BY 
        M.month;
    `;

    const cities: any = await prisma.$queryRaw`
      SELECT 
        C.Nombre AS city,
        COALESCE(COUNT(B.ID_Ciudad), 0) AS trips
      FROM 
        TB_Bitacoras B
      LEFT JOIN 
        TB_Ciudades C ON B.ID_Ciudad = C.ID_Ciudad
      WHERE 
        B.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) 
        AND B.Fecha <= GETDATE()
        AND B.Departamento = ${area}
      GROUP BY 
        C.Nombre;
    `;

    const vehicleId: { ID_Vehiculo: number }[] = await prisma.$queryRaw`
      SELECT TOP 1
        V.ID_Vehiculo
      FROM
        TB_Bitacoras B
      JOIN
        TB_Vehiculos V ON B.ID_Vehiculo = V.ID_Vehiculo
      WHERE
        B.Fecha >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) 
        AND B.Fecha <= GETDATE()
        AND B.Departamento = ${area}
      GROUP BY
        V.ID_Vehiculo
      ORDER BY
        SUM(B.Kilometraje_Entrada - B.Kilometraje_Salida) DESC;
    `;

    if (!vehicleId.length) {
      return 0;
    }

    const vehicle  = await prisma.tB_Vehiculos.findUniqueOrThrow({ 
      where: { ID_Vehiculo: vehicleId[0].ID_Vehiculo },
      include: {
        Modelo: {include: { Marca_Vehiculo: true, Tipo_Vehiculo: true }},
      }
    });

    const cost: any = await prisma.$queryRaw`
      SELECT month, cost
      FROM (
        SELECT
          FORMAT(M.month, 'MMMM') AS month,
          COALESCE(SUM(LC.Precio), 0) AS cost,
          COUNT(*) OVER () AS TotalFilas,
          ROW_NUMBER() OVER (ORDER BY M.month) AS RowNum
        FROM
          (
          SELECT TOP 3 DATEADD(MONTH, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), DATEADD(DAY, 1, EOMONTH(GETDATE()))) AS month
          FROM sys.objects
          ) M
        LEFT JOIN
          TB_Bitacoras B ON MONTH(B.Fecha) = MONTH(M.month) AND YEAR(B.Fecha) = YEAR(M.month) AND B.Departamento = ${area}
        LEFT JOIN
          TB_Llenado_Combustible LC ON B.ID_Bitacora = LC.ID_Bitacora
          AND M.month != DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) -- Excluir el mes actual
        GROUP BY
          M.month
        ) AS Subquery
        WHERE RowNum < TotalFilas
        UNION ALL
        SELECT
          FORMAT(GETDATE(), 'MMMM') AS month,
          COALESCE(SUM(LC.Precio), 0) AS cost
        FROM
          TB_Bitacoras B
        JOIN
          TB_Llenado_Combustible LC ON B.ID_Bitacora = LC.ID_Bitacora
        WHERE
          MONTH(B.Fecha) = MONTH(GETDATE()) AND YEAR(B.Fecha) = YEAR(GETDATE());
    `;

    const current_month = current[0];
    const last_month = last[0];

    return { current_month, last_month, kms, cities, vehicle, cost };
  } catch (error) {
    console.error("Error retrieving dashboard info:", error);
    throw error;
  }
}
