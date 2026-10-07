import { Router } from 'express';
import { Role } from '@prisma/client';
import * as transferController from '../controllers/transfer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', transferController.listTransfers);
router.get('/suggestions', transferController.getTransferSuggestions);
router.post('/', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), transferController.createTransfer);
router.patch('/:id/approve', authorize(Role.ADMIN), transferController.approveTransfer);
router.patch('/:id/ship', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), transferController.shipTransfer);
router.patch('/:id/complete', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), transferController.completeTransfer);
router.patch('/:id/cancel', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), transferController.cancelTransfer);

export default router;
