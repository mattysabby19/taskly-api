import express from 'express';
import { getClientProfile, createClientWithAdmin } from '../controllers/clientController';
import { requireAuth }  from '../middleware/auth';

const router = express.Router();

router.get('/me', requireAuth, getClientProfile);
router.post('/', createClientWithAdmin); // Public endpoint

export default router;
