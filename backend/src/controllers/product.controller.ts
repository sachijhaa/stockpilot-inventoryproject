import { Request, Response } from 'express';
import { Parser as CsvParser } from 'json2csv';
import { parse as parseCsv } from 'csv-parse/sync';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { generateSku } from '../utils/sku';
import { logActivity } from '../services/activity.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const search = (req.query.search as string) ?? '';
  const categoryId = req.query.categoryId as string | undefined;
  const sortBy = (req.query.sortBy as string) ?? 'createdAt';
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') ?? 'desc';

  const where = {
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { barcode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, supplier: true, inventory: { include: { warehouse: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { category: true, supplier: true, inventory: { include: { warehouse: true } } },
  });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw ApiError.badRequest('Invalid categoryId');

  const sku = body.sku ?? generateSku(category.name, body.name);

  const product = await prisma.product.create({
    data: { ...body, sku },
  });

  await logActivity(req.user!.userId, 'CREATE', 'Product', product.id, { sku: product.sku });
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');

  const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
  await logActivity(req.user!.userId, 'UPDATE', 'Product', product.id, { changes: req.body });
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');

  await prisma.product.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), isActive: false } });
  await logActivity(req.user!.userId, 'DELETE', 'Product', req.params.id);
  res.json({ success: true, message: 'Product moved to recycle bin' });
});

export const restoreProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { deletedAt: null, isActive: true },
  });
  await logActivity(req.user!.userId, 'RESTORE', 'Product', product.id);
  res.json({ success: true, data: product });
});

export const exportProductsCsv = asyncHandler(async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({ where: { deletedAt: null }, include: { category: true } });
  const fields = ['sku', 'name', 'category.name', 'unit', 'costPrice', 'sellingPrice', 'reorderPoint', 'reorderQuantity'];
  const parser = new CsvParser({ fields });
  const csv = parser.parse(products);
  res.header('Content-Type', 'text/csv');
  res.attachment('products.csv');
  res.send(csv);
});

export const importProductsCsv = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) throw ApiError.badRequest('CSV file is required');

  const records: Array<Record<string, string>> = parseCsv(req.file.buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const category = await prisma.category.findFirst();
  if (!category) throw ApiError.badRequest('Create at least one category before importing products');

  let created = 0;
  const errors: string[] = [];

  for (const row of records) {
    try {
      await prisma.product.create({
        data: {
          sku: row.sku || generateSku(category.name, row.name),
          name: row.name,
          unit: row.unit || 'pcs',
          costPrice: parseFloat(row.costPrice || '0'),
          sellingPrice: parseFloat(row.sellingPrice || '0'),
          reorderPoint: parseInt(row.reorderPoint || '10', 10),
          reorderQuantity: parseInt(row.reorderQuantity || '50', 10),
          categoryId: category.id,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row with sku ${row.sku ?? row.name}: ${(e as Error).message}`);
    }
  }

  await logActivity(req.user!.userId, 'IMPORT', 'Product', undefined, { created, errors: errors.length });
  res.json({ success: true, data: { created, errors } });
});
