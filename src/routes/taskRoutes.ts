import express, { RequestHandler } from 'express';
import { getTasks, addTask } from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ✅ Typecast controller to satisfy Express
router.get('/', requireAuth, getTasks as RequestHandler,);
router.post('/', requireAuth, addTask as RequestHandler);

export default router;
