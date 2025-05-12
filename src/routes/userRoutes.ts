import express from 'express';
import {
  getTeamMembers,
  createUser,
  updateUserRole,
  deactivateUser,
}from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { updateUserRoleExplicit } from '../controllers/userController';


const router = express.Router();

router.get('/', requireAuth, getTeamMembers);
router.post('/', requireAuth, createUser);
router.put('/role', requireAuth, updateUserRole);
router.put('/deactivate', requireAuth, deactivateUser);
router.put('/role', requireAuth, updateUserRoleExplicit);

export default router;
