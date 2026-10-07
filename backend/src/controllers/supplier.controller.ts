import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const listSuppliers = asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { products: true, purchaseOrders: true } } },
    orderBy: { rating: 'desc' },
  });
  res.json({ success: true, data: suppliers });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { products: true, purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  res.json({ success: true, data: supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.create({ data: req.body });
  res.status(201).json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: supplier });
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  await prisma.supplier.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ success: true, message: 'Supplier deleted' });
});

// Supplier Performance Dashboard: on-time %, avg delivery days, PO volume
export const getSupplierPerformance = asyncHandler(async (req: Request, res: Response) => {
  const supplierId = req.params.id;
  const orders = await prisma.purchaseOrder.findMany({
    where: { supplierId, deletedAt: null },
  });

  const delivered = orders.filter((o) => o.status === 'DELIVERED' && o.deliveredDate && o.expectedDate);
  const onTimeCount = delivered.filter((o) => o.deliveredDate! <= o.expectedDate!).length;
  const onTimeRate = delivered.length > 0 ? (onTimeCount / delivered.length) * 100 : 0;

  const avgDeliveryDays =
    delivered.length > 0
      ? delivered.reduce((sum, o) => {
          const days = (o.deliveredDate!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / delivered.length
      : 0;

  res.json({
    success: true,
    data: {
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
      totalSpend: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    },
  });
});
