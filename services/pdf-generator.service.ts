import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import { getBase64 } from './base64.helper';


export class PDFHelper {
  private isFirstPageDrawn = false;
  private image = '';
  private image2 = '';
  private finalY = 0;
  constructor() {}

  public async generatePDF(formattedData: any[], columns: string[], title: string, requestDate: string, deliverDate: string, department: string, id: number): Promise<ArrayBuffer> {
    this.isFirstPageDrawn = false;
    this.image = await getBase64('assets/pdf.jpg');
    this.image2 = await getBase64('assets/pdf2.jpg');
    const doc = new jsPDF('portrait');
    doc.setTextColor(40);
    const blue = '#88CFE0';

    autoTable(doc, {
      head: [columns],
      body: formattedData,
      margin: { top: 55, right: 10, bottom: 20, left: 20 },
      styles: { halign: 'center', valign: 'middle', fontSize: 8 },
      headStyles: { fillColor: blue },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        const pageSize = doc.internal.pageSize;

        // Header
        if (!this.isFirstPageDrawn) {
          data.settings.margin.top = 4;

          const departmentText = `UNIDAD QUE LO SOLICITA: ${department}`;
          const requestDateText = `FECHA DE SOLICITUD: ${requestDate}`;
          const deliverDateText = `FECHA DE ENTREGA: ${deliverDate}`;
          const centerX = pageSize.width / 2;

          doc.text(title, centerX - (doc.getTextWidth(title) / 2), 25);
          doc.addImage(this.image, 'JPEG', 20, 5, 40, 40);
          doc.addImage(this.image2, 'JPEG', pageSize.width-50, 7, 30, 30);
          doc.setFontSize(6);
          doc.text(id.toString(), pageSize.width - 15, 15);
          doc.text(departmentText, 22, 40);
          doc.text(requestDateText, 22, 45);
          doc.text(deliverDateText, 22, 50);

          this.isFirstPageDrawn = true;
        }

        // Left stripe
        const margin = 4;
        doc.setFillColor(blue);
        doc.rect(margin, margin, 10, pageSize.height-2*margin, 'F');

        this.finalY = data.cursor?.y || 95;

        // Add diagonal text if notFinished
        const notFinished = deliverDate === 'NO ENTREGADO';
        if (notFinished) {
          doc.setTextColor('red');
          doc.setFontSize(40);
          doc.setFont('bold');
          doc.saveGraphicsState();
          const text = "REQUISICION NO VALIDA\nPENDIENTE DE APROBACION";
          doc.text(text, pageSize.width / 2, pageSize.height / 2, { align: 'center', baseline: 'middle' });
          doc.restoreGraphicsState();
          doc.setTextColor(40); // Reset text color back
        }
      },
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    const footerHeight = doc.internal.pageSize.height - 7;

    const signatureY = this.finalY + 20;
    const rowHeight = 20;
    const labels = ['SOLICITADO', 'AUTORIZADO', 'RECIBIDO', 'ENTREGADO POR'];
    doc.setFontSize(6);

    if (signatureY + 2 * rowHeight > doc.internal.pageSize.height) {
      doc.addPage();
      const startY = 30;

      for (let i = 0; i < 2; i++) {
        const y = startY + i * rowHeight;
        doc.line(20, y, 80, y);
        doc.line(120, y, 180, y);
        doc.text(labels[i * 2], 20, y + 5);
        doc.text(labels[i * 2 + 1], 120, y + 5);
      }
    } else {
      const startY = signatureY;

      for (let i = 0; i < 2; i++) {
        const y = startY + i * rowHeight;
        doc.line(20, y, 80, y);
        doc.line(120, y, 180, y);
        doc.text(labels[i * 2], 50 - (doc.getTextWidth(labels[i * 2])/2), y + 5);
        doc.text(labels[i * 2 + 1], 150 - (doc.getTextWidth(labels[i * 2 + 1])/2), y + 5);
      }
    }

    // Footer
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text('Página ' + i + ' de ' + pageCount, doc.internal.pageSize.width - 35, footerHeight);
      doc.text('Lista generada el ' + moment().format('DD/MM/YYYY'), 25, footerHeight);
    }

    return doc.output('arraybuffer');
  }

  public async generateRequisitionsPDF(requisition: any, department: string): Promise<ArrayBuffer> {
    const id = requisition.id;
    const columns = ['No', 'Unidad de medida', 'Producto', 'Cantidad Solicitada','Cantidad Entregada'];
    const formattedSuppliers = this.formatRequisitionsForPDF(requisition);
    const requestDate = this.getDate(requisition.date);
    const deliverDate = requisition.outputs.length > 0 ? this.getDate(requisition.outputs[0].date) : 'NO ENTREGADO';
    return this.generatePDF(formattedSuppliers, columns, 'Requisición de Materiales Sección Proveeduría', requestDate, deliverDate, department, id);
  }

  public formatRequisitionsForPDF(requisition: any) {
    const productsRequisition = requisition.productsRequisition;
    let counter = 0;
    return productsRequisition.map((req: any) => {
      counter++;
      return [
        counter,
        req.product.unit,
        this.getName(req.product, requisition.outputs),
        req.requestedQuantity,
        req.quantity
      ];
    });
  }

  private getName(product: any, outputs: any[]): string {
    const output = outputs.find((output) => output.productId === product.id);

    return output && product.batched ? `${product.name} - ${output.startRange} - ${output.endRange}` : product.name;
  }

  private getDate(date: Date): string {
    return moment.utc(date).format('DD/MM/YYYY');
  }
}

