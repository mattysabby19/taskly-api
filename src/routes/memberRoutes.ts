import express from 'express';
import * as memberController from '../controllers/memberController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Legacy authentication routes (for backward compatibility)
// Note: New authentication routes are in /auth/* endpoints
router.post('/auth/signup', memberController.signup);
router.post('/auth/login', memberController.login);
router.post('/auth/logout', requireAuth, memberController.logout);

// Member profile and management routes
router.get('/me', requireAuth, memberController.getMe);

// Group member management routes
router.get('/group/:groupId', requireAuth, memberController.getGroupMembers);
router.post('/group/:groupId', requireAuth, memberController.inviteMember);

// Member administration routes
router.patch('/:id', requireAuth, memberController.updateMember);
router.delete('/:id', requireAuth, requireAdmin, memberController.deleteMember);

// New routes for enhanced member management
router.get('/profile', requireAuth, memberController.getMe); // Alias for /me
router.get('/:id', requireAuth, memberController.getMemberById);
router.get('/group/:groupId/admins', requireAuth, memberController.getGroupAdmins);
router.patch('/:id/role', requireAuth, requireAdmin, memberController.updateMemberRole);

export default router;