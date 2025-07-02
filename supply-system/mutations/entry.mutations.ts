import { PrismaClient } from '../../prisma/client/supply';
import { IBatch, IEntry, IProductEntry } from '../interfaces';

const prisma = new PrismaClient();

export async function createEntries(entry: IEntry, productsEntry: IProductEntry[], batchesInfo: IBatch[]) {

  try {
    const new_entry = await prisma.entry.create({ data: entry });

    if(new_entry) {
      const products_entry = productsEntry.map(product => {
        return {
          ...product,
          entryId: new_entry.id
        }
      });
      const batches = batchesInfo.map(batch => {
        batch.due = batch.due ? new Date(batch.due) : null;
        return {
          ...batch,
          entryId: new_entry.id
        }
      });

      const new_batches = await prisma.batch.createMany({ data: batches });
      const new_products_entry = await prisma.productEntry.createMany({ data: products_entry });

      if(new_batches && new_products_entry) {
        return true;
      }

      return false;
    }

    return false;
  } catch (error) {
    console.error('Error creating entries:', error);
    return error;
  }
}

export async function updateEntryInvoice(
  originalInvoiceNumber: string,
  newInvoiceNumber?: string,
  newInvoiceUrl?: string,
  systemUser?: string
) {
  try {
    // Find the entry by invoice number
    const existingEntry = await prisma.entry.findFirst({
      where: { invoiceNumber: originalInvoiceNumber }
    });

    if (!existingEntry) {
      return { success: false, message: 'Factura no encontrada' };
    }

    // Check if new invoice number already exists (if changing)
    if (newInvoiceNumber && newInvoiceNumber !== originalInvoiceNumber) {
      const duplicateEntry = await prisma.entry.findFirst({
        where: { invoiceNumber: newInvoiceNumber }
      });

      if (duplicateEntry) {
        return { success: false, message: 'Ya existe una factura con ese número' };
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (newInvoiceNumber) updateData.invoiceNumber = newInvoiceNumber;
    if (newInvoiceUrl) updateData.invoiceUrl = newInvoiceUrl;

    // Update the entry
    const updatedEntry = await prisma.entry.update({
      where: { id: existingEntry.id },
      data: updateData
    });

    // Create audit logs for changes
    const logs: any[] = [];

    if (newInvoiceNumber && newInvoiceNumber !== existingEntry.invoiceNumber) {
      logs.push({
        entryId: existingEntry.id,
        systemUser: systemUser || 'system',
        fieldChanged: 'Numero_Factura',
        oldValue: existingEntry.invoiceNumber,
        newValue: newInvoiceNumber,
        notes: 'Numero de factura actualizado'
      });
    }

    if (newInvoiceUrl && newInvoiceUrl !== existingEntry.invoiceUrl) {
      logs.push({
        entryId: existingEntry.id,
        systemUser: systemUser || 'system',
        fieldChanged: 'URL_Factura',
        oldValue: existingEntry.invoiceUrl || null,
        newValue: newInvoiceUrl,
        notes: 'Archivo de factura actualizado'
      });
    }

    // Create logs if there are changes
    if (logs.length > 0) {
      await prisma.entryEditLog.createMany({ data: logs });
    }

    return { success: true, data: updatedEntry };

  } catch (error) {
    console.error('Error updating entry invoice:', error);
    return { success: false, message: 'Error interno del servidor' };
  }
}
