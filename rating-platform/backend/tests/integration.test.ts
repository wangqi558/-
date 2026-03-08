import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';
import { redis } from '../src/config/redis';

describe('Integration Tests', () => {
  let authToken: string;
  let userId: number;
  let objectId: number;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['integration@test.com', 'integrationuser', '$2b$10$test']
    );
    userId = userResult.rows[0].id;

    // Login
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: 'integration@test.com',
        password: 'password'
      });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ratings WHERE object_id = $1', [objectId]);
    await pool.query('DELETE FROM rating_objects WHERE id = $1', [objectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await redis.quit();
  });

  describe('Full Rating Flow', () => {
    it('should complete full rating flow', async () => {
      // 1. Create rating object
      const createResponse = await request(app)
        .post('/api/objects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Product',
          description: 'Testing the full flow',
          category: 'Test',
          tags: ['integration', 'test'],
          allow_comments: true,
          visibility: 'public'
        });

      expect(createResponse.status).toBe(201);
      objectId = createResponse.body.id;

      // 2. Submit multiple ratings
      const ratings = [
        { score: 5, comment: 'Excellent!' },
        { score: 4, comment: 'Good' },
        { score: 3, comment: 'Average' },
        { score: 5, comment: 'Great!' },
        { score: 4, comment: 'Not bad' }
      ];

      for (const rating of ratings) {
        const ratingResponse = await request(app)
          .post(`/api/objects/${objectId}/ratings`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(rating);

        expect(ratingResponse.status).toBe(200);
      }

      // 3. Get object with statistics
      const objectResponse = await request(app)
        .get(`/api/objects/${objectId}`);

      expect(objectResponse.status).toBe(200);
      expect(objectResponse.body.avg_score).toBeCloseTo(4.2, 1);
      expect(objectResponse.body.vote_count).toBe(5);
      expect(objectResponse.body.score_distribution[5]).toBe(2);
      expect(objectResponse.body.score_distribution[4]).toBe(2);
      expect(objectResponse.body.score_distribution[3]).toBe(1);
      expect(objectResponse.body.recent_comments).toHaveLength(5);

      // 4. Get ratings list
      const ratingsResponse = await request(app)
        .get(`/api/objects/${objectId}/ratings`);

      expect(ratingsResponse.status).toBe(200);
      expect(ratingsResponse.body.ratings).toHaveLength(5);
      expect(ratingsResponse.body.total).toBe(5);

      // 5. Update existing rating
      const updateResponse = await request(app)
        .post(`/api/objects/${objectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 2,
          comment: 'Changed my mind'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.stats.vote_count).toBe(5);
      expect(updateResponse.body.stats.avg_score).toBeCloseTo(3.6, 1);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 70 }, () =
        request(app)
          .get('/api/objects')
          .set('X-Forwarded-For', '192.168.1.1')
      );

      const responses = await Promise.allSettled(requests);

      // Count rate limited responses
      const rateLimited = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(rateLimited).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close pool to simulate connection error
      await pool.end();

      const response = await request(app)
        .get('/api/objects/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Reconnect
      await pool.connect();
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/signup')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle large payloads', async () => {
      const largeData = {
        title: 'a'.repeat(10000),
        description: 'b'.repeat(10000)
      };

      const response = await request(app)
        .post('/api/objects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData)
        .expect(413);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/objects/1');

      expect(response.headers).toHaveProperty('x-powered-by', 'Express');
      expect(response.headers).toHaveProperty('content-type');
    });
  });

  describe('Caching', () => {
    it('should cache object details', async () => {
      // First request
      const response1 = await request(app)
        .get(`/api/objects/${objectId}`);

      expect(response1.status).toBe(200);

      // Second request should be faster (from cache)
      const start = Date.now();
      const response2 = await request(app)
        .get(`/api/objects/${objectId}`);
      const duration = Date.now() - start;

      expect(response2.status).toBe(200);
      expect(duration).toBeLessThan(50); // Should be very fast from cache
    });
  });
});