import { Router } from 'express';
import { Role } from '@prisma/client';
import * as purchaseController from '../controllers/purchase.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', purchaseController.listPurchaseOrders);
router.get('/:id', purchaseController.getPurchaseOrder);
router.post('/', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), purchaseController.createPurchaseOrder);
router.patch('/:id/approve', authorize(Role.ADMIN), purchaseController.approvePurchaseOrder);
router.patch('/:id/reject', authorize(Role.ADMIN), purchaseController.rejectPurchaseOrder);
router.patch('/:id/dispatch', authorize(Role.ADMIN, Role.SUPPLIER), purchaseController.dispatchPurchaseOrder);
router.patch('/:id/deliver', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), purchaseController.deliverPurchaseOrder);

export default router;
