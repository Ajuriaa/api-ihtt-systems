import { 
  IBrand, IDriver, IModel,
  IVehicle, IVehicleState, IVehicleType
} from ".";

export interface IDriversQuery {
  data: IDriver[];
}

export interface IVehiclesQuery {
  data: IVehicle[];
  maintenance: { id: number, kms: number };
}

export interface IVehicleQuery {
  data: IVehicle;
}

export interface IVehicleModelsQuery {
  data: IModel[];
}

export interface IVehicleStatusesQuery {
  data: IVehicleState[];
}

export interface IVehicleTypesQuery {
  data: IVehicleType[];
}

export interface IVehicleBrandsQuery {
  data: IBrand[];
}
