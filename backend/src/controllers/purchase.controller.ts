import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { generatePoNumber } from '../utils/sku';
import { adjustStock } from '../services/inventory.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PurchaseStatus } from '@prisma/client';

export const listPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as PurchaseStatus | undefined;
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null, ...(status ? { status } : {}) },
    include: { supplier: true, warehouse: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: purchaseOrders });
});

export const getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { supplier: true, warehouse: true, items: { include: { product: true } }, createdBy: true },
  });
  if (!po) throw ApiError.notFound('Purchase order not found');
  res.json({ success: true, data: po });
});

interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export const createPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, warehouseId, items, expectedDate } = req.body as {
    supplierId: string;
    warehouseId: string;
    items: PurchaseItemInput[];
    expectedDate?: string;
  };

  if (!items?.length) throw ApiError.badRequest('Purchase order must contain at least one item');

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: generatePoNumber(),
      supplierId,
      warehouseId,
      totalAmount,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      createdById: req.user!.userId,
      items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })) },
    },
    include: { items: true, supplier: true, warehouse: true },
  });

  res.status(201).json({ success: true, data: po });
});

export const approvePurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== 'PENDING') throw ApiError.badRequest(`Cannot approve a PO with status ${po.status}`);

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });
  res.json({ success: true, data: updated });
});

export const rejectPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const updated = await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  res.json({ success: true, data: updated });
});

export const dispatchPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== 'APPROVED') throw ApiError.badRequest('Only approved purchase orders can be dispatched');

  const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'DISPATCHED' } });
  res.json({ success: true, data: updated });
});

// Marking a PO delivered auto-increments inventory for each line item
export const deliverPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!po) throw ApiError.notFound('Purchase order not found');
  if (po.status !== 'DISPATCHED') throw ApiError.badRequest('Only dispatched purchase orders can be marked delivered');

  for (const item of po.items) {
    await adjustStock(item.productId, po.warehouseId, item.quantity, 'STOCK_IN', `PO ${po.poNumber} delivered`, po.id);
    await prisma.purchaseItem.update({ where: { id: item.id }, data: { receivedQty: item.quantity } });
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'DELIVERED', deliveredDate: new Date() },
  });

  res.json({ success: true, data: updated });
});
