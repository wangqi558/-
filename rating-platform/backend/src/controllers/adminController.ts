import { Request, Response } from 'express';
import { pool } from '../config/database';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { ratingService } from '../services/ratingService';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../utils/errors';
import { body, validationResult } from 'express-validator';

/**
 * Validation rules for admin actions
 */
export const adminValidation = {
  suspendUser: [
    body('duration').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be between 1 and 365 days'),
    body('reason').optional().isString().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
  ],
  
  resolveReport: [
    body('action').isIn(['resolve', 'dismiss']).withMessage('Action must be either resolve or dismiss'),
    body('reason').optional().isString().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
  ],

  blockObject: [
    body('reason').optional().isString().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
  ]
};

/**
 * Get all reports with optional filters
 */
export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { status, target_type, page = '1', limit = '20' } = req.query;
    
    const filters = {
      status: status as 'pending' | 'resolved' | 'dismissed' | undefined,
      target_type: target_type as 'rating' | 'comment' | 'object' | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const { reports, total } = await reportService.getReports(filters);

    res.json({
      reports,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
};

/**
 * Get report details including target information
 */
export const getReportDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const reportDetails = await reportService.getReportDetails(reportId);
    res.json(reportDetails);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get report details error:', error);
    res.status(500).json({ error: 'Failed to get report details' });
  }
};

/**
 * Get report statistics for dashboard
 */
export const getReportStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await reportService.getReportStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({ error: 'Failed to get report statistics' });
  }
};

/**
 * Block a rating object
 */
export const blockObject = async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return res.status(400).json({ error: 'Invalid object ID' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Block the object
      const result = await client.query(
        'UPDATE rating_objects SET status = $1 WHERE id = $2 RETURNING *',
        ['blocked', objectId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Object not found' });
      }

      // Log admin action if reason provided
      if (reason) {
        await client.query(
          'INSERT INTO admin_actions (admin_id, action_type, target_id, reason) VALUES ($1, $2, $3, $4)',
          [req.user!.id, 'block_object', objectId, reason]
        );
      }

      await client.query('COMMIT');

      res.json({ 
        message: 'Object blocked successfully', 
        object: result.rows[0] 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Block object error:', error);
    res.status(500).json({ error: 'Failed to block object' });
  }
};

/**
 * Delete a rating
 */
export const deleteRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ratingId = parseInt(id);

    if (isNaN(ratingId)) {
      return res.status(400).json({ error: 'Invalid rating ID' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the rating first to update stats
      const ratingResult = await client.query(
        'SELECT object_id, user_id, score FROM ratings WHERE id = $1',
        [ratingId]
      );

      if (ratingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Rating not found' });
      }

      const { object_id, user_id, score } = ratingResult.rows[0];

      // Delete the rating
      await client.query('DELETE FROM ratings WHERE id = $1', [ratingId]);

      // Update object statistics
      await ratingService.recalculateObjectStats(object_id, client);

      // Log admin action
      await client.query(
        'INSERT INTO admin_actions (admin_id, action_type, target_id, reason) VALUES ($1, $2, $3, $4)',
        [req.user!.id, 'delete_rating', ratingId, 'Rating deleted by admin']
      );

      await client.query('COMMIT');

      res.json({ message: 'Rating deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
};

/**
 * Suspend a user
 */
export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { duration = 30, reason } = req.body; // Default 30 days suspension
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent self-suspension
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot suspend yourself' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate suspension expiration
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + duration);

      // Create suspension record
      await client.query(
        `INSERT INTO user_suspensions (user_id, suspended_by, suspended_until, reason) 
         VALUES ($1, $2, $3, $4)`,
        [userId, req.user!.id, suspendedUntil, reason || 'Suspended by admin']
      );

      // Block all user's objects
      const result = await client.query(
        'UPDATE rating_objects SET status = $1 WHERE creator_id = $2 AND status != $1 RETURNING *',
        ['blocked', userId]
      );

      // Log admin action
      await client.query(
        'INSERT INTO admin_actions (admin_id, action_type, target_id, reason, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user!.id, 'suspend_user', userId, reason || `Suspended for ${duration} days`, JSON.stringify({ duration, affected_objects: result.rows.length })]
      );

      await client.query('COMMIT');

      res.json({
        message: 'User suspended successfully',
        suspended_until: suspendedUntil,
        affected_objects: result.rows.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

/**
 * Resolve or dismiss a report
 */
export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { action, reason } = req.body;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update report status
      const status = action === 'resolve' ? 'resolved' : 'dismissed';
      const report = await reportService.updateReportStatus(reportId, status);

      // Log admin action
      await client.query(
        'INSERT INTO admin_actions (admin_id, action_type, target_id, reason) VALUES ($1, $2, $3, $4)',
        [req.user!.id, 'resolve_report', reportId, reason || `Report ${status}`]
      );

      await client.query('COMMIT');

      res.json({
        message: `Report ${status} successfully`,
        report
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

/**
 * Get admin action history
 */
export const getAdminActions = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', admin_id, action_type } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        aa.*,
        a.username as admin_username,
        a.email as admin_email
      FROM admin_actions aa
      LEFT JOIN users a ON aa.admin_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (admin_id) {
      query += ` AND aa.admin_id = $${paramIndex}`;
      params.push(admin_id);
      paramIndex++;
    }

    if (action_type) {
      query += ` AND aa.action_type = $${paramIndex}`;
      params.push(action_type);
      paramIndex++;
    }

    query += ` ORDER BY aa.created_at DESC`;

    // Get total count
    const countQuery = query.replace(
      'SELECT aa.*, a.username as admin_username, a.email as admin_email',
      'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      actions: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin actions error:', error);
    res.status(500).json({ error: 'Failed to get admin actions' });
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Get report statistics
    const reportStats = await reportService.getReportStatistics();

    // Get user statistics
    const userStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
      FROM users
    `);

    // Get object statistics
    const objectStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_objects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_objects,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_objects,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_objects_30d
      FROM rating_objects
    `);

    // Get rating statistics
    const ratingStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_ratings_30d,
        AVG(score) as average_score
      FROM ratings
    `);

    // Get suspended users count
    const suspendedUsersResult = await pool.query(`
      SELECT COUNT(*) as suspended_users
      FROM user_suspensions
      WHERE suspended_until > NOW()
    `);

    res.json({
      reports: reportStats,
      users: userStatsResult.rows[0],
      objects: objectStatsResult.rows[0],
      ratings: ratingStatsResult.rows[0],
      suspended_users: suspendedUsersResult.rows[0].suspended_users
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};
