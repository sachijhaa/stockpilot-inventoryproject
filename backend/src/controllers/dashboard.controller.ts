import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const getDashboardKpis = asyncHandler(async (_req: Request, res: Response) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [orders, ordersToday, inventory, warehouses, products] = await Promise.all([
    prisma.order.findMany({ where: { deletedAt: null } }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday }, deletedAt: null } }),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.warehouse.count({ where: { deletedAt: null, isActive: true } }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  const revenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const inventoryValue = inventory.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0);
  const potentialProfit = inventory.reduce(
    (sum, i) => sum + i.quantity * (Number(i.product.sellingPrice) - Number(i.product.costPrice)),
    0
  );

  const lowStockCount = inventory.filter((i) => i.quantity <= i.product.reorderPoint).length;

  res.json({
    success: true,
    data: {
      revenue,
      ordersToday,
      inventoryValue,
      potentialProfit,
      activeWarehouses: warehouses,
      totalProducts: products,
      stockAlerts: lowStockCount,
      totalOrders: orders.length,
    },
  });
});

export const getSalesTrend = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, deletedAt: null },
    select: { createdAt: true, totalAmount: true },
  });

  const byDay = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(o.totalAmount));
  }

  const series = Array.from({ length: days }, (_, idx) => {
    const d = new Date(since);
    d.setDate(d.getDate() + idx);
    const key = d.toISOString().slice(0, 10);
    return { date: key, revenue: byDay.get(key) ?? 0 };
  });

  res.json({ success: true, data: series });
});

export const getWarehouseDistribution = asyncHandler(async (_req: Request, res: Response) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { deletedAt: null },
    include: { inventory: true },
  });

  const data = warehouses.map((w) => ({
    name: w.name,
    units: w.inventory.reduce((sum, i) => sum + i.quantity, 0),
    utilizationPct: w.capacity > 0 ? Math.round((w.usedCapacity / w.capacity) * 1000) / 10 : 0,
  }));

  res.json({ success: true, data });
});

export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) ?? '5', 10);

  const orderItems = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const products = await prisma.product.findMany({ where: { id: { in: orderItems.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const data = orderItems.map((i) => ({
    productId: i.productId,
    name: productMap.get(i.productId)?.name ?? 'Unknown',
    unitsSold: i._sum.quantity ?? 0,
  }));

  res.json({ success: true, data });
});

export const getCategoryPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { products: { include: { orderItems: true } } },
  });

  const data = categories.map((c) => ({
    name: c.name,
    revenue: c.products.reduce(
      (sum, p) => sum + p.orderItems.reduce((s, oi) => s + oi.quantity * Number(oi.unitPrice), 0),
      0
    ),
  }));

  res.json({ success: true, data });
});

export const getInventoryHeatmap = asyncHandler(async (_req: Request, res: Response) => {
  const inventory = await prisma.inventory.findMany({
    include: { product: { include: { category: true } }, warehouse: true },
  });

  const data = inventory.map((i) => ({
    warehouse: i.warehouse.name,
    category: i.product.category?.id,
    product: i.product.name,
    quantity: i.quantity,
    utilization: i.product.reorderPoint > 0 ? Math.round((i.quantity / (i.product.reorderPoint * 3)) * 100) : 0,
  }));

  res.json({ success: true, data });
});
