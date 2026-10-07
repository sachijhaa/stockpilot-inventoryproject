import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { getIo, SOCKET_EVENTS } from '../sockets/io';
import { InventoryLogAction } from '@prisma/client';

export async function adjustStock(
  productId: string,
  warehouseId: string,
  delta: number,
  action: InventoryLogAction,
  reason?: string,
  referenceId?: string
) {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: {},
      create: { productId, warehouseId, quantity: 0 },
    });

    const newQuantity = inventory.quantity + delta;
    if (newQuantity < 0) {
      throw ApiError.badRequest('Insufficient stock for this operation');
    }

    const updated = await tx.inventory.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantity: newQuantity },
    });

    const log = await tx.inventoryLog.create({
      data: { productId, warehouseId, action, quantity: delta, balanceAfter: newQuantity, reason, referenceId },
    });

    const product = await tx.product.findUnique({ where: { id: productId } });

    return { inventory: updated, log, product };
  }).then(async (result) => {
    // Emit realtime update outside the transaction
    try {
      const io = getIo();
      io.emit(SOCKET_EVENTS.INVENTORY_UPDATED, {
        productId,
        warehouseId,
        quantity: result.inventory.quantity,
        action,
      });

      if (result.product && result.inventory.quantity <= result.product.reorderPoint) {
        io.emit(SOCKET_EVENTS.LOW_STOCK_ALERT, {
          productId,
          productName: result.product.name,
          warehouseId,
          quantity: result.inventory.quantity,
          reorderPoint: result.product.reorderPoint,
        });
      }
    } catch {
      // Socket.io not initialized (e.g. during tests) - safe to ignore
    }
    return result;
  });
}

export async function undoLastAction(logId: string) {
  const log = await prisma.inventoryLog.findUnique({ where: { id: logId } });
  if (!log) throw ApiError.notFound('Inventory log entry not found');

  // Reverse the original delta
  return adjustStock(log.productId, log.warehouseId, -log.quantity, InventoryLogAction.UNDO, `Undo of log ${log.id}`);
}

export async function getLowStockItems(warehouseId?: string) {
  const inventory = await prisma.inventory.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: { product: true, warehouse: true },
  });

  return inventory
    .filter((inv) => inv.quantity <= inv.product.reorderPoint)
    .map((inv) => ({
      productId: inv.productId,
      productName: inv.product.name,
      sku: inv.product.sku,
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      quantity: inv.quantity,
      reorderPoint: inv.product.reorderPoint,
      reorderQuantity: inv.product.reorderQuantity,
    }));
}
