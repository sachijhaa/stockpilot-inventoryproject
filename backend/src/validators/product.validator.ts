import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(3).optional(),
    barcode: z.string().optional(),
    name: z.string().min(2),
    description: z.string().optional(),
    unit: z.string().default('pcs'),
    costPrice: z.number().nonnegative(),
    sellingPrice: z.number().nonnegative(),
    reorderPoint: z.number().int().nonnegative().default(10),
    reorderQuantity: z.number().int().positive().default(50),
    leadTimeDays: z.number().int().nonnegative().default(7),
    categoryId: z.string().uuid(),
    supplierId: z.string().uuid().optional(),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
