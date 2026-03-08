import { Router } from 'express';
import { RatingController } from './RatingController';
import { createRatingObjectRoutes } from './ratingObject.routes';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { body, param, query } from 'express-validator';
import { Redis } from 'ioredis';

export function createRatingRoutes(redis: Redis): Router {
  const router = Router();
  const controller = new RatingController(redis);

  // Submit a rating
  router.post(
    '/ratings',
    authenticate({ optional: true }),
    validateRequest([
      body('targetId').isString().notEmpty(),
      body('targetType').isString().notEmpty(),
      body('rating').isInt({ min: 1, max: 5 }),
      body('comment').optional().isString().isLength({ max: 500 }),
    ]),
    controller.submitRating
  );

  // Get rating statistics
  router.get(
    '/ratings/statistics/:targetId/:targetType',
    validateRequest([
      param('targetId').isString().notEmpty(),
      param('targetType').isString().notEmpty(),
      query('useCache').optional().isBoolean(),
    ]),
    controller.getRatingStatistics
  );

  // Check if user has rated
  router.get(
    '/ratings/has-rated/:targetId/:targetType',
    authenticate({ optional: true }),
    validateRequest([
      param('targetId').isString().notEmpty(),
      param('targetType').isString().notEmpty(),
    ]),
    controller.hasUserRated
  );

  // Get ratings for a target
  router.get(
    '/ratings/:targetId/:targetType',
    validateRequest([
      param('targetId').isString().notEmpty(),
      param('targetType').isString().notEmpty(),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ]),
    controller.getRatingsForTarget
  );

  // Admin routes
  router.post(
    '/admin/ratings/cache/clear',
    authenticate({ required: true, admin: true }),
    validateRequest([
      body('targets').optional().isArray(),
      body('targets.*.targetId').optional().isString(),
      body('targets.*.targetType').optional().isString(),
    ]),
    controller.clearCache
  );

  router.post(
    '/admin/ratings/cache/warmup',
    authenticate({ required: true, admin: true }),
    controller.warmupCache
  );

  router.get(
    '/admin/ratings/cache/health',
    authenticate({ required: true, admin: true }),
    controller.getCacheHealth
  );

  // Include rating object routes
  router.use(createRatingObjectRoutes(redis));

  return router;
}
