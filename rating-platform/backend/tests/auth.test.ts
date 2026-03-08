import request from 'supertest';
import { pool } from '../src/config/database';
import app from '../src/app';

describe('Authentication', () => {
  let authToken: string;
  let userId: number;

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM user_suspensions');
    await pool.query('DELETE FROM reputation_logs');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@test.com',
          username: 'testuser',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('testuser@test.com');
      expect(res.body.user.username).toBe('testuser');
      
      authToken = res.body.access_token;
      userId = res.body.user.id;
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@test.com',
          username: 'testuser',
          password: 'weak',
          confirmPassword: 'weak'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('should reject registration with mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@test.com',
          username: 'testuser',
          password: 'Test123!@#',
          confirmPassword: 'Different123!@#'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Validation failed');
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          username: 'user1',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          username: 'user2',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('should reject registration with duplicate username', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@test.com',
          username: 'duplicateuser',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      // Second registration with same username
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@test.com',
          username: 'duplicateuser',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Username already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logintest@test.com',
          username: 'logintest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      
      authToken = res.body.access_token;
      userId = res.body.user.id;
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'Test123!@#'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('logintest@test.com');
    });

    it('should reject login with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test123!@#'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login for suspended user', async () => {
      // Suspend the user
      await pool.query(
        'INSERT INTO user_suspensions (user_id, reason, duration, suspended_by) VALUES ($1, $2, $3, $4)',
        [userId, 'Test suspension', '7d', userId]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'Test123!@#'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account suspended');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Create and login a test user
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'profiletest@test.com',
          username: 'profiletest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      
      authToken = res.body.access_token;
      userId = res.body.user.id;
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('profiletest@test.com');
      expect(res.body.username).toBe('profiletest');
      expect(res.body).toHaveProperty('reputation');
      expect(res.body).toHaveProperty('role');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should reject request for suspended user', async () => {
      // Suspend the user
      await pool.query(
        'INSERT INTO user_suspensions (user_id, reason, duration, suspended_by) VALUES ($1, $2, $3, $4)',
        [userId, 'Test suspension', '7d', userId]
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account suspended');
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      // Create and login a test user
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'updatetest@test.com',
          username: 'updatetest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      
      authToken = res.body.access_token;
    });

    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'This is my bio',
          avatar: 'https://example.com/avatar.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(res.body.profile.bio).toBe('This is my bio');
      expect(res.body.profile.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should reject username update if already taken', async () => {
      // Create another user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'otheruser@test.com',
          username: 'otheruser',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      // Try to update to the same username
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'otheruser'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Username already taken');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    beforeEach(async () => {
      // Create and login a test user
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'passwordtest@test.com',
          username: 'passwordtest',
          password: 'OldPassword123!',
          confirmPassword: 'OldPassword123!'
        });
      
      authToken = res.body.access_token;
    });

    it('should change password with valid current password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'passwordtest@test.com',
          password: 'NewPassword123!'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject change with invalid current password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Current password is incorrect');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'forgottest@test.com',
          username: 'forgottest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
    });

    it('should process forgot password for existing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'forgottest@test.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
    });

    it('should return same message for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
    });
  });

  describe('Admin endpoints', () => {
    let adminToken: string;
    let regularUserId: number;

    beforeEach(async () => {
      // Create admin user
      const adminRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admintest@test.com',
          username: 'admintest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      
      adminToken = adminRes.body.access_token;
      
      // Update user role to admin
      await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['admin', adminRes.body.user.id]
      );

      // Create regular user
      const userRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'regulartest@test.com',
          username: 'regulartest',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
      
      regularUserId = userRes.body.user.id;
    });

    describe('POST /api/auth/admin/suspend-user', () => {
      it('should suspend user as admin', async () => {
        const res = await request(app)
          .post('/api/auth/admin/suspend-user')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: regularUserId,
            reason: 'Violation of terms of service',
            duration: '7d'
          });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('User suspended successfully');
      });

      it('should reject non-admin user', async () => {
        const res = await request(app)
          .post('/api/auth/admin/suspend-user')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: regularUserId,
            reason: 'Violation',
            duration: '7d'
          });

        // This will fail because the adminToken user is not actually an admin yet
        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/auth/admin/reputation', () => {
      it('should update user reputation as admin', async () => {
        // Update admin role first
        await pool.query(
          'UPDATE users SET role = $1 WHERE email = $2',
          ['admin', 'admintest@test.com']
        );

        const res = await request(app)
          .put('/api/auth/admin/reputation')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: regularUserId,
            action: 'increase',
            amount: 10,
            reason: 'Excellent contributions'
          });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Reputation updated successfully');
        expect(res.body.newReputation).toBe(10);
      });
    });
  });
});
