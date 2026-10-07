import { Router } from 'express';
import { Role } from '@prisma/client';
import * as reportController from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize(Role.ADMIN, Role.WAREHOUSE_MANAGER));

// type: sales | inventory | suppliers | warehouse | profit
router.get('/:type/csv', reportController.exportReportCsv);
router.get('/:type/excel', reportController.exportReportExcel);
router.get('/:type/pdf', reportController.exportReportPdf);

export default router;
