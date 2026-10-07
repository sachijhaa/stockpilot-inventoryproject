import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as inventoryService from '../services/inventory.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logActivity } from '../services/activity.service';

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const inventory = await prisma.inventory.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: { product: { include: { category: true } }, warehouse: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: inventory });
});

export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const items = await inventoryService.getLowStockItems(warehouseId);
  res.json({ success: true, data: items });
});

export const adjustInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { productId, warehouseId, delta, reason } = req.body;
  if (typeof delta !== 'number' || delta === 0) {
    throw ApiError.badRequest('delta must be a non-zero number');
  }
  const action = delta > 0 ? 'ADJUSTMENT' : 'ADJUSTMENT';
  const result = await inventoryService.adjustStock(productId, warehouseId, delta, action as any, reason);
  await logActivity(req.user!.userId, 'ADJUST', 'Inventory', productId, { warehouseId, delta, reason });
  res.json({ success: true, data: result.inventory });
});

export const getInventoryLogs = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.query as Record<string, string>;
  const logs = await prisma.inventoryLog.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: { product: true, warehouse: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: logs });
});

export const undoInventoryAction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await inventoryService.undoLastAction(req.params.logId);
  await logActivity(req.user!.userId, 'UNDO', 'Inventory', req.params.logId);
  res.json({ success: true, data: result.inventory });
});

export const getInventorySnapshot = asyncHandler(async (_req: Request, res: Response) => {
  const inventory = await prisma.inventory.findMany({ include: { product: true, warehouse: true } });
  const totalValue = inventory.reduce((sum, i) => sum + i.quantity * Number(i.product.sellingPrice), 0);
  const totalUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);

  res.json({
    success: true,
    data: {
      snapshotAt: new Date(),
      totalUnits,
      totalValue,
      warehouseCount: new Set(inventory.map((i) => i.warehouseId)).size,
      productCount: new Set(inventory.map((i) => i.productId)).size,
    },
  });
});
