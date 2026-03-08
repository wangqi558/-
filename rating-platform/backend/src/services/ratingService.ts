import { pool } from '../config/database';
import { redis, cacheGet, cacheSet, cacheDel } from '../config/redis';
import { RatingInput, ObjectStats } from '../types';
import { PoolClient } from 'pg';

export const updateObjectStats = async (objectId: number, dbClient: PoolClient): Promise<ObjectStats> => {
  // 使用事务确保数据一致性
  await dbClient.query('BEGIN');

  try {
    // 获取总体统计 - 使用 numeric 类型确保精度
    const statsResult = await dbClient.query(`
      SELECT
        COUNT(*) as vote_count,
        ROUND(AVG(score)::numeric, 2) as avg_score
      FROM ratings
      WHERE object_id = $1
    `, [objectId]);

    // 获取分数分布
    const distributionResult = await dbClient.query(`
      SELECT
        score,
        COUNT(*) as count
      FROM ratings
      WHERE object_id = $1
      GROUP BY score
      ORDER BY score
    `, [objectId]);

    // 构建分布对象，确保所有分数都有值
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionResult.rows.forEach(row => {
      distribution[row.score] = parseInt(row.count);
    });

    await dbClient.query('COMMIT');

    return {
      vote_count: parseInt(statsResult.rows[0].vote_count),
      avg_score: statsResult.rows[0].avg_score ? parseFloat(statsResult.rows[0].avg_score) : null,
      distribution
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  }
};

// 提交评分时使用事务确保原子性
export const submitRating = async (ratingData: RatingInput, userId?: number): Promise<ObjectStats> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 检查是否已评分（登录用户）
    if (userId) {
      const existing = await client.query(`
        SELECT id FROM ratings
        WHERE object_id = $1 AND user_id = $2
      `, [ratingData.objectId, userId]);

      if (existing.rows.length > 0) {
        // 更新现有评分
        await client.query(`
          UPDATE ratings
          SET score = $1, comment = $2, updated_at = NOW()
          WHERE id = $3
        `, [ratingData.score, ratingData.comment, existing.rows[0].id]);
      } else {
        // 插入新评分
        await client.query(`
          INSERT INTO ratings (object_id, user_id, score, comment, anonymous, source_ip_hash)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [ratingData.objectId, userId, ratingData.score, ratingData.comment,
            ratingData.anonymous, ratingData.ipHash]);
      }
    } else {
      // 匿名用户，使用IP哈希检查
      const existing = await client.query(`
        SELECT id FROM ratings
        WHERE object_id = $1 AND user_id IS NULL AND source_ip_hash = $2
      `, [ratingData.objectId, ratingData.ipHash]);

      if (existing.rows.length > 0) {
        // 更新现有匿名评分
        await client.query(`
          UPDATE ratings
          SET score = $1, comment = $2, updated_at = NOW()
          WHERE id = $3
        `, [ratingData.score, ratingData.comment, existing.rows[0].id]);
      } else {
        // 插入新匿名评分
        await client.query(`
          INSERT INTO ratings (object_id, score, comment, anonymous, source_ip_hash)
          VALUES ($1, $2, $3, true, $4)
        `, [ratingData.objectId, ratingData.score, ratingData.comment, ratingData.ipHash]);
      }
    }

    // 更新对象统计
    const stats = await updateObjectStats(ratingData.objectId, client);

    // 清除缓存
    await clearRatingCache(ratingData.objectId);

    await client.query('COMMIT');
    return stats;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 缓存清除函数
const clearRatingCache = async (objectId: number) => {
  try {
    // 清除评分统计缓存
    await cacheDel(`stats:${objectId}`);

    // 清除对象详情缓存
    await cacheDel(`object:${objectId}`);

    // 清除评分列表缓存（如果有分页缓存）
    const pattern = `ratings:${objectId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
    // 缓存清除失败不影响主流程
  }
};

// 获取对象统计（带缓存）
export const getObjectStats = async (objectId: number): Promise<ObjectStats> => {
  const cacheKey = `stats:${objectId}`;

  // 尝试从缓存获取
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // 缓存未命中，从数据库获取
  const client = await pool.connect();
  try {
    const stats = await updateObjectStats(objectId, client);
    // 写入缓存（5分钟TTL）
    await cacheSet(cacheKey, stats, 300);
    return stats;
  } finally {
    client.release();
  }
};