import { Router } from 'express';
import { Role } from '@prisma/client';
import * as productController from '../controllers/product.controller';
import * as uploadController from '../controllers/upload.controller';
import * as codeController from '../controllers/code.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { uploadImage, uploadCsv } from '../config/upload';

const router = Router();

router.use(authenticate);

router.get('/', productController.listProducts);
router.get('/export/csv', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), productController.exportProductsCsv);
router.post(
  '/import/csv',
  authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER),
  uploadCsv.single('file'),
  productController.importProductsCsv
);
router.get('/:id', productController.getProduct);
router.post('/', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), validate(createProductSchema), productController.createProduct);
router.patch('/:id', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), productController.deleteProduct);
router.post('/:id/restore', authorize(Role.ADMIN), productController.restoreProduct);
router.post('/:id/image', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), uploadImage.single('image'), uploadController.uploadProductImage);
router.get('/:id/qrcode', codeController.generateQrCode);
router.get('/:id/barcode', codeController.generateBarcode);

export default router;
