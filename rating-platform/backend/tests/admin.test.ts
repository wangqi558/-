import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';

describe('Admin and Report Management', () => {
  let adminToken: string;
  let userToken: string;
  let testObjectId: number;
  let testRatingId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Create test users
    const adminResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      ['admin_test', 'admin@test.com', 'hashed_password', 'admin']
    );

    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      ['user_test', 'user@test.com', 'hashed_password', 'user']
    );

    testUserId = userResult.rows[0].id;

    // Generate tokens
    adminToken = jwt.sign(
      { id: adminResult.rows[0].id, email: 'admin@test.com', role: 'admin' },
      config.JWT_SECRET
    );

    userToken = jwt.sign(
      { id: userResult.rows[0].id, email: 'user@test.com', role: 'user' },
      config.JWT_SECRET
    );

    // Create test object
    const objectResult = await pool.query(
      'INSERT INTO rating_objects (name, description, category, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Test Product', 'A test product', 'Electronics', testUserId]
    );

    testObjectId = objectResult.rows[0].id;

    // Create test rating
    const ratingResult = await pool.query(
      'INSERT INTO ratings (object_id, user_id, score, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [testObjectId, testUserId, 5, 'Great product!']
    );

    testRatingId = ratingResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')');
    await pool.query('DELETE FROM ratings WHERE object_id IN (SELECT id FROM rating_objects WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))');
    await pool.query('DELETE FROM rating_objects WHERE creator_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')');
    await pool.query('DELETE FROM users WHERE email LIKE '%@test.com'');
  });

  describe('Report Submission', () => {
    it('should allow authenticated users to report a rating', async () => {
      const response = await request(app)
        .post(`/api/ratings/${testRatingId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'This rating is fake and misleading'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Rating reported successfully');
      expect(response.body.report).toHaveProperty('id');
      expect(response.body.report.target_type).toBe('rating');
    });

    it('should allow authenticated users to report an object', async () => {
      const response = await request(app)
        .post(`/api/objects/${testObjectId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'This object contains false information'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Object reported successfully');
      expect(response.body.report).toHaveProperty('id');
      expect(response.body.report.target_type).toBe('object');
    });

    it('should reject reports with short reason', async () => {
      const response = await request(app)
        .post(`/api/ratings/${testRatingId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Bad'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('between 10 and 500 characters');
    });

    it('should prevent duplicate reports from same user', async () => {
      // First report
      await request(app)
        .post(`/api/ratings/${testRatingId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'This rating violates guidelines'
        });

      // Duplicate report
      const response = await request(app)
        .post(`/api/ratings/${testRatingId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'This rating is inappropriate'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('You have already reported this item');
    });
  });

  describe('Admin Report Management', () => {
    it('should allow admins to view all reports', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/admin/reports?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should filter reports by target type', async () => {
      const response = await request(app)
        .get('/api/admin/reports?target_type=rating')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.every((r: any) => r.target_type === 'rating')).toBe(true);
    });

    it('should allow admins to view report details', async () => {
      // Get a report ID
      const reportsResponse = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      const reportId = reportsResponse.body.reports[0].id;

      const response = await request(app)
        .get(`/api/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('report');
      expect(response.body).toHaveProperty('targetDetails');
    });

    it('should allow admins to get report statistics', async () => {
      const response = await request(app)
        .get('/api/admin/reports/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('resolved');
      expect(response.body).toHaveProperty('dismissed');
      expect(response.body).toHaveProperty('byType');
    });

    it('should allow admins to resolve a report', async () => {
      // Get a pending report
      const reportsResponse = await request(app)
        .get('/api/admin/reports?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      if (reportsResponse.body.reports.length > 0) {
        const reportId = reportsResponse.body.reports[0].id;

        const response = await request(app)
          .post(`/api/admin/reports/${reportId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'resolve',
            reason: 'Content reviewed and appropriate action taken'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Report resolved successfully');
        expect(response.body.report.status).toBe('resolved');
      }
    });

    it('should allow admins to dismiss a report', async () => {
      // Get a pending report
      const reportsResponse = await request(app)
        .get('/api/admin/reports?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      if (reportsResponse.body.reports.length > 0) {
        const reportId = reportsResponse.body.reports[0].id;

        const response = await request(app)
          .post(`/api/admin/reports/${reportId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'dismiss',
            reason: 'Report found to be without merit'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Report dismissed successfully');
        expect(response.body.report.status).toBe('dismissed');
      }
    });
  });

  describe('Admin Actions', () => {
    it('should allow admins to block an object', async () => {
      const response = await request(app)
        .post(`/api/admin/objects/${testObjectId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Object violates community guidelines'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Object blocked successfully');
      expect(response.body.object.status).toBe('blocked');
    });

    it('should allow admins to delete a rating', async () => {
      const response = await request(app)
        .delete(`/api/admin/ratings/${testRatingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Rating deleted successfully');
    });

    it('should allow admins to suspend a user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          duration: 7,
          reason: 'Repeated violations of community guidelines'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User suspended successfully');
      expect(response.body).toHaveProperty('suspended_until');
    });

    it('should prevent self-suspension', async () => {
      // Get admin user ID
      const adminResult = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@test.com']);
      const adminId = adminResult.rows[0].id;

      const response = await request(app)
        .post(`/api/admin/users/${adminId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          duration: 7,
          reason: 'Trying to suspend myself'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot suspend yourself');
    });
  });

  describe('Admin Dashboard', () => {
    it('should allow admins to view action history', async () => {
      const response = await request(app)
        .get('/api/admin/actions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('actions');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter admin actions by type', async () => {
      const response = await request(app)
        .get('/api/admin/actions?action_type=block_object')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.actions.every((a: any) => a.action_type === 'block_object')).toBe(true);
    });

    it('should allow admins to get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('objects');
      expect(response.body).toHaveProperty('ratings');
      expect(response.body).toHaveProperty('suspended_users');
    });
  });

  describe('Authorization', () => {
    it('should reject non-admin users from admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });
});
