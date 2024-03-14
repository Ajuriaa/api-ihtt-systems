import { IBrand, IDriver, IModel, IVehicle } from ".";

export interface IDriversQuery {
  data: IDriver[];
}

export interface IVehiclesQuery {
  data: IVehicle[];
  maintenance: { id: number, kms: number };
}

export interface IVehicleModelsQuery {
  data: IModel[];
}

export interface IVehicleBrandsQuery {
  data: IBrand[];
}
