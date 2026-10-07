import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { env } from '../config/env';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'products');
fs.mkdirSync(uploadDir, { recursive: true });

export const uploadProductImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Image file is required');

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound('Product not found');

  const filename = `${uuid()}.webp`;
  const filepath = path.join(uploadDir, filename);

  await sharp(req.file.buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(filepath);

  const imageUrl = `/uploads/products/${filename}`;
  const updated = await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });

  res.json({ success: true, data: { imageUrl: updated.imageUrl } });
});
