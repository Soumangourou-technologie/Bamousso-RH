import express from 'express';
import { getPublicSettings } from '../controllers/settings.controller.js';

const router = express.Router();

router.get('/public', getPublicSettings);

export default router;
