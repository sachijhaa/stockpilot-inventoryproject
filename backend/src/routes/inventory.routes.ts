import { Router } from 'express';
import { Role } from '@prisma/client';
import * as inventoryController from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', inventoryController.listInventory);
router.get('/snapshot', inventoryController.getInventorySnapshot);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/logs', inventoryController.getInventoryLogs);
router.post('/adjust', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), inventoryController.adjustInventory);
router.post('/logs/:logId/undo', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), inventoryController.undoInventoryAction);

export default router;
