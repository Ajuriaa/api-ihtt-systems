import { config } from '../config';
import { IDriversQuery } from '../interfaces';
import * as sql from 'mssql';

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