import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { generateTransferNumber } from '../utils/sku';
import { adjustStock } from '../services/inventory.service';
import { haversineDistanceKm, estimateCarbonFootprint } from '../utils/geo';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getIo, SOCKET_EVENTS } from '../sockets/io';

export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
  const transfers = await prisma.transfer.findMany({
    where: { deletedAt: null },
    include: {
      sourceWarehouse: true,
      destWarehouse: true,
      items: { include: { product: true } },
      requestedBy: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: transfers });
});

interface TransferItemInput {
  productId: string;
  quantity: number;
}

export const createTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sourceWarehouseId, destWarehouseId, items } = req.body as {
    sourceWarehouseId: string;
    destWarehouseId: string;
    items: TransferItemInput[];
  };

  if (sourceWarehouseId === destWarehouseId) {
    throw ApiError.badRequest('Source and destination warehouses must differ');
  }
  if (!items?.length) throw ApiError.badRequest('Transfer must include at least one item');

  const [source, dest] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } }),
    prisma.warehouse.findUnique({ where: { id: destWarehouseId } }),
  ]);
  if (!source || !dest) throw ApiError.notFound('Warehouse not found');

  let distanceKm: number | undefined;
  let carbonScore: number | undefined;
  if (source.latitude && source.longitude && dest.latitude && dest.longitude) {
    distanceKm = haversineDistanceKm(source.latitude, source.longitude, dest.latitude, dest.longitude);
    carbonScore = estimateCarbonFootprint(distanceKm, 'truck');
  }

  // Validate stock availability at source
  for (const item of items) {
    const inv = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: sourceWarehouseId } },
    });
    if (!inv || inv.quantity < item.quantity) {
      throw ApiError.badRequest(`Insufficient stock at source warehouse for product ${item.productId}`);
    }
  }

  const transfer = await prisma.transfer.create({
    data: {
      transferNumber: generateTransferNumber(),
      sourceWarehouseId,
      destWarehouseId,
      distanceKm,
      carbonScore,
      requestedById: req.user!.userId,
      items: { create: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
    },
    include: { items: true, sourceWarehouse: true, destWarehouse: true },
  });

  res.status(201).json({ success: true, data: transfer });
});

export const approveTransfer = asyncHandler(async (req: Request, res: Response) => {
  const updated = await prisma.transfer.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } });
  res.json({ success: true, data: updated });
});

export const shipTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!transfer) throw ApiError.notFound('Transfer not found');
  if (transfer.status !== 'APPROVED') throw ApiError.badRequest('Transfer must be approved before shipping');

  for (const item of transfer.items) {
    await adjustStock(item.productId, transfer.sourceWarehouseId, -item.quantity, 'TRANSFER_OUT', `Transfer ${transfer.transferNumber}`, transfer.id);
  }

  const updated = await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'IN_TRANSIT' } });
  res.json({ success: true, data: updated });
});

export const completeTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!transfer) throw ApiError.notFound('Transfer not found');
  if (transfer.status !== 'IN_TRANSIT') throw ApiError.badRequest('Transfer must be in transit to complete');

  for (const item of transfer.items) {
    await adjustStock(item.productId, transfer.destWarehouseId, item.quantity, 'TRANSFER_IN', `Transfer ${transfer.transferNumber}`, transfer.id);
  }

  const updated = await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'COMPLETED' } });

  try {
    getIo().emit(SOCKET_EVENTS.TRANSFER_UPDATED, { transferId: transfer.id, status: 'COMPLETED' });
  } catch {
    /* ignore */
  }

  res.json({ success: true, data: updated });
});

export const cancelTransfer = asyncHandler(async (req: Request, res: Response) => {
  const updated = await prisma.transfer.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  res.json({ success: true, data: updated });
});

// Smart Warehouse Suggestion: recommend rebalancing stock between over/under-stocked warehouses
export const getTransferSuggestions = asyncHandler(async (_req: Request, res: Response) => {
  const inventory = await prisma.inventory.findMany({ include: { product: true, warehouse: true } });

  const byProduct = new Map<string, typeof inventory>();
  for (const inv of inventory) {
    const list = byProduct.get(inv.productId) ?? [];
    list.push(inv);
    byProduct.set(inv.productId, list);
  }

  const suggestions: any[] = [];
  for (const [, entries] of byProduct) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => b.quantity - a.quantity);
    const surplus = sorted[0];
    const deficit = sorted[sorted.length - 1];

    if (surplus.quantity > surplus.product.reorderPoint * 2 && deficit.quantity <= deficit.product.reorderPoint) {
      let distanceKm: number | undefined;
      if (surplus.warehouse.latitude && deficit.warehouse.latitude) {
        distanceKm = haversineDistanceKm(
          surplus.warehouse.latitude!,
          surplus.warehouse.longitude!,
          deficit.warehouse.latitude!,
          deficit.warehouse.longitude!
        );
      }
      suggestions.push({
        productId: surplus.productId,
        productName: surplus.product.name,
        fromWarehouse: surplus.warehouse.name,
        fromWarehouseId: surplus.warehouseId,
        toWarehouse: deficit.warehouse.name,
        toWarehouseId: deficit.warehouseId,
        suggestedQuantity: Math.floor((surplus.quantity - surplus.product.reorderPoint) / 2),
        distanceKm,
        estimatedCarbonKg: distanceKm ? estimateCarbonFootprint(distanceKm) : undefined,
      });
    }
  }

  res.json({ success: true, data: suggestions });
});
