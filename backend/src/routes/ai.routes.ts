import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/forecast/:productId/:warehouseId', aiController.getForecast);
router.get('/forecast/:productId/:warehouseId', aiController.getStoredForecasts);
router.get('/reorder/:productId/:warehouseId', aiController.getReorderRecommendation);
router.get('/health/:productId/:warehouseId', aiController.getInventoryHealth);
router.get('/insights', aiController.getBusinessInsights);
router.get('/anomalies', aiController.detectAnomalies);
router.post('/chat', aiController.chatQuery);
router.get('/expiry', aiController.listExpiryBatches);
router.get('/carbon', aiController.getCarbonDashboard);

export default router;
