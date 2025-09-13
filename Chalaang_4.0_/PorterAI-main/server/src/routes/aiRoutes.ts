

import express from 'express';
import { handleMessage } from '../controllers/aiController';

const router = express.Router();

router.post('/ai', handleMessage);

export default router;