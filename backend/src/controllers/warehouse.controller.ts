import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { haversineDistanceKm } from '../utils/geo';

export const listWarehouses = asyncHandler(async (_req: Request, res: Response) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { inventory: true } } },
    orderBy: { name: 'asc' },
  });

  const enriched = warehouses.map((w) => ({
    ...w,
    utilizationPct: w.capacity > 0 ? Math.round((w.usedCapacity / w.capacity) * 1000) / 10 : 0,
  }));

  res.json({ success: true, data: enriched });
});

export const getWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      inventory: { include: { product: true } },
    },
  });
  if (!warehouse) throw ApiError.notFound('Warehouse not found');

  const totalValue = warehouse.inventory.reduce(
    (sum, inv) => sum + inv.quantity * Number(inv.product.sellingPrice),
    0
  );

  res.json({
    success: true,
    data: {
      ...warehouse,
      utilizationPct: warehouse.capacity > 0 ? Math.round((warehouse.usedCapacity / warehouse.capacity) * 1000) / 10 : 0,
      totalInventoryValue: totalValue,
    },
  });
});

export const createWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await prisma.warehouse.create({ data: req.body });
  res.status(201).json({ success: true, data: warehouse });
});

export const updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: warehouse });
});

export const deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
  await prisma.warehouse.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  res.json({ success: true, message: 'Warehouse deactivated' });
});

export const getWarehouseDistance = asyncHandler(async (req: Request, res: Response) => {
  const { fromId, toId } = req.params;
  const [from, to] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: fromId } }),
    prisma.warehouse.findUnique({ where: { id: toId } }),
  ]);
  if (!from || !to) throw ApiError.notFound('One or both warehouses not found');
  if (!from.latitude || !from.longitude || !to.latitude || !to.longitude) {
    throw ApiError.badRequest('Warehouse coordinates not set');
  }

  const distanceKm = haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
  res.json({ success: true, data: { distanceKm, from: from.name, to: to.name } });
});
