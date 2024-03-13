import { config } from '.';
import * as sql from 'mssql';
import { IDriversQuery } from './interfaces/';

export async function getDrivers(): Promise<IDriversQuery> {
  try {
    const FIELDS = "ID_Conductor, Nombre";
    let  pool = await  sql.connect(config);
    let  result = await  pool.request().query(`SELECT ${FIELDS} from TB_Conductores`);
    return { data: result.recordset };
  }
  catch (error) {
    console.log(error);
    throw error;
  }
}