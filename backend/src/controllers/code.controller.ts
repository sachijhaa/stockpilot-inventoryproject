import { Response } from 'express';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const generateQrCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound('Product not found');

  const payload = JSON.stringify({ sku: product.sku, id: product.id, name: product.name });
  const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 1 });

  res.json({ success: true, data: { qrCode: dataUrl } });
});

export const generateBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound('Product not found');

  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: product.sku,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: 'center',
  });

  res.set('Content-Type', 'image/png');
  res.send(png);
});
