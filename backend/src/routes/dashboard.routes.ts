import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/kpis', dashboardController.getDashboardKpis);
router.get('/sales-trend', dashboardController.getSalesTrend);
router.get('/warehouse-distribution', dashboardController.getWarehouseDistribution);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/category-performance', dashboardController.getCategoryPerformance);
router.get('/inventory-heatmap', dashboardController.getInventoryHeatmap);

export default router;
