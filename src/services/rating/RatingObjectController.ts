import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { RatingObjectService } from './RatingObjectService';
import { AppError } from '../../errors/AppError';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { body, param, query } from 'express-validator';
import { CreateRatingObjectInput, UpdateRatingObjectInput, RatingObjectFilter } from './types/ratingObject';

export class RatingObjectController {
  private ratingObjectService: RatingObjectService;

  constructor(redis: Redis) {
    this.ratingObjectService = new RatingObjectService(redis);
  }

  /**
   * Create a new rating object
   */
  createRatingObject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const input: CreateRatingObjectInput = {
        ...req.body,
        creatorId: userId,
      };

      const ratingObject = await this.ratingObjectService.createRatingObject(input);

      res.status(201).json({
        success: true,
        data: ratingObject,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get rating object details with statistics
   */
  getRatingObjectDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const useCache = req.query.useCache !== 'false';

      if (!id) {
        throw new AppError('Rating object ID is required', 400);
      }

      const ratingObject = await this.ratingObjectService.getRatingObjectWithStats(id, useCache);

      if (!ratingObject) {
        throw new AppError('Rating object not found', 404);
      }

      res.json({
        success: true,
        data: ratingObject,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List rating objects with pagination and filtering
   */
  listRatingObjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const filter: RatingObjectFilter = {
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        creatorId: req.query.creatorId as string,
        status: req.query.status as 'active' | 'inactive' | 'deleted',
        visibility: req.query.visibility as 'public' | 'private',
        search: req.query.search as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await this.ratingObjectService.listRatingObjects({
        filter,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update rating object
   */
  updateRatingObject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';

      if (!id) {
        throw new AppError('Rating object ID is required', 400);
      }

      const input: UpdateRatingObjectInput = req.body;

      const ratingObject = await this.ratingObjectService.updateRatingObject(
        id,
        input,
        userId,
        isAdmin
      );

      res.json({
        success: true,
        data: ratingObject,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete/block rating object
   */
  deleteRatingObject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'moderator';

      if (!id) {
        throw new AppError('Rating object ID is required', 400);
      }

      await this.ratingObjectService.deleteRatingObject(id, userId, isAdmin);

      res.json({
        success: true,
        message: 'Rating object deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search rating objects by category, tags, etc.
   */
  searchRatingObjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const query = req.query.q as string;

      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters long', 400);
      }

      const result = await this.ratingObjectService.searchRatingObjects(query, page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get rating object creation validation rules
   */
  static get createValidationRules() {
    return [
      body('title')
        .isString()
        .notEmpty()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),
      body('category')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),
      body('tags')
        .optional()
        .isArray({ max: 20 })
        .withMessage('Maximum 20 tags allowed')
        .custom((tags: string[]) => {
          if (tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
            throw new Error('Each tag must be a string with maximum 50 characters');
          }
          return true;
        }),
      body('visibility')
        .optional()
        .isIn(['public', 'private'])
        .withMessage('Visibility must be either public or private'),
      body('allowAnonymousRatings')
        .optional()
        .isBoolean()
        .withMessage('allowAnonymousRatings must be a boolean'),
      body('allowComments')
        .optional()
        .isBoolean()
        .withMessage('allowComments must be a boolean'),
    ];
  }

  /**
   * Get rating object update validation rules
   */
  static get updateValidationRules() {
    return [
      body('title')
        .optional()
        .isString()
        .notEmpty()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),
      body('category')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Category must not exceed 100 characters'),
      body('tags')
        .optional()
        .isArray({ max: 20 })
        .withMessage('Maximum 20 tags allowed')
        .custom((tags: string[]) => {
          if (tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
            throw new Error('Each tag must be a string with maximum 50 characters');
          }
          return true;
        }),
      body('visibility')
        .optional()
        .isIn(['public', 'private'])
        .withMessage('Visibility must be either public or private'),
      body('allowAnonymousRatings')
        .optional()
        .isBoolean()
        .withMessage('allowAnonymousRatings must be a boolean'),
      body('allowComments')
        .optional()
        .isBoolean()
        .withMessage('allowComments must be a boolean'),
      body('status')
        .optional()
        .isIn(['active', 'inactive', 'deleted'])
        .withMessage('Status must be either active, inactive, or deleted'),
    ];
  }
}
