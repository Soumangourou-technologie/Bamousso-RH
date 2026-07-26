import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getPublicPixelConfig,
  getMetaPixelConfig,
  updateMetaPixelConfig,
  trackEvent,
  getMetaPixelAnalytics,
  sendTestEvent,
} from '../controllers/metaPixel.controller.js';

const router = Router();

// Routes Publiques (suivi client / landing)
router.get('/public-config', getPublicPixelConfig);
router.post('/track', trackEvent);

// Routes Securisées (SUPER_ADMIN uniquement)
router.get('/config', authenticate, authorize(['SUPER_ADMIN']), getMetaPixelConfig);
router.put('/config', authenticate, authorize(['SUPER_ADMIN']), updateMetaPixelConfig);
router.get('/analytics', authenticate, authorize(['SUPER_ADMIN']), getMetaPixelAnalytics);
router.post('/test-event', authenticate, authorize(['SUPER_ADMIN']), sendTestEvent);

export default router;
