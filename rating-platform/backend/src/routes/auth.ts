import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  suspendUser,
  updateReputation,
  getReputationHistory
} from '../controllers/authController';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validateRequest, validateParams, validateQuery } from '../middlewares/validation';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  suspendUserSchema,
  reputationActionSchema
} from '../utils/validation';

const router = Router();

// Public routes
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

// Authenticated routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validateRequest(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validateRequest(changePasswordSchema), changePassword);

// Admin routes
router.post('/admin/suspend-user', authenticate, requireAdmin, validateRequest(suspendUserSchema), suspendUser);
router.put('/admin/reputation', authenticate, requireAdmin, validateRequest(reputationActionSchema), updateReputation);
router.get('/admin/reputation-history/:userId', authenticate, requireAdmin, validateParams(Joi.object({
  userId: Joi.number().integer().positive().required()
})), validateQuery(Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional()
})), getReputationHistory);

export default router;
