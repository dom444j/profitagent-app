import { Router } from 'express';
import { systemController } from './controller';

const router = Router();

// GET /api/v1/system/config - Get public system configuration
router.get('/config', systemController.getPublicConfig);

export { router as systemRoutes };