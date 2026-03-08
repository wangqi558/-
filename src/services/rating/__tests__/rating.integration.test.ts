import request from 'supertest';
import { createApp } from '../../../app';
import { Redis } from 'ioredis';
import { createRatingRoutes } from '../rating.routes';
import { db } from '../../../db';
import { ratings, ratingStatistics } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

// Setup test Redis
const testRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  db: 15, // Use different DB for tests
});

describe('Rating Service Integration Tests', () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    // Create app with rating routes
    app = createApp();
    app.use('/api', createRatingRoutes(testRedis));

    // Clear test data
    await testRedis.flushdb();
    await db.delete(ratings);
    await db.delete(ratingStatistics);

    // Create a test user and get auth token
    // This would normally be done through your auth service
    authToken = 'test-token';
  });

  afterAll(async () => {
    await testRedis.quit();
    await db.delete(ratings);
    await db.delete(ratingStatistics);
  });

  afterEach(async () => {
    await testRedis.flushdb();
    await db.delete(ratings);
    await db.delete(ratingStatistics);
  });

  describe('POST /api/ratings', () => {
    it('should submit a rating successfully', async () => {
      const ratingData = {
        targetId: 'product123',
        targetType: 'product',
        rating: 5,
        comment: 'Excellent product!',
      };

      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.1')
        .send(ratingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        targetId: ratingData.targetId,
        targetType: ratingData.targetType,
        rating: ratingData.rating,
        comment: ratingData.comment,
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should handle anonymous ratings', async () => {
      const ratingData = {
        targetId: 'product456',
        targetType: 'product',
        rating: 4,
      };

      const response = await request(app)
        .post('/api/ratings')
        .set('X-Forwarded-For', '192.168.1.2')
        .send(ratingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBeUndefined();
    });

    it('should prevent duplicate ratings', async () => {
      const ratingData = {
        targetId: 'product789',
        targetType: 'product',
        rating: 3,
      };

      // First rating
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.3')
        .send(ratingData)
        .expect(201);

      // Duplicate rating
      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.3')
        .send(ratingData)
        .expect(409);

      expect(response.body.error).toContain('already rated');
    });

    it('should validate rating value', async () => {
      const invalidData = {
        targetId: 'product123',
        targetType: 'product',
        rating: 6, // Invalid rating
      };

      const response = await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });
  });

  describe('GET /api/ratings/statistics/:targetId/:targetType', () => {
    beforeEach(async () => {
      // Add test ratings
      const testRatings = [
        { targetId: 'product-stats', targetType: 'product', rating: 5, ipAddress: '192.168.1.1' },
        { targetId: 'product-stats', targetType: 'product', rating: 4, ipAddress: '192.168.1.2' },
        { targetId: 'product-stats', targetType: 'product', rating: 4, ipAddress: '192.168.1.3' },
        { targetId: 'product-stats', targetType: 'product', rating: 3, ipAddress: '192.168.1.4' },
      ];

      for (const rating of testRatings) {
        await request(app)
          .post('/api/ratings')
          .set('X-Forwarded-For', rating.ipAddress)
          .send({
            targetId: rating.targetId,
            targetType: rating.targetType,
            rating: rating.rating,
          });
      }
    });

    it('should return rating statistics', async () => {
      const response = await request(app)
        .get('/api/ratings/statistics/product-stats/product')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        targetId: 'product-stats',
        targetType: 'product',
        averageRating: 4,
        totalRatings: 4,
        ratingDistribution: {
          '3': 1,
          '4': 2,
          '5': 1,
        },
      });
    });

    it('should use cache on subsequent requests', async () => {
      // First request - should hit database
      const response1 = await request(app)
        .get('/api/ratings/statistics/product-stats/product?useCache=true')
        .expect(200);

      expect(response1.body.data.lastCalculated).toBeDefined();

      // Second request - should use cache
      const response2 = await request(app)
        .get('/api/ratings/statistics/product-stats/product?useCache=true')
        .expect(200);

      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should bypass cache when requested', async () => {
      const response = await request(app)
        .get('/api/ratings/statistics/product-stats/product?useCache=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRatings).toBe(4);
    });
  });

  describe('GET /api/ratings/has-rated/:targetId/:targetType', () => {
    it('should check if user has rated', async () => {
      const targetId = 'check-rated';
      const targetType = 'product';

      // User hasn't rated yet
      const response1 = await request(app)
        .get(`/api/ratings/has-rated/${targetId}/${targetType}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.5')
        .expect(200);

      expect(response1.body.data.hasRated).toBe(false);

      // Submit a rating
      await request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.5')
        .send({
          targetId,
          targetType,
          rating: 4,
        })
        .expect(201);

      // Check again
      const response2 = await request(app)
        .get(`/api/ratings/has-rated/${targetId}/${targetType}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.5')
        .expect(200);

      expect(response2.body.data.hasRated).toBe(true);
    });
  });

  describe('Admin cache operations', () => {
    it('should clear cache for specific targets', async () => {
      const targets = [
        { targetId: 'product1', targetType: 'product' },
        { targetId: 'service1', targetType: 'service' },
      ];

      const response = await request(app)
        .post('/api/admin/ratings/cache/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targets })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache cleared successfully');
    });

    it('should clear all cache when no targets specified', async () => {
      const response = await request(app)
        .post('/api/admin/ratings/cache/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache cleared successfully');
    });

    it('should warm up cache', async () => {
      const response = await request(app)
        .post('/api/admin/ratings/cache/warmup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache warmed up successfully');
    });

    it('should get cache health status', async () => {
      const response = await request(app)
        .get('/api/admin/ratings/cache/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('healthy');
      expect(typeof response.body.data.healthy).toBe('boolean');
    });
  });
});
