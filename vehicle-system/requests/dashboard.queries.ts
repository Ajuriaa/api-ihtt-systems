import { PrismaClient } from '../../prisma/client/vehicles';

const prisma = new PrismaClient();

export async function test(): Promise<any> {
  const fechaInicioMesActual = new Date();
  fechaInicioMesActual.setDate(1); // Establecer la fecha al primer día del mes actual

  const vehiculos = await prisma.tB_Vehiculos.findMany({
    select: {
      ID_Vehiculo: true,
      Placa: true,
      Kilometraje: true,
      Anio: true,
      Modelo: { include: { Marca_Vehiculo: true, Tipo_Vehiculo: true }},
      Bitacoras: {
        select: {
          Kilometraje_Entrada: true,
          Kilometraje_Salida: true,
          Fecha: true,
        },
        where: {
          Fecha: {
            gte: fechaInicioMesActual,
            lte: new Date(), // Fecha actual
          },
        },
      },
    },
  });

  // Calcular los kilómetros recorridos para cada vehículo
  const vehiculosConKilometraje = vehiculos.map(vehiculo => {
    let KilometrosRecorridos = 0;
    vehiculo.Bitacoras.forEach(bitacora => {
      KilometrosRecorridos += bitacora.Kilometraje_Entrada - bitacora.Kilometraje_Salida;
    });
    return {
      vehiculo,
      KilometrosRecorridos,
    };
  });

  // Ordenar los vehículos por kilómetros recorridos y obtener los tres primeros
  const top3Vehiculos = vehiculosConKilometraje.sort((a, b) => b.KilometrosRecorridos - a.KilometrosRecorridos).slice(0, 3);

  return top3Vehiculos;
}