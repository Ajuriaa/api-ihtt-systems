import { config } from '../config';
import { IDriversQuery, IVehiclesQuery } from '../interfaces';
import * as sql from 'mssql';

export async function getDrivers(): Promise<IDriversQuery> {
  const QUERY = "SELECT ID_Conductor, Nombre from TB_Conductores";
  try {
    let  pool = await  sql.connect(config);
    let  result = await  pool.request().query(QUERY);
    return { data: result.recordset };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getVehicles(): Promise<IVehiclesQuery> {
  const QUERY = `
    SELECT
      V.ID_Vehiculo,
      V.Placa,
      V.Kilometraje,
      V.Chasis,
      V.Motor,
      V.KPG,
      V.Imagen_URL,
      V.Anio,
      V.Kilometraje_Mantenimiento,
      V.Color,
      M.Modelo,
      MV.Marca
    FROM
      TB_Vehiculos V
    INNER JOIN
      TB_Modelo M ON V.ID_Modelo = M.ID_Modelo
    INNER JOIN
      TB_Marca_Vehiculo MV ON M.ID_Marca_Vehiculo = MV.ID_Marca_Vehiculo;
  `
  try {
    let  pool = await  sql.connect(config);
    let  result = await  pool.request().query(QUERY);
    return { data: result.recordset };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}