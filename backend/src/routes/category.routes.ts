import { Router } from 'express';
import { Role } from '@prisma/client';
import * as categoryController from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', categoryController.listCategories);
router.post('/', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), categoryController.createCategory);
router.patch('/:id', authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER), categoryController.updateCategory);
router.delete('/:id', authorize(Role.ADMIN), categoryController.deleteCategory);

export default router;
