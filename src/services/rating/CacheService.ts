import { Redis } from 'ioredis';

export class CacheService {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redis: Redis, defaultTTL = 300) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const finalTTL = ttl || this.defaultTTL;
    await this.redis.setex(key, finalTTL, value);
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get multiple values by pattern
   */
  async getByPattern(pattern: string): Promise<Record<string, string>> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) {
      return {};
    }

    const values = await this.redis.mget(...keys);
    const result: Record<string, string> = {};
    
    keys.forEach((key, index) => {
      if (values[index] !== null) {
        result[key] = values[index] as string;
      }
    });

    return result;
  }

  /**
   * Clear all cache for rating objects
   */
  async clearRatingObjectCache(objectId: string): Promise<void> {
    const patterns = [
      `rating_object:${objectId}:*`,
      `rating_stats:rating_object:${objectId}`,
      `ratings:rating_object:${objectId}:*`,
    ];

    await Promise.all(patterns.map(pattern => this.delPattern(pattern)));
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    const patterns = [
      'rating_object:*',
      'rating_stats:*',
      'ratings:*',
    ];

    await Promise.all(patterns.map(pattern => this.delPattern(pattern)));
  }

  /**
   * Get cache health metrics
   */
  async getHealthMetrics(): Promise<{
    totalKeys: number;
    memoryUsage: number;
    uptime: number;
  }> {
    const info = await this.redis.info();
    const infoLines = info.split('\r\n');
    
    let totalKeys = 0;
    let memoryUsage = 0;
    let uptime = 0;

    infoLines.forEach(line => {
      if (line.startsWith('db0:keys=')) {
        totalKeys = parseInt(line.split(',')[0].split('=')[1]);
      } else if (line.startsWith('used_memory:')) {
        memoryUsage = parseInt(line.split(':')[1]);
      } else if (line.startsWith('uptime_in_seconds:')) {
        uptime = parseInt(line.split(':')[1]);
      }
    });

    return {
      totalKeys,
      memoryUsage,
      uptime,
    };
  }
}
