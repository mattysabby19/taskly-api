import express from 'express';
import * as memberController from '../controllers/memberController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/auth/signup', memberController.signup);
router.post('/auth/login', memberController.login);
router.post('/auth/logout', requireAuth, memberController.logout);

// Authenticated member routes
router.get('/me', requireAuth, memberController.getMe);
router.get('/group/:groupId', requireAuth, memberController.getGroupMembers);
router.post('/group/:groupId', requireAuth, memberController.inviteMember);
router.patch('/:id', requireAuth, memberController.updateMember);
router.delete('/:id', requireAuth, memberController.deleteMember);

export default router;