import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { submitRating } from '../services/ratingService';
import crypto from 'crypto';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
  return ip || 'unknown';
};

const hashIp = (ip: string): string => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

export const createRating = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { score, comment, anonymous } = req.body;

  // Validate score
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be between 1 and 5' });
  }

  // Validate comment length
  if (comment && comment.length > 1000) {
    return res.status(400).json({ error: 'Comment must be less than 1000 characters' });
  }

  try {
    // Check if object exists and is active
    const objectResult = await pool.query(
      'SELECT id, allow_comments FROM rating_objects WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (objectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Object not found' });
    }

    const object = objectResult.rows[0];

    // Check if comments are allowed
    if (comment && !object.allow_comments) {
      return res.status(400).json({ error: 'Comments are not allowed for this object' });
    }

    // Get IP hash for anonymous users
    const ipHash = req.user ? undefined : hashIp(getClientIp(req));

    // Submit rating
    const stats = await submitRating({
      objectId: parseInt(id),
      score,
      comment,
      anonymous: anonymous || false,
      ipHash
    }, req.user?.id);

    res.json({
      message: 'Rating submitted successfully',
      stats
    });
  } catch (error: any) {
    console.error('Create rating error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({ error: 'You have already rated this object' });
    }

    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

export const getRatings = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    // Get ratings with pagination
    const result = await pool.query(`
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
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM ratings WHERE object_id = $1 AND comment IS NOT NULL',
      [id]
    );

    res.json({
      ratings: result.rows.map(row => ({
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
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
};
/**
 * Submit a report for a rating
 */
export const reportRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ratingId = parseInt(id);

    if (isNaN(ratingId)) {
      return res.status(400).json({ error: 'Invalid rating ID' });
    }

    if (!reason || reason.length < 10 || reason.length > 500) {
      return res.status(400).json({ error: 'Reason must be between 10 and 500 characters' });
    }

    // Submit report
    const report = await reportService.submitReport(
      req.user?.id || null,
      {
        target_type: 'rating',
        target_id: ratingId,
        reason
      }
    );

    res.status(201).json({
      message: 'Rating reported successfully',
      report
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Report rating error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
