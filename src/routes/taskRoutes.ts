import express, { RequestHandler } from 'express';
import { getTasks, addTask } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// ✅ Typecast controller to satisfy Express
router.get('/', authenticate, getTasks as RequestHandler,);
router.post('/', authenticate, addTask as RequestHandler);

export default router;
