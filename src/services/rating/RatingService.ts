import { Redis } from 'ioredis';
import { db } from '../../../db';
import { RatingRepository } from './RatingRepository';
import { RatingCacheService } from './RatingCacheService';
import { hashIPAddress, isValidIPAddress } from './utils/ipHash';
import {
  Rating,
  RatingStatistics,
  SubmitRatingInput,
  GetRatingStatsInput,
  UpdateRatingStatsInput,
  RatingCacheKey,
} from './types';
import {
  DuplicateRatingError,
  InvalidRatingError,
  RatingStatsNotFoundError,
} from './errors';

export class RatingService {
  private ratingRepository: RatingRepository;
  private ratingCacheService: RatingCacheService;

  constructor(redis: Redis) {
    this.ratingRepository = new RatingRepository();
    this.ratingCacheService = new RatingCacheService(redis);
  }

  /**
   * Submit a rating with transaction support
   */
  async submitRating(input: SubmitRatingInput): Promise<Rating> {
    const { userId, targetId, targetType, rating, comment, ipAddress } = input;

    // Validate rating value
    if (rating < 1 || rating > 5) {
      throw new InvalidRatingError('Rating must be between 1 and 5');
    }

    // Validate IP address
    if (!isValidIPAddress(ipAddress)) {
      throw new InvalidRatingError('Invalid IP address');
    }

    // Hash IP address
    const ipHash = hashIPAddress(ipAddress);

    // Check for duplicate rating
    const existingRating = await this.ratingRepository.findByUserAndTarget(
      userId,
      ipHash,
      targetId,
      targetType
    );

    if (existingRating) {
      throw new DuplicateRatingError();
    }

    // Create rating in a transaction
    let newRating: Rating;
    await db.transaction(async (tx) => {
      // Create the rating
      newRating = await this.ratingRepository.createRating(
        {
          userId,
          ipHash,
          targetId,
          targetType,
          rating,
          comment,
        },
        tx
      );

      // Update statistics
      await this.updateRatingStatistics(
        { targetId, targetType },
        tx
      );
    });

    // Clear cache for this target
    const cacheKey: RatingCacheKey = { targetId, targetType };
    await this.ratingCacheService.delete(cacheKey);

    return newRating!;
  }

  /**
   * Get rating statistics with caching
   */
  async getRatingStatistics(
    input: GetRatingStatsInput
  ): Promise<RatingStatistics> {
    const { targetId, targetType, useCache = true } = input;
    const cacheKey: RatingCacheKey = { targetId, targetType };

    // Try to get from cache first
    if (useCache) {
      const cachedStats = await this.ratingCacheService.get(cacheKey);
      if (cachedStats) {
        return cachedStats;
      }
    }

    // Get from database
    let stats = await this.ratingRepository.getRatingStatistics(
      targetId,
      targetType
    );

    // If no stats exist, calculate them
    if (!stats) {
      stats = await this.ratingRepository.calculateStatistics(
        targetId,
        targetType
      );

      // Save to database
      stats = await this.ratingRepository.upsertRatingStatistics(stats);
    }

    // Cache the result
    if (useCache) {
      await this.ratingCacheService.set(cacheKey, stats);
    }

    return stats;
  }

  /**
   * Update rating statistics
   */
  async updateRatingStatistics(
    input: UpdateRatingStatsInput,
    tx = db
  ): Promise<RatingStatistics> {
    const { targetId, targetType } = input;

    // Calculate new statistics
    const newStats = await this.ratingRepository.calculateStatistics(
      targetId,
      targetType
    );

    // Save to database
    const updatedStats = await this.ratingRepository.upsertRatingStatistics(
      newStats,
      tx
    );

    // Clear cache
    const cacheKey: RatingCacheKey = { targetId, targetType };
    await this.ratingCacheService.delete(cacheKey);

    return updatedStats;
  }

  /**
   * Check if user/IP has already rated
   */
  async hasUserRated(
    userId: string | undefined,
    ipAddress: string,
    targetId: string,
    targetType: string
  ): Promise<boolean> {
    const ipHash = hashIPAddress(ipAddress);
    const existingRating = await this.ratingRepository.findByUserAndTarget(
      userId,
      ipHash,
      targetId,
      targetType
    );

    return !!existingRating;
  }

  /**
   * Get ratings for a specific target
   */
  async getRatingsForTarget(
    targetId: string,
    targetType: string,
    limit?: number
  ): Promise<Rating[]> {
    return await this.ratingRepository.findWithFilters({
      targetId,
      targetType,
    });
  }

  /**
   * Clear cache for specific targets
   */
  async clearCacheForTargets(
    targets: Array<{ targetId: string; targetType: string }>
  ): Promise<void> {
    const cacheKeys: RatingCacheKey[] = targets.map(({ targetId, targetType }) => ({
      targetId,
      targetType,
    }));

    await this.ratingCacheService.deleteMultiple(cacheKeys);
  }

  /**
   * Clear all rating cache
   */
  async clearAllCache(): Promise<void> {
    await this.ratingCacheService.clearAll();
  }

  /**
   * Warm up cache with all rating statistics
   */
  async warmupCache(): Promise<void> {
    const allStats = await this.ratingRepository.getAllRatingStatistics();
    await this.ratingCacheService.warmup(allStats);
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<{ healthy: boolean }> {
    const healthy = await this.ratingCacheService.isHealthy();
    return { healthy };
  }
}
