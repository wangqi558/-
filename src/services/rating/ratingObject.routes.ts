import { Router } from 'express';
import { RatingObjectController } from './RatingObjectController';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { param, query } from 'express-validator';
import { Redis } from 'ioredis';

export function createRatingObjectRoutes(redis: Redis): Router {
  const router = Router();
  const controller = new RatingObjectController(redis);

  // Create rating object
  router.post(
    '/rating-objects',
    authenticate({ required: true }),
    validateRequest(RatingObjectController.createValidationRules),
    controller.createRatingObject
  );

  // Get rating object details with statistics
  router.get(
    '/rating-objects/:id',
    validateRequest([
      param('id').isInt().withMessage('Rating object ID must be an integer'),
      query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
    ]),
    controller.getRatingObjectDetails
  );

  // List rating objects with pagination and filtering
  router.get(
    '/rating-objects',
    validateRequest([
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('category').optional().isString().withMessage('Category must be a string'),
      query('tags').optional().isString().withMessage('Tags must be a comma-separated string'),
      query('creatorId').optional().isInt().withMessage('Creator ID must be an integer'),
      query('status').optional().isIn(['active', 'inactive', 'deleted']).withMessage('Invalid status'),
      query('visibility').optional().isIn(['public', 'private']).withMessage('Visibility must be public or private'),
      query('search').optional().isString().withMessage('Search must be a string'),
      query('minRating').optional().isFloat({ min: 1, max: 5 }).withMessage('Min rating must be between 1 and 5'),
      query('maxRating').optional().isFloat({ min: 1, max: 5 }).withMessage('Max rating must be between 1 and 5'),
      query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
      query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
      query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title', 'averageRating', 'totalRatings']).withMessage('Invalid sort field'),
      query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    ]),
    controller.listRatingObjects
  );

  // Update rating object
  router.patch(
    '/rating-objects/:id',
    authenticate({ required: true }),
    validateRequest([
      param('id').isInt().withMessage('Rating object ID must be an integer'),
      ...RatingObjectController.updateValidationRules,
    ]),
    controller.updateRatingObject
  );

  // Delete/block rating object
  router.delete(
    '/rating-objects/:id',
    authenticate({ required: true }),
    validateRequest([
      param('id').isInt().withMessage('Rating object ID must be an integer'),
    ]),
    controller.deleteRatingObject
  );

  // Search rating objects
  router.get(
    '/rating-objects/search',
    validateRequest([
      query('q').isString().isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    controller.searchRatingObjects
  );

  // Admin routes
  router.patch(
    '/admin/rating-objects/:id/status',
    authenticate({ required: true, admin: true }),
    validateRequest([
      param('id').isInt().withMessage('Rating object ID must be an integer'),
      body('status').isIn(['active', 'inactive', 'deleted']).withMessage('Status must be active, inactive, or deleted'),
    ]),
    controller.updateRatingObject
  );

  router.delete(
    '/admin/rating-objects/:id',
    authenticate({ required: true, admin: true }),
    validateRequest([
      param('id').isInt().withMessage('Rating object ID must be an integer'),
    ]),
    controller.deleteRatingObject
  );

  return router;
}
