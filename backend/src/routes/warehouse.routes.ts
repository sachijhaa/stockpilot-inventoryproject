import { Router } from 'express';
import { Role } from '@prisma/client';
import * as warehouseController from '../controllers/warehouse.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', warehouseController.listWarehouses);
router.get('/:id', warehouseController.getWarehouse);
router.get('/:fromId/distance/:toId', warehouseController.getWarehouseDistance);
router.post('/', authorize(Role.ADMIN), warehouseController.createWarehouse);
router.patch('/:id', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), warehouseController.updateWarehouse);
router.delete('/:id', authorize(Role.ADMIN), warehouseController.deleteWarehouse);

export default router;
