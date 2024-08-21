import { PrismaClient } from '../../prisma/client/supply';

const prisma = new PrismaClient();

export async function getEntryInvoices(): Promise<{ invoiceNumber: string, invoiceUrl:  string | null }[]> {
  try {
    const data = await prisma.entry.findMany({
      select: { invoiceNumber: true, invoiceUrl: true}
    });
    return data;
  } catch (error: any) {
    console.error('Error retrieving products info:', error);
    throw error;
  }
}
