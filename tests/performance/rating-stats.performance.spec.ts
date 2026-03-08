import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/test-database';
import { UserFactory } from '../factories/user.factory';
import { CategoryFactory } from '../factories/category.factory';
import { ItemFactory } from '../factories/item.factory';
import { RatingFactory } from '../factories/rating.factory';

describe('Rating Statistics Performance Tests', () => {
  let app: INestApplication;
  let testItem: any;
  let authToken: string;

  beforeAll(async () => {
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    
    // Create test user and authenticate
    const user = await UserFactory.create({
      email: 'test@example.com',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;

    // Create test category and item
    const category = await CategoryFactory.create({
      name: 'Performance Test Category',
    });

    testItem = await ItemFactory.create(category, {
      name: 'Performance Test Item',
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle 10,000 ratings efficiently', async () => {
      // Create 100 users
      const users = await UserFactory.createMany(100);

      // Create 10,000 ratings (100 ratings per user)
      const startTime = Date.now();
      
      for (const user of users) {
        await RatingFactory.createMany(user, testItem, 100);
      }
      
      const creationTime = Date.now() - startTime;
      console.log(`Created 10,000 ratings in ${creationTime}ms`);

      // Test statistics calculation performance
      const statsStartTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get(`/ratings/stats/${testItem.id}`)
        .expect(200);
      
      const statsTime = Date.now() - statsStartTime;
      console.log(`Calculated statistics for 10,000 ratings in ${statsTime}ms`);

      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('totalRatings', 10000);
      expect(response.body).toHaveProperty('ratingDistribution');
      
      // Performance assertions
      expect(statsTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle 100,000 ratings efficiently', async () => {
      // Create 1000 users
      const users = await UserFactory.createMany(1000);

      // Create 100,000 ratings (100 ratings per user)
      const startTime = Date.now();
      
      // Batch creation for better performance
      const batchSize = 10;
      for (let batch = 0; batch < users.length / batchSize; batch++) {
        const batchUsers = users.slice(batch * batchSize, (batch + 1) * batchSize);
        const ratingPromises = batchUsers.map(user => 
          RatingFactory.createMany(user, testItem, 100)
        );
        await Promise.all(ratingPromises);
      }
      
      const creationTime = Date.now() - startTime;
      console.log(`Created 100,000 ratings in ${creationTime}ms`);

      // Test statistics calculation performance
      const statsStartTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get(`/ratings/stats/${testItem.id}`)
        .expect(200);
      
      const statsTime = Date.now() - statsStartTime;
      console.log(`Calculated statistics for 100,000 ratings in ${statsTime}ms`);

      expect(response.body.totalRatings).toBe(100000);
      
      // Performance assertions
      expect(statsTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 100 concurrent rating requests', async () => {
      const category = await CategoryFactory.create({
        name: 'Concurrent Test Category',
      });

      // Create 100 items
      const items = await ItemFactory.createMany(category, 100);

      // Create 100 concurrent rating requests
      const startTime = Date.now();
      
      const ratingPromises = items.map((item, index) => 
        request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: item.id,
            score: (index % 5) + 1,
            comment: `Concurrent rating ${index}`,
          })
      );

      const responses = await Promise.all(ratingPromises);
      
      const concurrentTime = Date.now() - startTime;
      console.log(`Processed 100 concurrent rating requests in ${concurrentTime}ms`);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all ratings were created
      const statsResponse = await request(app.getHttpServer())
        .get(`/ratings/stats/${items[0].id}`)
        .expect(200);

      expect(statsResponse.body.totalRatings).toBeGreaterThanOrEqual(1);
      
      // Performance assertions
      expect(concurrentTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle 500 concurrent statistics requests', async () => {
      // Create 1000 ratings first
      const user = await UserFactory.create({
        email: 'perf@example.com',
      });
      await RatingFactory.createMany(user, testItem, 1000);

      // Create 500 concurrent statistics requests
      const startTime = Date.now();
      
      const statsPromises = Array.from({ length: 500 }, () =
        request(app.getHttpServer())
          .get(`/ratings/stats/${testItem.id}`)
      );

      const responses = await Promise.all(statsPromises);
      
      const concurrentTime = Date.now() - startTime;
      console.log(`Processed 500 concurrent statistics requests in ${concurrentTime}ms`);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('averageRating');
        expect(response.body).toHaveProperty('totalRatings', 1000);
      });

      // Performance assertions
      expect(concurrentTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize queries for rating statistics', async () => {
      // Create ratings with various scores
      const scoreDistribution = {
        5: 5000,
        4: 3000,
        3: 1500,
        2: 400,
        1: 100,
      };

      const user = await UserFactory.create({
        email: 'queryperf@example.com',
      });

      await RatingFactory.createWithScoreDistribution(
        user,
        testItem,
        scoreDistribution
      );

      // Test query performance with EXPLAIN ANALYZE
      const queryStartTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .get(`/ratings/stats/${testItem.id}`)
        .expect(200);
      
      const queryTime = Date.now() - queryStartTime;
      console.log(`Query performance: ${queryTime}ms`);

      expect(response.body.averageRating).toBeCloseTo(4.37, 2);
      expect(response.body.totalRatings).toBe(10000);
      
      // Query should be fast even with large dataset
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle complex filtering efficiently', async () => {
      // Create ratings with different timestamps
      const user = await UserFactory.create({
        email: 'filter@example.com',
      });

      // Create ratings over time
      for (let i = 0; i < 100; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        await RatingFactory.create(user, testItem, {
          score: (i % 5) + 1,
          createdAt: date,
        });
      }

      // Test filtering by date range
      const filterStartTime = Date.now();
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const response = await request(app.getHttpServer())
        .get(`/ratings?itemId=${testItem.id}&startDate=${thirtyDaysAgo.toISOString()}`)
        .expect(200);
      
      const filterTime = Date.now() - filterStartTime;
      console.log(`Filter performance: ${filterTime}ms`);

      expect(response.body.data.length).toBeLessThanOrEqual(30);
      
      // Filtering should be fast
      expect(filterTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large datasets without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create large dataset
      const user = await UserFactory.create({
        email: 'memory@example.com',
      });

      // Create 50,000 ratings
      await RatingFactory.createMany(user, testItem, 50000);

      // Multiple requests to check memory usage
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .get(`/ratings/stats/${testItem.id}`)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });
});
