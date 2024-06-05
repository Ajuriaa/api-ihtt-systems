export interface IDriver {
  ID_Conductor: number;
  Nombre: string;
  Solicitudes_Finalizadas?: number;
  Disponible?: boolean;
  Sistema_Usuario?: string | null;
  Departamento?: string | null;
}

export interface IGasUnit {
  ID_Unidad_Combustible: number;
  Unidad: string;
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
  Color: string;
  Sistema_Usuario?: string | null;
  Departamento?: string | null;
  ID_Estado_Vehiculo: number;
  ID_Modelo: number;
}

export interface IMaintenance {
  ID_Mantenimiento: number;
  ID_Vehiculo: number;
  Kilometraje: number;
  Sistema_Usuario?: string | null;
  Tipo_Mantenimiento: string;
  Fecha: Date;
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
  Coordenadas: string;
}

export interface IRequest {
  ID_Solicitud: number;
  ID_Empleado: number;
  Nombre_Empleado?: string;
  Departamento?: string;
  Destino: string;
  Motivo: string;
  Fecha: Date;
  Hora_Salida: Date;
  Hora_Regreso: Date;
  ID_Ciudad: number;
  Pasajeros: string;
  ID_Vehiculo: number | null;
  ID_Estado_Solicitud: number;
  ID_Tipo_Solicitud: number;
  ID_Conductor: number | null;
}

export interface ILog {
  ID_Bitacora: number;
  ID_Vehiculo: number;
  ID_Conductor: number;
  ID_Ciudad: number | null;
  Departamento?: string | null;
  Sistema_Usuario?: string | null;
  Destino: string;
  Kilometraje_Entrada: number;
  Kilometraje_Salida: number;
  Hora_Salida: Date;
  Hora_Entrada: Date;
  Fecha: Date;
  Observaciones: string;
  Pasajeros: string;
  Llenados_Combustible?: IFuelRefill[];
}

export interface IFuelRefill {
  ID_Llenado_Combustible: number;
  ID_Bitacora: number;
  Cantidad: number;
  Estacion_Combustible: string;
  Kilometraje_Recarga: number;
  Fecha: Date;
  Numero_Factura: number;
  Numero_Orden: number;
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

export interface IUser {
  ID_Empleado: number;
  Nombres: string;
  Apellidos: string;
  ID_Estado: number;
}
