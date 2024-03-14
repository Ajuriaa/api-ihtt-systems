export interface IDriver {
  ID_Conductor: number;
  Nombre: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
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
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
  ID_Estado_Vehiculo: number;
  ID_Modelo: number;
}

export interface IModel {
  ID_Modelo: number;
  Modelo: string;
  ID_Marca_Vehiculo: number;
  ID_Tipo_Vehiculo: number;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IBrand {
  ID_Marca_Vehiculo: number;
  Marca: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IVehicleState {
  ID_Estado_Vehiculo: number;
  Estado_Vehiculo: string;
}

export interface ICity {
  ID_Ciudad: number;
  Nombre: string;
  Kms: number;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IRequest {
  ID_Solicitud: number;
  ID_Empleado: number;
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
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
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
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
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
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IFuelUnit {
  ID_Unidad_Combustible: number;
  Unidad: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IRequestState {
  ID_Estado_Solicitud: number;
  Estado: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IPassenger {
  ID_Pasajero: number;
  ID_Solicitud: number;
  ID_Empleado: number;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IRequestType {
  ID_Tipo_Solicitud: number;
  Tipo_Solicitud: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}

export interface IVehicleType {
  ID_Tipo_Vehiculo: number;
  Tipo_Vehiculo: string;
  Sistema_Fecha: Date;
  Sistema_Usuario: string | null;
}
