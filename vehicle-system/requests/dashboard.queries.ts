import { PrismaClient } from '../../prisma/client/vehicles';
import { IDashboardQuery } from '../interfaces';

const prisma = new PrismaClient();

export async function test(): Promise<IDashboardQuery[]> {
  const fechaInicioMesActual = new Date();
  fechaInicioMesActual.setDate(1);

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

  const top3Vehiculos = vehiculosConKilometraje.sort((a, b) => b.KilometrosRecorridos - a.KilometrosRecorridos).slice(0, 3);

  return top3Vehiculos;
}