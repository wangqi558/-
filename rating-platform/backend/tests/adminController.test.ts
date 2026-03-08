import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

describe('AdminController', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: number;
  let testObjectId: number;
  let testRatingId: number;
  let testReportId: number;

  beforeAll(async () => {
    // Create admin user
    const adminResult = await pool.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['admin@admin.com', 'adminuser', '$2b$10$test', 'admin']
    );
    const adminId = adminResult.rows[0].id;

    // Create regular user
    const userResult = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['user@admin.com', 'regularuser', '$2b$10$test']
    );
    testUserId = userResult.rows[0].id;

    // Create test object
    const objectResult = await pool.query(
      'INSERT INTO rating_objects (title, description, creator_id) VALUES ($1, $2, $3) RETURNING id',
      ['Admin Test Product', 'Product for admin tests', testUserId]
    );
    testObjectId = objectResult.rows[0].id;

    // Create test rating
    const ratingResult = await pool.query(
      'INSERT INTO ratings (object_id, user_id, score, comment) VALUES ($1, $2, $3, $4) RETURNING id',
      [testObjectId, testUserId, 5, 'Great product!']
    );
    testRatingId = ratingResult.rows[0].id;

    // Create test report
    const reportResult = await pool.query(
      'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUserId, 'rating', testRatingId, 'Inappropriate content']
    );
    testReportId = reportResult.rows[0].id;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/login')
      .send({
        email: 'admin@admin.com',
        password: 'password'
      });
    adminToken = adminLogin.body.access_token;

    // Login as regular user
    const userLogin = await request(app)
      .post('/api/login')
      .send({
        email: 'user@admin.com',
        password: 'password'
      });
    userToken = userLogin.body.access_token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM reports WHERE id = $1', [testReportId]);
    await pool.query('DELETE FROM ratings WHERE id = $1', [testRatingId]);
    await pool.query('DELETE FROM rating_objects WHERE id = $1', [testObjectId]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', ['admin@admin.com', 'user@admin.com']);
  });

  describe('GET /api/admin/reports', () => {
    it('should get all reports as admin', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body.reports.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/admin/reports?status=resolved')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.reports.every((report: any) => report.status === 'resolved')).toBe(true);
    });

    it('should not allow regular users to access reports', async () => {
      await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should not allow unauthenticated access', async () => {
      await request(app)
        .get('/api/admin/reports')
        .expect(401);
    });
  });

  describe('POST /api/admin/objects/:id/block', () => {
    it('should block an object as admin', async () => {
      const response = await request(app)
        .post(`/api/admin/objects/${testObjectId}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Object blocked successfully');
      expect(response.body.object.status).toBe('blocked');

      // Verify object is blocked
      const checkResult = await pool.query(
        'SELECT status FROM rating_objects WHERE id = $1',
        [testObjectId]
      );
      expect(checkResult.rows[0].status).toBe('blocked');
    });

    it('should return 404 for non-existent object', async () => {
      await request(app)
        .post('/api/admin/objects/99999/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should not allow regular users to block objects', async () => {
      await request(app)
        .post(`/api/admin/objects/${testObjectId}/block`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/admin/ratings/:id', () => {
    it('should delete a rating as admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/ratings/${testRatingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Rating deleted successfully');

      // Verify rating is deleted
      const checkResult = await pool.query(
        'SELECT id FROM ratings WHERE id = $1',
        [testRatingId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for non-existent rating', async () => {
      await request(app)
        .delete('/api/admin/ratings/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should not allow regular users to delete ratings', async () => {
      await request(app)
        .delete('/api/admin/ratings/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/users/:id/suspend', () => {
    it('should suspend a user as admin', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ duration: 7 })
        .expect(200);

      expect(response.body.message).toBe('User suspended successfully');
      expect(response.body).toHaveProperty('affected_objects');
    });

    it('should not allow regular users to suspend users', async () => {
      await request(app)
        .post(`/api/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/reports/:id/resolve', () => {
    it('should resolve a report as admin', async () => {
      const response = await request(app)
        .post(`/api/admin/reports/${testReportId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'resolve',
          reason: 'Content removed'
        })
        .expect(200);

      expect(response.body.message).toBe('Report resolved successfully');
      expect(response.body.report.status).toBe('resolved');
    });

    it('should dismiss a report as admin', async () => {
      // Create new report to dismiss
      const newReportResult = await pool.query(
        'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUserId, 'rating', testRatingId, 'False report']
      );
      const newReportId = newReportResult.rows[0].id;

      const response = await request(app)
        .post(`/api/admin/reports/${newReportId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'dismiss',
          reason: 'No violation found'
        })
        .expect(200);

      expect(response.body.message).toBe('Report dismissed successfully');
      expect(response.body.report.status).toBe('dismissed');

      // Clean up
      await pool.query('DELETE FROM reports WHERE id = $1', [newReportId]);
    });

    it('should return 404 for non-existent report', async () => {
      await request(app)
        .post('/api/admin/reports/99999/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});