import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { aiClient } from '../services/aiClient.service';
import { logger } from '../config/logger';

// ---------------------------------------------------------------------------
// 1. Demand Forecasting
// ---------------------------------------------------------------------------
export const getForecast = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.params;

  const logs = await prisma.inventoryLog.findMany({
    where: { productId, warehouseId, action: { in: ['STOCK_OUT'] } },
    orderBy: { createdAt: 'asc' },
  });

  const history = logs.map((l) => ({ date: l.createdAt.toISOString().slice(0, 10), quantity: Math.abs(l.quantity) }));

  try {
    const { data } = await aiClient.post('/forecast/demand', { history, horizonDays: 30 });

    await prisma.forecast.deleteMany({ where: { productId, warehouseId } });
    await prisma.forecast.createMany({
      data: data.predictions.map((p: { date: string; value: number; confidence: number }) => ({
        productId,
        warehouseId,
        forecastDate: new Date(p.date),
        predictedDemand: p.value,
        confidenceScore: p.confidence,
      })),
    });

    res.json({ success: true, data });
  } catch (err) {
    logger.error(`AI forecast call failed: ${(err as Error).message}`);
    throw ApiError.internal('AI forecasting service is unavailable. Please try again shortly.');
  }
});

export const getStoredForecasts = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.params;
  const forecasts = await prisma.forecast.findMany({
    where: { productId, warehouseId },
    orderBy: { forecastDate: 'asc' },
  });
  res.json({ success: true, data: forecasts });
});

// ---------------------------------------------------------------------------
// 2. Smart Reorder Recommendation
// ---------------------------------------------------------------------------
export const getReorderRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.params;

  const [product, inventory, forecasts] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, include: { supplier: true } }),
    prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } }),
    prisma.forecast.findMany({ where: { productId, warehouseId }, orderBy: { forecastDate: 'asc' } }),
  ]);

  if (!product) throw ApiError.notFound('Product not found');

  const currentStock = inventory?.quantity ?? 0;
  const avgDailyDemand =
    forecasts.length > 0
      ? forecasts.reduce((sum, f) => sum + f.predictedDemand, 0) / forecasts.length
      : product.reorderQuantity / 30;

  const leadTimeDemand = avgDailyDemand * product.leadTimeDays;
  const safetyStock = avgDailyDemand * Math.max(2, Math.round(product.leadTimeDays * 0.3));
  const reorderQuantity = Math.max(0, Math.ceil(leadTimeDemand + safetyStock - currentStock));

  res.json({
    success: true,
    data: {
      productId,
      warehouseId,
      currentStock,
      avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
      leadTimeDays: product.leadTimeDays,
      safetyStock: Math.round(safetyStock),
      recommendedReorderQuantity: reorderQuantity,
      supplierAvailable: !!product.supplierId,
      supplierName: product.supplier?.name,
      shouldReorder: currentStock <= product.reorderPoint,
    },
  });
});

// ---------------------------------------------------------------------------
// 3. Inventory Health Score
// ---------------------------------------------------------------------------
export const getInventoryHealth = asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId } = req.params;

  const [product, inventory, logs, expiry] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.inventory.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } }),
    prisma.inventoryLog.findMany({ where: { productId, warehouseId }, orderBy: { createdAt: 'desc' }, take: 90 }),
    prisma.expiryBatch.findMany({ where: { productId, warehouseId } }),
  ]);

  if (!product || !inventory) throw ApiError.notFound('Product or inventory record not found');

  const salesVelocity = logs.filter((l) => l.action === 'STOCK_OUT').length;
  const returns = logs.filter((l) => l.action === 'RETURN').length;
  const stockAgeDays = Math.round((Date.now() - inventory.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const demandScore = Math.min(100, salesVelocity * 5);
  const velocityScore = Math.min(100, (salesVelocity / Math.max(1, stockAgeDays)) * 100);
  const ageScore = Math.max(0, 100 - stockAgeDays * 2);
  const returnScore = Math.max(0, 100 - returns * 10);
  const nearestExpiry = expiry.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())[0];
  const daysToExpiry = nearestExpiry ? (nearestExpiry.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 999;
  const expiryScore = daysToExpiry < 3 ? 10 : daysToExpiry < 7 ? 40 : daysToExpiry < 30 ? 75 : 100;

  const score = Math.round((demandScore + velocityScore + ageScore + returnScore + expiryScore) / 5);

  let recommendation = 'Inventory levels are healthy.';
  if (score < 40) recommendation = 'Critical: consider discounting or transferring this stock.';
  else if (score < 65) recommendation = 'Monitor closely; demand or freshness is declining.';

  const health = await prisma.inventoryHealth.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { score, demandScore, velocityScore, ageScore, returnScore, expiryScore, recommendation, calculatedAt: new Date() },
    create: { productId, warehouseId, score, demandScore, velocityScore, ageScore, returnScore, expiryScore, recommendation },
  });

  res.json({ success: true, data: health });
});

