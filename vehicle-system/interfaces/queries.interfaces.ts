import { IDriver, IVehicle } from ".";

export interface IDriversQuery {
  data: IDriver[];
}

export interface IVehiclesQuery {
  data: IVehicle[];
  maintenance: { id: number, kms: number };
}
