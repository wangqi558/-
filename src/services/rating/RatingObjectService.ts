import { Redis } from 'ioredis';
import { db } from '../../db';
import { AppError } from '../../errors/AppError';
import { CacheService } from './CacheService';
import { 
  RatingObject, 
  RatingObjectWithStats, 
  CreateRatingObjectInput, 
  UpdateRatingObjectInput,
  RatingObjectFilter,
  RatingObjectSearchOptions,
  RatingObjectListResponse
} from './types/ratingObject';
import { RatingService } from './RatingService';

export class RatingObjectService {
  private redis: Redis;
  private ratingService: RatingService;
  private cacheService: CacheService;

  constructor(redis: Redis) {
    this.redis = redis;
    this.ratingService = new RatingService(redis);
    this.cacheService = new CacheService(redis, 300); // 5 minutes default TTL
  }

  /**
   * Create a new rating object
   */
  async createRatingObject(input: CreateRatingObjectInput): Promise<RatingObject> {
    const { title, description, category, tags = [], creatorId, visibility = 'public', allowAnonymousRatings = true, allowComments = true } = input;

    // Validate creator exists if provided
    if (creatorId) {
      const userExists = await db.query('SELECT id FROM users WHERE id = $1', [creatorId]);
      if (userExists.rows.length === 0) {
        throw new AppError('Creator user not found', 404);
      }
    }

    const result = await db.query(
      `INSERT INTO rating_objects (title, description, category, tags, creator_id, visibility, allow_anonymous_ratings, allow_comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, category, tags, creatorId, visibility, allowAnonymousRatings, allowComments]
    );

    return this.mapRowToRatingObject(result.rows[0]);
  }

  /**
   * Get rating object by ID
   */
  async getRatingObjectById(id: string): Promise<RatingObject | null> {
    const result = await db.query('SELECT * FROM rating_objects WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRatingObject(result.rows[0]);
  }

  /**
   * Get rating object with statistics
   */
  async getRatingObjectWithStats(id: string, useCache = true): Promise<RatingObjectWithStats | null> {
    // Try to get from cache first
    if (useCache) {
      const cached = await this.cacheService.get(`rating_object:${id}:with_stats`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get rating object
    const ratingObject = await this.getRatingObjectById(id);
    if (!ratingObject) {
      return null;
    }

    // Get statistics
    const statistics = await this.ratingService.getRatingStatistics({
      targetId: id,
      targetType: 'rating_object',
      useCache,
    });

    const result: RatingObjectWithStats = {
      ...ratingObject,
      statistics: {
        averageRating: statistics.averageRating,
        totalRatings: statistics.totalRatings,
        ratingDistribution: statistics.ratingDistribution,
      },
    };

    // Cache the result
    if (useCache) {
      await this.cacheService.set(
        `rating_object:${id}:with_stats`,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * List rating objects with pagination and filtering
   */
  async listRatingObjects(options: RatingObjectSearchOptions): Promise<RatingObjectListResponse> {
    const { filter, page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      whereClause += ` AND tags \u0026\u0026 $${paramIndex++}`;
      params.push(filter.tags);
    }

    if (filter.creatorId) {
      whereClause += ` AND creator_id = $${paramIndex++}`;
      params.push(filter.creatorId);
    }

    if (filter.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(filter.status);
    } else {
      // Default to only active objects unless admin
      whereClause += ` AND status = 'active'`;
    }

    if (filter.visibility) {
      whereClause += ` AND visibility = $${paramIndex++}`;
      params.push(filter.visibility);
    }

    if (filter.search) {
      whereClause += ` AND (title ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
      const searchPattern = `%${filter.search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (filter.startDate) {
      whereClause += ` AND created_at \u003e= $${paramIndex++}`;
      params.push(filter.startDate);
    }

    if (filter.endDate) {
      whereClause += ` AND created_at \u003c= $${paramIndex++}`;
      params.push(filter.endDate);
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM rating_objects ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Build ORDER BY clause
    const validSortColumns = ['createdAt', 'updatedAt', 'title'];
    const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get rating objects
    const result = await db.query(
      `SELECT * FROM rating_objects 
       ${whereClause}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    // Get statistics for each object
    const objectsWithStats = await Promise.all(
      result.rows.map(async (row) => {
        const ratingObject = this.mapRowToRatingObject(row);
        const statistics = await this.ratingService.getRatingStatistics({
          targetId: ratingObject.id,
          targetType: 'rating_object',
          useCache: true,
        });

        return {
          ...ratingObject,
          statistics: {
            averageRating: statistics.averageRating,
            totalRatings: statistics.totalRatings,
            ratingDistribution: statistics.ratingDistribution,
          },
        };
      })
    );

    // Apply rating filter if specified
    let filteredObjects = objectsWithStats;
    if (filter.minRating || filter.maxRating) {
      filteredObjects = objectsWithStats.filter(obj => {
        const avgRating = obj.statistics.averageRating;
        if (filter.minRating && avgRating < filter.minRating) return false;
        if (filter.maxRating && avgRating > filter.maxRating) return false;
        return true;
      });
    }

    return {
      data: filteredObjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update rating object
   */
  async updateRatingObject(
    id: string, 
    input: UpdateRatingObjectInput, 
    userId?: string, 
    isAdmin = false
  ): Promise<RatingObject> {
    // Get existing rating object
    const existing = await this.getRatingObjectById(id);
    if (!existing) {
      throw new AppError('Rating object not found', 404);
    }

    // Check permissions
    if (!isAdmin && existing.creatorId !== userId) {
      throw new AppError('You can only update your own rating objects', 403);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(input.title);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }

    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(input.category);
    }

    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(input.tags);
    }

    if (input.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}`);
      params.push(input.visibility);
    }

    if (input.allowAnonymousRatings !== undefined) {
      updates.push(`allow_anonymous_ratings = $${paramIndex++}`);
      params.push(input.allowAnonymousRatings);
    }

    if (input.allowComments !== undefined) {
      updates.push(`allow_comments = $${paramIndex++}`);
      params.push(input.allowComments);
    }

    if (input.status !== undefined) {
      // Only admins can change status
      if (!isAdmin) {
        throw new AppError('Only administrators can change the status', 403);
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
      `UPDATE rating_objects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // Clear cache
    await this.cacheService.clearRatingObjectCache(id);

    return this.mapRowToRatingObject(result.rows[0]);
  }

  /**
   * Delete/block rating object
   */
  async deleteRatingObject(id: string, userId?: string, isAdmin = false): Promise<void> {
    // Get existing rating object
    const existing = await this.getRatingObjectById(id);
    if (!existing) {
      throw new AppError('Rating object not found', 404);
    }

    // Check permissions
    if (!isAdmin && existing.creatorId !== userId) {
      throw new AppError('You can only delete your own rating objects', 403);
    }

    // For non-admins, just mark as deleted
    if (!isAdmin) {
      await db.query(
        'UPDATE rating_objects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['deleted', id]
      );
    } else {
      // Admins can fully delete
      await db.query('DELETE FROM rating_objects WHERE id = $1', [id]);
    }

    // Clear cache
    await this.cacheService.clearRatingObjectCache(id);
  }

  /**
   * Search rating objects
   */
  async searchRatingObjects(query: string, page: number, limit: number): Promise<RatingObjectListResponse> {
    const offset = (page - 1) * limit;

    // Search in title and description
    const searchPattern = `%${query}%`;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM rating_objects 
       WHERE (title ILIKE $1 OR description ILIKE $1) 
       AND status = 'active' 
       AND visibility = 'public'`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get matching objects
    const result = await db.query(
      `SELECT * FROM rating_objects 
       WHERE (title ILIKE $1 OR description ILIKE $1) 
       AND status = 'active' 
       AND visibility = 'public'
       ORDER BY 
         CASE 
           WHEN title ILIKE $1 THEN 1 
           WHEN description ILIKE $1 THEN 2 
           ELSE 3 
         END,
         created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    // Get statistics for each object
    const objectsWithStats = await Promise.all(
      result.rows.map(async (row) => {
        const ratingObject = this.mapRowToRatingObject(row);
        const statistics = await this.ratingService.getRatingStatistics({
          targetId: ratingObject.id,
          targetType: 'rating_object',
          useCache: true,
        });

        return {
          ...ratingObject,
          statistics: {
            averageRating: statistics.averageRating,
            totalRatings: statistics.totalRatings,
            ratingDistribution: statistics.ratingDistribution,
          },
        };
      })
    );

    return {
      data: objectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Map database row to RatingObject
   */
  private mapRowToRatingObject(row: any): RatingObject {
    return {
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags || [],
      creatorId: row.creator_id?.toString(),
      status: row.status,
      visibility: row.visibility,
      allowAnonymousRatings: row.allow_anonymous_ratings,
      allowComments: row.allow_comments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
