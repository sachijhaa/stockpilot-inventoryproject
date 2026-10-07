import { Router } from 'express';
import { Role } from '@prisma/client';
import * as supplierController from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.get('/:id/performance', supplierController.getSupplierPerformance);
router.post('/', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), supplierController.createSupplier);
router.patch('/:id', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), supplierController.updateSupplier);
router.delete('/:id', authorize(Role.ADMIN), supplierController.deleteSupplier);

export default router;
