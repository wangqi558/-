import { db } from '../../../db';
import { ratings, ratingStatistics } from '../../../db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { Rating, RatingStatistics, RatingFilter } from './types';
import { RatingNotFoundError, RatingStatsNotFoundError } from './errors';

export class RatingRepository {
  /**
   * Create a new rating with transaction support
   */
  async createRating(ratingData: Omit<Rating, 'id' | 'createdAt' | 'updatedAt'>, tx = db): Promise<Rating> {
    const [rating] = await tx.insert(ratings)
      .values({
        ...ratingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return rating;
  }

  /**
   * Find rating by user and target
   */
  async findByUserAndTarget(
    userId: string | undefined,
    ipHash: string,
    targetId: string,
    targetType: string
  ): Promise<Rating | null> {
    const conditions = [
      eq(ratings.targetId, targetId),
      eq(ratings.targetType, targetType),
    ];

    if (userId) {
      conditions.push(eq(ratings.userId, userId));
    } else {
      conditions.push(eq(ratings.ipHash, ipHash));
    }

    const [rating] = await db.select()
      .from(ratings)
      .where(and(...conditions))
      .limit(1);

    return rating || null;
  }

  /**
   * Find ratings with filters
   */
  async findWithFilters(filter: RatingFilter): Promise<Rating[]> {
    const conditions: any[] = [];

    if (filter.targetId) {
      conditions.push(eq(ratings.targetId, filter.targetId));
    }
    if (filter.targetType) {
      conditions.push(eq(ratings.targetType, filter.targetType));
    }
    if (filter.userId) {
      conditions.push(eq(ratings.userId, filter.userId));
    }
    if (filter.ipHash) {
      conditions.push(eq(ratings.ipHash, filter.ipHash));
    }
    if (filter.rating) {
      conditions.push(eq(ratings.rating, filter.rating));
    }
    if (filter.startDate) {
      conditions.push(gte(ratings.createdAt, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(ratings.createdAt, filter.endDate));
    }

    const results = await db.select()
      .from(ratings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ratings.createdAt));

    return results;
  }

  /**
   * Get rating statistics for a target
   */
  async getRatingStatistics(
    targetId: string,
    targetType: string
  ): Promise<RatingStatistics | null> {
    const [stats] = await db.select()
      .from(ratingStatistics)
      .where(
        and(
          eq(ratingStatistics.targetId, targetId),
          eq(ratingStatistics.targetType, targetType)
        )
      )
      .limit(1);

    return stats || null;
  }

  /**
   * Create or update rating statistics
   */
  async upsertRatingStatistics(
    statsData: Omit<RatingStatistics, 'lastCalculated'>,
    tx = db
  ): Promise<RatingStatistics> {
    const [stats] = await tx.insert(ratingStatistics)
      .values({
        ...statsData,
        lastCalculated: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          ratingStatistics.targetId,
          ratingStatistics.targetType,
        ],
        set: {
          averageRating: statsData.averageRating,
          totalRatings: statsData.totalRatings,
          ratingDistribution: statsData.ratingDistribution,
          lastCalculated: new Date(),
        },
      })
      .returning();

    return stats;
  }

  /**
   * Calculate rating statistics from raw ratings
   */
  async calculateStatistics(
    targetId: string,
    targetType: string
  ): Promise<RatingStatistics> {
    const results = await db.select({
      rating: ratings.rating,
      count: sql<number>`count(*)`,
    })
      .from(ratings)
      .where(
        and(
          eq(ratings.targetId, targetId),
          eq(ratings.targetType, targetType)
        )
      )
      .groupBy(ratings.rating);

    if (results.length === 0) {
      return {
        targetId,
        targetType,
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        lastCalculated: new Date(),
      };
    }

    let totalRatings = 0;
    let sumRatings = 0;
    const distribution: { [key: number]: number } = {};

    results.forEach(({ rating, count }) => {
      totalRatings += count;
      sumRatings += rating * count;
      distribution[rating] = count;
    });

    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    return {
      targetId,
      targetType,
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      ratingDistribution: distribution,
      lastCalculated: new Date(),
    };
  }

  /**
   * Delete rating statistics
   */
  async deleteRatingStatistics(
    targetId: string,
    targetType: string,
    tx = db
  ): Promise<void> {
    await tx.delete(ratingStatistics)
      .where(
        and(
          eq(ratingStatistics.targetId, targetId),
          eq(ratingStatistics.targetType, targetType)
        )
      );
  }

  /**
   * Get all rating statistics for cache warmup
   */
  async getAllRatingStatistics(): Promise<RatingStatistics[]> {
    return await db.select()
      .from(ratingStatistics);
  }
}
