import { Redis } from 'ioredis';
import { RatingStatistics, RatingCacheKey } from './types';
import { RatingCacheError } from './errors';

export class RatingCacheService {
  private redis: Redis;
  private readonly CACHE_PREFIX = 'rating:stats:';
  private readonly CACHE_TTL = 60 * 60; // 1 hour

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(key: RatingCacheKey): string {
    return `${this.CACHE_PREFIX}${key.targetType}:${key.targetId}`;
  }

  /**
   * Get rating statistics from cache
   */
  async get(key: RatingCacheKey): Promise<RatingStatistics | null> {
    try {
      const cacheKey = this.generateCacheKey(key);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as RatingStatistics;
    } catch (error) {
      throw new RatingCacheError(`Failed to get rating statistics from cache: ${error}`);
    }
  }

  /**
   * Set rating statistics in cache
   */
  async set(key: RatingCacheKey, stats: RatingStatistics): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key);
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(stats)
      );
    } catch (error) {
      throw new RatingCacheError(`Failed to set rating statistics in cache: ${error}`);
    }
  }

  /**
   * Delete rating statistics from cache
   */
  async delete(key: RatingCacheKey): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      throw new RatingCacheError(`Failed to delete rating statistics from cache: ${error}`);
    }
  }

  /**
   * Delete multiple rating statistics from cache
   */
  async deleteMultiple(keys: RatingCacheKey[]): Promise<void> {
    try {
      if (keys.length === 0) return;

      const cacheKeys = keys.map(key => this.generateCacheKey(key));
      await this.redis.del(...cacheKeys);
    } catch (error) {
      throw new RatingCacheError(`Failed to delete multiple rating statistics from cache: ${error}`);
    }
  }

  /**
   * Clear all rating statistics cache
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      throw new RatingCacheError(`Failed to clear all rating statistics cache: ${error}`);
    }
  }

  /**
   * Warm up cache with rating statistics
   */
  async warmup(statsList: RatingStatistics[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const stats of statsList) {
        const key: RatingCacheKey = {
          targetId: stats.targetId,
          targetType: stats.targetType,
        };
        const cacheKey = this.generateCacheKey(key);
        
        pipeline.setex(cacheKey, this.CACHE_TTL, JSON.stringify(stats));
      }

      await pipeline.exec();
    } catch (error) {
      throw new RatingCacheError(`Failed to warm up rating statistics cache: ${error}`);
    }
  }

  /**
   * Check if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
