import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

interface InvoiceOrder {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  createdAt: Date;
  totalAmount: number;
  items: { productName: string; quantity: number; unitPrice: number }[];
  warehouseName: string;
}

const invoiceDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'invoices');
fs.mkdirSync(invoiceDir, { recursive: true });

export async function generateInvoicePdf(order: InvoiceOrder): Promise<string> {
  const filename = `invoice-${order.orderNumber}.pdf`;
  const filepath = path.join(invoiceDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#0f172a').text('INVOICE', { align: 'right' });
    doc.fontSize(10).fillColor('#475569').text('Smart Inventory & Supply Chain Systems', { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(12).fillColor('#0f172a').text(`Order #: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    doc.text(`Warehouse: ${order.warehouseName}`);
    doc.moveDown();
    doc.text(`Bill To: ${order.customerName}`);
    if (order.customerEmail) doc.text(order.customerEmail);
    doc.moveDown(1.5);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Unit Price', 370, tableTop);
    doc.text('Total', 470, tableTop);
    doc.font('Helvetica');
    doc.moveDown(0.5);
    let y = doc.y;
    doc.moveTo(50, y).lineTo(550, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    for (const item of order.items) {
      doc.text(item.productName, 50, y);
      doc.text(String(item.quantity), 300, y);
      doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 370, y);
      doc.text(`Rs. ${(item.quantity * item.unitPrice).toFixed(2)}`, 470, y);
      y += 20;
    }

    doc.moveTo(50, y).lineTo(550, y).strokeColor('#cbd5e1').stroke();
    y += 15;
    doc.font('Helvetica-Bold').text(`Grand Total: Rs. ${order.totalAmount.toFixed(2)}`, 370, y);

    doc.moveDown(3);
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text('Thank you for your business.', 50, doc.y, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/uploads/invoices/${filename}`));
    stream.on('error', reject);
  });
}