// ---------------------------------------------------------------------------
// 4. AI Business Insights (natural language, rule-based generation)
// ---------------------------------------------------------------------------
export const getBusinessInsights = asyncHandler(async (_req: Request, res: Response) => {
  const insights: { type: string; message: string }[] = [];

  const warehouses = await prisma.warehouse.findMany({ where: { deletedAt: null } });
  for (const w of warehouses) {
    if (w.capacity > 0 && w.usedCapacity / w.capacity > 0.9) {
      insights.push({ type: 'warning', message: `${w.name} is over ${Math.round((w.usedCapacity / w.capacity) * 100)}% capacity and may need rebalancing.` });
    }
  }

  const expiringSoon = await prisma.expiryBatch.findMany({
    where: { expiryDate: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } },
    include: { product: true, warehouse: true },
  });
  for (const batch of expiringSoon) {
    const days = Math.max(0, Math.ceil((batch.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    insights.push({ type: 'alert', message: `${batch.product.name} at ${batch.warehouse.name} expires in ${days} day(s) — consider a discount.` });
  }

  const recentOrders = await prisma.order.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
  });
  const firstHalf = recentOrders.filter((o) => o.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const secondHalf = recentOrders.filter((o) => o.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  if (firstHalf.length > 0) {
    const change = Math.round(((secondHalf.length - firstHalf.length) / firstHalf.length) * 100);
    if (Math.abs(change) >= 10) {
      insights.push({
        type: change > 0 ? 'positive' : 'warning',
        message: `Order volume ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change)}% over the last week.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({ type: 'info', message: 'No significant anomalies detected. Operations are running smoothly.' });
  }

  res.json({ success: true, data: insights });
});

// ---------------------------------------------------------------------------
// 5. Anomaly Detection (proxied to AI service - Isolation Forest)
// ---------------------------------------------------------------------------
export const detectAnomalies = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.query as { warehouseId?: string };

  const logs = await prisma.inventoryLog.findMany({
    where: warehouseId ? { warehouseId } : {},
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const points = logs.map((l) => ({
    id: l.id,
    quantity: Math.abs(l.quantity),
    action: l.action,
    timestamp: l.createdAt.toISOString(),
  }));

  try {
    const { data } = await aiClient.post('/anomaly/detect', { points });
    res.json({ success: true, data: data.anomalies });
  } catch (err) {
    logger.error(`AI anomaly detection call failed: ${(err as Error).message}`);
    throw ApiError.internal('AI anomaly detection service is unavailable.');
  }
});

// ---------------------------------------------------------------------------
// 7. AI Chat Assistant (rule-based NL query over live data; LLM-ready)
// ---------------------------------------------------------------------------
export const chatQuery = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body as { message: string };
  const lower = message.toLowerCase();

  if (lower.includes('top selling') || lower.includes('best selling')) {
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    const names = items.map((i) => products.find((p) => p.id === i.productId)?.name).filter(Boolean);
    return res.json({ success: true, data: { reply: `Your top selling products are: ${names.join(', ')}.` } });
  }

  if (lower.includes('low stock')) {
    const inventory = await prisma.inventory.findMany({ include: { product: true, warehouse: true } });
    const low = inventory.filter((i) => i.quantity <= i.product.reorderPoint);
    const reply = low.length
      ? `${low.length} item(s) are low on stock: ${low.slice(0, 5).map((i) => `${i.product.name} (${i.warehouse.name})`).join(', ')}.`
      : 'No products are currently low on stock.';
    return res.json({ success: true, data: { reply } });
  }

  if (lower.includes('best warehouse')) {
    const warehouses = await prisma.warehouse.findMany({ include: { orders: true } });
    const best = warehouses.sort((a, b) => b.orders.length - a.orders.length)[0];
    return res.json({ success: true, data: { reply: best ? `${best.name} has processed the most orders (${best.orders.length}).` : 'No data available.' } });
  }

  if (lower.includes('forecast')) {
    return res.json({
      success: true,
      data: { reply: 'Please open a specific product\'s forecast page to see next-30-day demand predictions with confidence scores.' },
    });
  }

  return res.json({
    success: true,
    data: { reply: "I can help with: top selling products, low stock items, best performing warehouse, and demand forecasts. Try asking about one of those!" },
  });
});

// ---------------------------------------------------------------------------
// 8. Expiry Prediction & Discount Recommendation
// ---------------------------------------------------------------------------
export const listExpiryBatches = asyncHandler(async (req: Request, res: Response) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const batches = await prisma.expiryBatch.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: { product: true, warehouse: true },
    orderBy: { expiryDate: 'asc' },
  });

  const enriched = batches.map((b) => {
    const daysLeft = Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let suggestedDiscount = 0;
    if (daysLeft <= 1) suggestedDiscount = 50;
    else if (daysLeft <= 3) suggestedDiscount = 30;
    else if (daysLeft <= 7) suggestedDiscount = 15;
    return { ...b, daysLeft, suggestedDiscount };
  });

  res.json({ success: true, data: enriched });
});

// ---------------------------------------------------------------------------
// 10. Carbon Efficient Logistics Score
// ---------------------------------------------------------------------------
export const getCarbonDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const transfers = await prisma.transfer.findMany({
    where: { carbonScore: { not: null } },
    include: { sourceWarehouse: true, destWarehouse: true },
  });

  const totalCarbonKg = transfers.reduce((sum, t) => sum + (t.carbonScore ?? 0), 0);
  const totalDistanceKm = transfers.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0);

  res.json({
    success: true,
    data: {
      totalTransfers: transfers.length,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalCarbonKg: Math.round(totalCarbonKg * 10) / 10,
      avgCarbonPerTransfer: transfers.length ? Math.round((totalCarbonKg / transfers.length) * 10) / 10 : 0,
      transfers: transfers.map((t) => ({
        route: `${t.sourceWarehouse.name} → ${t.destWarehouse.name}`,
        distanceKm: t.distanceKm,
        carbonKg: t.carbonScore,
      })),
    },
  });
});
