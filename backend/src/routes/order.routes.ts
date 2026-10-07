import { Router } from 'express';
import { Role } from '@prisma/client';
import * as orderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrder);
router.post('/', authorize(Role.ADMIN, Role.SALES_EXECUTIVE, Role.WAREHOUSE_MANAGER), orderController.createOrder);
router.patch('/:id/status', authorize(Role.ADMIN, Role.SALES_EXECUTIVE, Role.WAREHOUSE_MANAGER), orderController.updateOrderStatus);
router.post('/:id/invoice', authorize(Role.ADMIN, Role.SALES_EXECUTIVE, Role.WAREHOUSE_MANAGER), orderController.generateInvoice);

export default router;
