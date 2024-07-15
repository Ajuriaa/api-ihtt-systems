import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import { getBase64 } from './base64.helper';


export class PDFHelper {
  private isFirstPageDrawn = false;
  private image = '';
  private image2 = '';
  constructor() {}

  public async generatePDF(formattedData: any[], columns: string[], title: string, requestDate: string, deliverDate: string, department: string): Promise<ArrayBuffer> {
    this.isFirstPageDrawn = false;
    this.image = await getBase64('assets/pdf.jpg');
    this.image2 = await getBase64('assets/pdf2.jpg');
    const doc = new jsPDF('portrait');
    doc.setTextColor(40);
    const blue = '#88CFE0';

    autoTable(doc, {
      head: [columns],
      body: formattedData,
      margin: { top: 65, right: 10, bottom: 20, left: 20 },
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
          doc.text(departmentText, 22, 44);
          doc.rect(20, 40, pageSize.width - 30, 6);
          doc.text(requestDateText, 22, 52);
          doc.rect(20, 48, pageSize.width - 30, 6);
          doc.text(deliverDateText, 22, 60);
          doc.rect(20, 56, pageSize.width - 30, 6);

          this.isFirstPageDrawn = true;
        }

        // Left stripe
        const margin = 4;
        doc.setFillColor(blue);
        doc.rect(margin, margin, 10, pageSize.height-2*margin, 'F');
      },
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    const footerHeight = doc.internal.pageSize.height - 7;

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
    const columns = ['No', 'Unidad de medida', 'Producto', 'Cantidad Entregada'];
    const formattedSuppliers = this.formatRequisitionsForPDF(requisition);
    const requestDate = this.getDate(requisition.date);
    const deliverDate = this.getDate(requisition.outputs[0].date);
    return this.generatePDF(formattedSuppliers, columns, 'Requisición de materiales sección proveeduría', requestDate, deliverDate, department);
  }

  public formatRequisitionsForPDF(requisition: any) {
    const productsRequisition = requisition.productsRequisition;
    let counter = 0;
    return productsRequisition.map((req: { product: { unit: any; name: any; }; quantity: any; }) => {
      counter++;
      return [
        counter,
        req.product.unit,
        req.product.name,
        req.quantity
      ];
    });
  }

  private getDate(date: Date): string {
    return moment(date).format('DD/MM/YYYY');
  }
}

