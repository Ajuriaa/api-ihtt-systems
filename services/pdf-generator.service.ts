import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';


export class PDFHelper {
  private isFirstPageDrawn = false;
  constructor() {}

  public generatePDF(formattedData: any[], columns: string[], title: string, requestDate: string, deliverDate: string, department: string): ArrayBuffer {
    this.isFirstPageDrawn = false;
    const doc = new jsPDF('portrait');
    doc.setTextColor(40);
    const blue = '#88CFE0';

    autoTable(doc, {
      head: [columns],
      body: formattedData,
      margin: { top: 45, right: 10, bottom: 20, left: 20 },
      styles: { halign: 'center', valign: 'middle'},
      headStyles: { fillColor: blue },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        const pageSize = doc.internal.pageSize;

        // Header
        if (!this.isFirstPageDrawn) {
          data.settings.margin.top = 4;
          const centerX = pageSize.width / 2;
          doc.text(title, centerX - (doc.getTextWidth(title) / 2), 25);

          doc.addImage('/pdf.jpg', 'JPEG', 0, 0, 20, 20);
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

  public generateRequisitionsPDF(requisition: any, department: string): ArrayBuffer {
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

