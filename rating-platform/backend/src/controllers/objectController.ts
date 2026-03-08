import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { getObjectStats } from '../services/ratingService';
import { cacheGet, cacheSet } from '../config/redis';

export const createObject = async (req: AuthRequest, res: Response) => {
  const { title, description, category, tags, allow_comments, visibility } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rating_objects (title, description, category, tags, allow_comments, visibility, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, category, tags, allow_comments !== false, visibility || 'public', req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create object error:', error);
    res.status(500).json({ error: 'Failed to create rating object' });
  }
};

export const getObject = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `object:${id}`;

  try {
    // 尝试从缓存获取
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 获取对象详情
    const objectResult = await pool.query(`
      SELECT
        ro.*,
        u.id as creator_id,
        u.username as creator_username,
        u.reputation as creator_reputation
      FROM rating_objects ro
      LEFT JOIN users u ON ro.creator_id = u.id
      WHERE ro.id = $1 AND ro.status = 'active'
    `, [id]);

    if (objectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Object not found' });
    }

    const obj = objectResult.rows[0];

    // 获取统计信息
    const stats = await getObjectStats(parseInt(id));

    // 获取最近评论
    const commentsResult = await pool.query(`
      SELECT
        r.id,
        r.score,
        r.comment,
        r.anonymous,
        r.created_at,
        CASE WHEN r.anonymous = false THEN u.id END as reviewer_id,
        CASE WHEN r.anonymous = false THEN u.username END as reviewer_username
      FROM ratings r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.object_id = $1 AND r.comment IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [id]);

    const response = {
      id: obj.id,
      title: obj.title,
      description: obj.description,
      category: obj.category,
      tags: obj.tags,
      creator_summary: {
        id: obj.creator_id,
        username: obj.creator_username,
        reputation: obj.creator_reputation
      },
      avg_score: stats.avg_score,
      vote_count: stats.vote_count,
      score_distribution: stats.distribution,
      recent_comments: commentsResult.rows.map(row => ({
        id: row.id,
        score: row.score,
        comment: row.comment,
        anonymous: row.anonymous,
        reviewer: row.reviewer_id ? {
          id: row.reviewer_id,
          username: row.reviewer_username
        } : null,
        created_at: row.created_at
      })),
      allow_comments: obj.allow_comments,
      visibility: obj.visibility,
      status: obj.status,
      created_at: obj.created_at
    };

    // 缓存结果（1分钟TTL）
    await cacheSet(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    console.error('Get object error:', error);
    res.status(500).json({ error: 'Failed to get object' });
  }
};

export const listObjects = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, category, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    let query = `
      SELECT
        ro.*,
        u.id as creator_id,
        u.username as creator_username,
        u.reputation as creator_reputation,
        COUNT(r.id) as rating_count,
        ROUND(AVG(r.score)::numeric, 2) as avg_score
      FROM rating_objects ro
      LEFT JOIN users u ON ro.creator_id = u.id
      LEFT JOIN ratings r ON ro.id = r.object_id
      WHERE ro.status = 'active' AND ro.visibility = 'public'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND ro.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (ro.title ILIKE $${paramIndex} OR ro.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY ro.id, u.id, u.username, u.reputation
      ORDER BY ro.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      objects: result.rows,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: result.rows.length
    });
  } catch (error) {
    console.error('List objects error:', error);
    res.status(500).json({ error: 'Failed to list objects' });
  }
};
/**
 * Submit a report for an object
 */
export const reportObject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return res.status(400).json({ error: 'Invalid object ID' });
    }

    if (!reason || reason.length < 10 || reason.length > 500) {
      return res.status(400).json({ error: 'Reason must be between 10 and 500 characters' });
    }

    // Submit report
    const report = await reportService.submitReport(
      req.user?.id || null,
      {
        target_type: 'object',
        target_id: objectId,
        reason
      }
    );

    res.status(201).json({
      message: 'Object reported successfully',
      report
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Report object error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
