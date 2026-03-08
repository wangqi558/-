import { Router } from 'express';
import {
  getReports,
  getReportDetails,
  getReportStats,
  blockObject,
  deleteRating,
  suspendUser,
  resolveReport,
  getAdminActions,
  getDashboardStats,
  adminValidation
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Report management
router.get('/reports', getReports);
router.get('/reports/:id', getReportDetails);
router.get('/reports/stats', getReportStats);
router.post('/reports/:id/resolve', adminValidation.resolveReport, resolveReport);

// Admin actions
router.post('/objects/:id/block', adminValidation.blockObject, blockObject);
router.delete('/ratings/:id', deleteRating);
router.post('/users/:id/suspend', adminValidation.suspendUser, suspendUser);

// Admin history and dashboard
router.get('/actions', getAdminActions);
router.get('/dashboard/stats', getDashboardStats);

export default router;
