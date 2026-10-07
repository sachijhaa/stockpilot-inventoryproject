import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { generateOrderNumber } from '../utils/sku';
import { adjustStock } from '../services/inventory.service';
import { generateInvoicePdf } from '../services/invoice.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getIo, SOCKET_EVENTS } from '../sockets/io';
import { OrderStatus } from '@prisma/client';

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const status = req.query.status as OrderStatus | undefined;
  const warehouseId = req.query.warehouseId as string | undefined;

  const where = { deletedAt: null, ...(status ? { status } : {}), ...(warehouseId ? { warehouseId } : {}) };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: { include: { product: true } }, warehouse: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { items: { include: { product: true } }, warehouse: true, createdBy: true },
  });
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, data: order });
});

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export const createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customerName, customerEmail, customerPhone, warehouseId, items } = req.body as {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    warehouseId: string;
    items: OrderItemInput[];
  };

  if (!items?.length) throw ApiError.badRequest('Order must contain at least one item');

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalAmount = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw ApiError.badRequest(`Invalid product: ${item.productId}`);
    totalAmount += Number(product.sellingPrice) * item.quantity;
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName,
      customerEmail,
      customerPhone,
      warehouseId,
      totalAmount,
      createdById: req.user!.userId,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: productMap.get(i.productId)!.sellingPrice,
        })),
      },
    },
    include: { items: { include: { product: true } }, warehouse: true },
  });

  // Auto-deduct inventory for each item
  for (const item of order.items) {
    await adjustStock(item.productId, warehouseId, -item.quantity, 'STOCK_OUT', `Order ${order.orderNumber}`, order.id);
  }

  try {
    getIo().emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId: order.id, status: order.status });
  } catch {
    /* socket not initialized in tests */
  }

  res.status(201).json({ success: true, data: order });
});

export const updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status: OrderStatus };
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true, warehouse: true } });
  if (!order) throw ApiError.notFound('Order not found');

  // If order is cancelled/returned after being deducted, restock inventory
  if ((status === 'CANCELLED' || status === 'RETURNED') && !['CANCELLED', 'RETURNED'].includes(order.status)) {
    for (const item of order.items) {
      await adjustStock(item.productId, order.warehouseId, item.quantity, 'RETURN', `Order ${status.toLowerCase()}: ${order.orderNumber}`, order.id);
    }
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status } });

  try {
    getIo().emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId: order.id, status });
  } catch {
    /* ignore */
  }

  res.json({ success: true, data: updated });
});

export const generateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, warehouse: true },
  });
  if (!order) throw ApiError.notFound('Order not found');

  const invoiceUrl = await generateInvoicePdf({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    createdAt: order.createdAt,
    totalAmount: Number(order.totalAmount),
    warehouseName: order.warehouse.name,
    items: order.items.map((i) => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
  });

  await prisma.order.update({ where: { id: order.id }, data: { invoiceUrl } });
  res.json({ success: true, data: { invoiceUrl } });
});
