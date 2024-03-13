export interface IDriver {
  ID_Conductor: string;
  Nombre: string;
}

export interface IVehicle {
  ID_Vehiculo: string;
  Placa: string;
  Kilometraje: number;
  Chasis: string;
  Motor: string;
  KPG: number;
  Imagen_Url: string;
  Anio: number;
  Kilometraje_Mantenimiento: number;
  Color: string;
  Modelo: string;
  Marca: string;
}
