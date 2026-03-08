import { Router } from 'express';
import { createRating, getRatings, reportRating } from '../controllers/ratingController';
import { authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

// Submit a rating (authentication optional for anonymous ratings)
router.post('/objects/:id/ratings', optionalAuth, createRating);

// Get ratings for an object
router.get('/objects/:id/ratings', getRatings);

// Report a rating (authentication required)
router.post('/ratings/:id/report', authenticate, reportRating);

export default router;
