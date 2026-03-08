import { Router } from 'express';
import { createObject, listObjects, getObject, reportObject } from '../controllers/objectController';
import { authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

// Create a new rating object (requires authentication)
router.post('/', authenticate, createObject);

// Get all public rating objects
router.get('/', listObjects);

// Get a specific rating object with statistics
router.get('/:id', optionalAuth, getObject);

// Report an object (authentication required)
router.post('/:id/report', authenticate, reportObject);

export default router;
