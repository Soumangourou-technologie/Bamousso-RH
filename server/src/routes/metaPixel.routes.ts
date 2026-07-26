import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getPublicPixelConfig,
  getMetaPixelConfig,
  updateMetaPixelConfig,
  trackEvent,
  getMetaPixelAnalytics,
  sendTestEvent,
  verifyLeadWebhook,
  receiveLeadWebhook,
} from '../controllers/metaPixel.controller.js';

const router = Router();

// Routes Publiques (suivi client / landing / webhooks Meta)
router.get('/public-config', getPublicPixelConfig);
router.post('/track', trackEvent);
router.get('/lead-webhook', verifyLeadWebhook);
router.post('/lead-webhook', receiveLeadWebhook);

// Routes Securisées (SUPER_ADMIN uniquement)
router.get('/config', authenticate, authorize(['SUPER_ADMIN']), getMetaPixelConfig);
router.put('/config', authenticate, authorize(['SUPER_ADMIN']), updateMetaPixelConfig);
router.get('/analytics', authenticate, authorize(['SUPER_ADMIN']), getMetaPixelAnalytics);
router.post('/test-event', authenticate, authorize(['SUPER_ADMIN']), sendTestEvent);

export default router;
