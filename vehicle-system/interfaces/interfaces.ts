export interface IDriver {
  ID_Conductor: number;
  Nombre: string;
  Solicitudes_Finalizadas: number;
  Disponible: boolean;
}

export interface IVehicle {
  ID_Vehiculo: number;
  Placa: string;
  Kilometraje: number;
  Chasis: string;
  Motor: string;
  KPG: number;
  Imagen_URL: string;
  Anio: number;
  Kilometraje_Mantenimiento: number;
  Color: string;
  ID_Estado_Vehiculo: number;
  ID_Modelo: number;
}

export interface IModel {
  ID_Modelo: number;
  Modelo: string;
  ID_Marca_Vehiculo: number;
  ID_Tipo_Vehiculo: number;
}

export interface IBrand {
  ID_Marca_Vehiculo: number;
  Marca: string;
}

export interface IVehicleState {
  ID_Estado_Vehiculo: number;
  Estado_Vehiculo: string;
}

export interface ICity {
  ID_Ciudad: number;
  Nombre: string;
  Kms: number;
}

export interface IRequest {
  ID_Solicitud: number;
  ID_Empleado: number;
  Nombre_Empleado?: string;
  Destino: string;
  Motivo: string;
  Fecha: Date;
  Hora_Salida: Date;
  Hora_Regreso: Date;
  ID_Ciudad: number;
  ID_Vehiculo: number | null;
  ID_Estado_Solicitud: number;
  ID_Tipo_Solicitud: number;
  ID_Conductor: number | null;
}

export interface ILogs {
  ID_Bitacora: number;
  ID_Solicitud: number | null;
  ID_Vehiculo: number;
  Kilometraje_Entrada: number;
  Kilometraje_Salida: number;
  Hora_Salida: Date;
  Hora_Entrada: Date;
  Fecha: Date;
  Observaciones: string;
}

export interface IFuelRefill {
  ID_Llenado_Combustible: number;
  ID_Bitacora: number;
  Cantidad: number;
  Estacion_Combustible: string;
  Kilometraje_Recarga: number;
  Fecha: Date;
  Precio: number;
  ID_Unidad_Combustible: number;
}

export interface IFuelUnit {
  ID_Unidad_Combustible: number;
  Unidad: string;
}

export interface IRequestState {
  ID_Estado_Solicitud: number;
  Estado: string;
}

export interface IPassenger {
  ID_Pasajero: number;
  ID_Solicitud: number;
  ID_Empleado: number;
}

export interface IRequestType {
  ID_Tipo_Solicitud: number;
  Tipo_Solicitud: string;
}

export interface IVehicleType {
  ID_Tipo_Vehiculo: number;
  Tipo_Vehiculo: string;
}
