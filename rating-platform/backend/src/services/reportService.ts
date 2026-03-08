import { pool } from '../config/database';
import { Report, CreateReportDTO, ReportFilters, ReportStatistics } from '../models/Report';
import { AppError } from '../utils/errors';

export class ReportService {
  /**
   * Submit a new report
   */
  async submitReport(reporterId: number | null, data: CreateReportDTO): Promise<Report> {
    const { target_type, target_id, reason } = data;

    // Validate reason length
    if (reason.length < 10 || reason.length > 500) {
      throw new AppError('Reason must be between 10 and 500 characters', 400);
    }

    // Check if target exists based on type
    await this.validateTargetExists(target_type, target_id);

    // Check for duplicate report from same reporter on same target
    if (reporterId) {
      const duplicate = await pool.query(
        'SELECT id FROM reports WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3 AND status = $4',
        [reporterId, target_type, target_id, 'pending']
      );

      if (duplicate.rows.length > 0) {
        throw new AppError('You have already reported this item', 409);
      }
    }

    // Create the report
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [reporterId, target_type, target_id, reason]
    );

    return result.rows[0];
  }

  /**
   * Get reports with filters
   */
  async getReports(filters: ReportFilters): Promise<{ reports: Report[]; total: number }> {
    const { status, target_type, reporter_id, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        r.*,
        u.username as reporter_username,
        u.email as reporter_email
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (target_type) {
      query += ` AND r.target_type = $${paramIndex}`;
      params.push(target_type);
      paramIndex++;
    }

    if (reporter_id) {
      query += ` AND r.reporter_id = $${paramIndex}`;
      params.push(reporter_id);
      paramIndex++;
    }

    query += ` ORDER BY r.created_at DESC`;

    // Get total count
    const countQuery = query.replace(
      'SELECT r.*, u.username as reporter_username, u.email as reporter_email',
      'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return { reports: result.rows, total };
  }

  /**
   * Get report by ID
   */
  async getReportById(id: number): Promise<Report | null> {
    const result = await pool.query(
      `SELECT 
        r.*,
        u.username as reporter_username,
        u.email as reporter_email
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      WHERE r.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update report status
   */
  async updateReportStatus(id: number, status: 'resolved' | 'dismissed'): Promise<Report> {
    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Report not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Get report statistics for admin dashboard
   */
  async getReportStatistics(): Promise<ReportStatistics> {
    const totalResult = await pool.query('SELECT COUNT(*) FROM reports');
    const pendingResult = await pool.query('SELECT COUNT(*) FROM reports WHERE status = $1', ['pending']);
    const resolvedResult = await pool.query('SELECT COUNT(*) FROM reports WHERE status = $1', ['resolved']);
    const dismissedResult = await pool.query('SELECT COUNT(*) FROM reports WHERE status = $1', ['dismissed']);

    const byTypeResult = await pool.query(`
      SELECT 
        target_type,
        COUNT(*) as count
      FROM reports
      GROUP BY target_type
    `);

    const byType = {
      rating: 0,
      comment: 0,
      object: 0
    };

    byTypeResult.rows.forEach(row => {
      byType[row.target_type as keyof typeof byType] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.rows[0].count),
      pending: parseInt(pendingResult.rows[0].count),
      resolved: parseInt(resolvedResult.rows[0].count),
      dismissed: parseInt(dismissedResult.rows[0].count),
      byType
    };
  }

  /**
   * Validate that the report target exists
   */
  private async validateTargetExists(type: string, id: number): Promise<void> {
    let query = '';

    switch (type) {
      case 'rating':
        query = 'SELECT id FROM ratings WHERE id = $1';
        break;
      case 'comment':
        query = 'SELECT id FROM comments WHERE id = $1';
        break;
      case 'object':
        query = 'SELECT id FROM rating_objects WHERE id = $1';
        break;
      default:
        throw new AppError('Invalid target type', 400);
    }

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      throw new AppError('Report target not found', 404);
    }
  }

  /**
   * Get detailed report information including target details
   */
  async getReportDetails(id: number): Promise<any> {
    const report = await this.getReportById(id);
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    let targetDetails = null;

    // Fetch target details based on type
    switch (report.target_type) {
      case 'rating':
        const ratingResult = await pool.query(`
          SELECT 
            r.*,
            u.username,
            ro.name as object_name
          FROM ratings r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN rating_objects ro ON r.object_id = ro.id
          WHERE r.id = $1
        `, [report.target_id]);
        targetDetails = ratingResult.rows[0];
        break;

      case 'comment':
        const commentResult = await pool.query(`
          SELECT 
            c.*,
            u.username,
            ro.name as object_name
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          LEFT JOIN rating_objects ro ON c.object_id = ro.id
          WHERE c.id = $1
        `, [report.target_id]);
        targetDetails = commentResult.rows[0];
        break;

      case 'object':
        const objectResult = await pool.query(`
          SELECT 
            ro.*,
            u.username as creator_username
          FROM rating_objects ro
          LEFT JOIN users u ON ro.creator_id = u.id
          WHERE ro.id = $1
        `, [report.target_id]);
        targetDetails = objectResult.rows[0];
        break;
    }

    return {
      report,
      targetDetails
    };
  }
}

export const reportService = new ReportService();
