import { 
  IBrand, ICity, IDriver, IGasUnit, ILog, IMaintenance, IModel, IRequest,
  IRequestState, IRequestType, IUser, IVehicle, IVehicleState, IVehicleType
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

export interface IVehicleLogQuery {
  data: ILog[];
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

export interface IVehicleInfo {
  kms: number;
  gas: number;
  cost: number;
  kpg: number;
  cpk: number;
}

export interface IVehicleInfoQuery {
  current: IVehicleInfo;
  last: IVehicleInfo;
  maintenance: { date: string, kms: number };
}

export interface IUsersQuery {
  data: IUser[];
}

export interface IGasUnitsQuery {
  data: IGasUnit[];
}

export interface IRequestsQuery {
  data: IRequest[];
}

export interface IRequestTypesQuery {
  data: IRequestType[];
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
  employees: IUser[];
}

export interface IRequestStatusQuery {
  data: IRequestState[];
}

export interface ICitiesQuery {
  data: ICity[];
}

export interface IDashboardQuery {
  vehiculo: Partial<IVehicle>;
  KilometrosRecorridos: number;
}