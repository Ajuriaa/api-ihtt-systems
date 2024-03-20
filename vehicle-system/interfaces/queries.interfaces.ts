import { 
  IBrand, IDriver, IMaintenance, IModel, IRequest,
  IRequestState, IVehicle, IVehicleState, IVehicleType
} from ".";

export interface IDriversQuery {
  data: IDriver[];
}

export interface IDriverQuery {
  data: IDriver;
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

export interface IRequestsQuery {
  data: IRequest[];
}

export interface IMaintenanceQuery {
  data: IMaintenance[];
}

export interface IRequestStatusQuery {
  data: IRequestState[];
}

export interface IRequestQuery {
  data: IRequest;
}

export interface IAvailableForRequestQuery {
  vehicles: IVehicle[];
  drivers: IDriver[];
  states: IRequestState[];
}