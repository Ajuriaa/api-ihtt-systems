class  Inventory {
  constructor(Nombre_Articulo, Descripcion, Unidad, Cantidad, Cantidad_Minima){
    this.Nombre_Articulo = Nombre_Articulo;
    this.Descripcion = Descripcion;
    this.Unidad = Unidad;
    this.Cantidad = Cantidad;
    this.Cantidad_Minima = Cantidad_Minima;
  }
}

module.exports = Inventory;