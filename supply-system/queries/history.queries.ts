import { PrismaClient } from '../../prisma/client/supply';
import { PrismaClient as rrhhPrisma } from '../../prisma/client/rrhh';
import { IHistoryQuery } from '../interfaces';

const prisma = new PrismaClient();
const rrhh = new rrhhPrisma();

export async function getHistoryInfo(): Promise<IHistoryQuery> {
  try {
    const entries = await prisma.entry.findMany({
      include: {
        supplier: true,
        productsEntry: {
          include: { product: { include: { group: true }}}
        },
        batches: true
      },
      orderBy: { date: 'desc' }
    });

    const outputs = await prisma.output.findMany({
      include: {
        product: { include: { group: true }},
        requisition: true
      },
      orderBy: { systemDate: 'desc' }
    });

    // Create a new array to store the updated data
    const updatedOutputs = await Promise.all(outputs.map(async (output) => {
      // Check if output.reason is 'requisicion' and requisition exists
      if (output.motive === 'requisicion' && output.requisition) {
        // Query the Area for each requisition's employeeId
        const info: { Area: string }[] = await rrhh.$queryRaw`
          SELECT Area FROM v_listado_empleados vle
          WHERE ID_Empleado = ${output.requisition.employeeId}
        `;

        // Add the department to the requisition object
        const updatedRequisition = {
          ...output.requisition,
          department: info[0]?.Area || 'Unknown' // Fallback in case no Area is found
        };

        // Return the updated output with the modified requisition
        return { ...output, requisition: updatedRequisition };
      } else {
        // If reason is not 'requisicion', return the output unchanged
        return output;
      }
    }));

    return { entries, outputs: updatedOutputs };
  } catch (error: any) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}
