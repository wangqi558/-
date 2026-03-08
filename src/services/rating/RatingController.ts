import { Request, Response, NextFunction } from 'express';
import { RatingService } from './RatingService';
import { Redis } from 'ioredis';
import { getClientIP } from './utils/ipHash';
import { AppError } from '../../errors/AppError';

export class RatingController {
  private ratingService: RatingService;

  constructor(redis: Redis) {
    this.ratingService = new RatingService(redis);
  }

  /**
   * Submit a rating
   */
  submitRating = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetId, targetType, rating, comment } = req.body;
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);

      if (!targetId || !targetType || !rating) {
        throw new AppError('Missing required fields', 400);
      }

      const newRating = await this.ratingService.submitRating({
        userId,
        targetId,
        targetType,
        rating: Number(rating),
        comment,
        ipAddress,
      });

      res.status(201).json({
        success: true,
        data: {
          id: newRating.id,
          targetId: newRating.targetId,
          targetType: newRating.targetType,
          rating: newRating.rating,
          comment: newRating.comment,
          createdAt: newRating.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get rating statistics
   */
  getRatingStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetId, targetType } = req.params;
      const useCache = req.query.useCache !== 'false';

      if (!targetId || !targetType) {
        throw new AppError('Missing targetId or targetType', 400);
      }

      const statistics = await this.ratingService.getRatingStatistics({
        targetId,
        targetType,
        useCache,
      });

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user has rated
   */
  hasUserRated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetId, targetType } = req.params;
      const userId = req.user?.id;
      const ipAddress = getClientIP(req);

      if (!targetId || !targetType) {
        throw new AppError('Missing targetId or targetType', 400);
      }

      const hasRated = await this.ratingService.hasUserRated(
        userId,
        ipAddress,
        targetId,
        targetType
      );

      res.json({
        success: true,
        data: { hasRated },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ratings for a target
   */
  getRatingsForTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetId, targetType } = req.params;
      const limit = Number(req.query.limit) || 50;

      if (!targetId || !targetType) {
        throw new AppError('Missing targetId or targetType', 400);
      }

      const ratings = await this.ratingService.getRatingsForTarget(
        targetId,
        targetType,
        Math.min(limit, 100) // Max 100 ratings
      );

      res.json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear cache (admin only)
   */
  clearCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targets } = req.body;

      if (targets && Array.isArray(targets)) {
        await this.ratingService.clearCacheForTargets(targets);
      } else {
        await this.ratingService.clearAllCache();
      }

      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Warm up cache (admin only)
   */
  warmupCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.ratingService.warmupCache();

      res.json({
        success: true,
        message: 'Cache warmed up successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get cache health status
   */
  getCacheHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.ratingService.getCacheHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  };
}
