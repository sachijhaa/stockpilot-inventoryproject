import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Parser as CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

async function getReportData(type: string) {
  switch (type) {
    case 'sales': {
      return prisma.order.findMany({
        where: { deletedAt: null },
        include: { items: { include: { product: true } }, warehouse: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    case 'inventory': {
      return prisma.inventory.findMany({ include: { product: true, warehouse: true } });
    }
    case 'suppliers': {
      return prisma.supplier.findMany({ where: { deletedAt: null }, include: { purchaseOrders: true } });
    }
    case 'warehouse': {
      return prisma.warehouse.findMany({ where: { deletedAt: null }, include: { inventory: true } });
    }
    case 'profit': {
      const inventory = await prisma.inventory.findMany({ include: { product: true } });
      return inventory.map((i) => ({
        product: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        costPrice: Number(i.product.costPrice),
        sellingPrice: Number(i.product.sellingPrice),
        potentialProfit: i.quantity * (Number(i.product.sellingPrice) - Number(i.product.costPrice)),
      }));
    }
    default:
      return [];
  }
}

function flattenForCsv(type: string, data: any[]): any[] {
  if (type === 'sales') {
    return data.map((o) => ({
      orderNumber: o.orderNumber,
      customer: o.customerName,
      warehouse: o.warehouse.name,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
    }));
  }
  if (type === 'inventory') {
    return data.map((i) => ({
      product: i.product.name,
      sku: i.product.sku,
      warehouse: i.warehouse.name,
      quantity: i.quantity,
    }));
  }
  if (type === 'suppliers') {
    return data.map((s) => ({
      name: s.name,
      rating: s.rating,
      onTimeRate: s.onTimeRate,
      totalPOs: s.purchaseOrders.length,
    }));
  }
  if (type === 'warehouse') {
    return data.map((w) => ({
      name: w.name,
      code: w.code,
      capacity: w.capacity,
      usedCapacity: w.usedCapacity,
      totalSkus: w.inventory.length,
    }));
  }
  return data;
}

export const exportReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type;
  const data = await getReportData(type);
  const flat = flattenForCsv(type, data);
  const parser = new CsvParser();
  const csv = flat.length ? parser.parse(flat) : 'No data available';
  res.header('Content-Type', 'text/csv');
  res.attachment(`${type}-report.csv`);
  res.send(csv);
});

export const exportReportExcel = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type;
  const data = await getReportData(type);
  const flat = flattenForCsv(type, data);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type);

  if (flat.length > 0) {
    sheet.columns = Object.keys(flat[0]).map((key) => ({ header: key, key, width: 20 }));
    sheet.addRows(flat);
    sheet.getRow(1).font = { bold: true };
  } else {
    sheet.addRow(['No data available']);
  }

  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${type}-report.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

export const exportReportPdf = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type;
  const data = await getReportData(type);
  const flat = flattenForCsv(type, data);

  res.header('Content-Type', 'application/pdf');
  res.attachment(`${type}-report.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(9).fillColor('#64748b').text(`Generated on ${new Date().toDateString()}`, { align: 'center' });
  doc.moveDown(1.5);

  if (flat.length === 0) {
    doc.fontSize(12).fillColor('#000').text('No data available for this report.');
  } else {
    const keys = Object.keys(flat[0]);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(keys.join('   |   '));
    doc.moveDown(0.5);
    doc.font('Helvetica');
    for (const row of flat.slice(0, 200)) {
      doc.text(keys.map((k) => String(row[k])).join('   |   '));
    }
  }

  doc.end();
});
