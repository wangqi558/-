import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/test-database';
import { UserFactory } from '../factories/user.factory';
import { CategoryFactory } from '../factories/category.factory';
import { ItemFactory } from '../factories/item.factory';
import { RatingFactory } from '../factories/rating.factory';

describe('SQL Injection Security Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    await initializeTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    
    // Create test user and authenticate
    await UserFactory.create({
      email: 'security@example.com',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'security@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  describe('Auth endpoints', () => {
    it('should prevent SQL injection in login endpoint', async () => {
      const maliciousPayloads = [
        {
          email: "admin' OR '1'='1",
          password: 'password',
        },
        {
          email: "admin'--",
          password: 'password',
        },
        {
          email: "admin'; DROP TABLE users;--",
          password: 'password',
        },
        {
          email: "admin' UNION SELECT * FROM users--",
          password: 'password',
        },
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(payload)
          .expect(401);

        // Should not reveal database errors
        expect(response.body.message).not.toContain('SQL');
        expect(response.body.message).not.toContain('syntax');
        expect(response.body.message).not.toContain('error');
      }
    });

    it('should prevent SQL injection in register endpoint', async () => {
      const maliciousPayload = {
        email: "test@test.com'; DROP TABLE users;--",
        password: 'Password123!',
        firstName: "Test'; DROP TABLE users;--",
        lastName: "User'; DROP TABLE users;--",
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(maliciousPayload)
        .expect(400);

      // Check that database is still intact
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'security@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
    });
  });

  describe('Rating endpoints', () => {
    let testItem: any;

    beforeEach(async () => {
      const category = await CategoryFactory.create({
        name: 'Security Test Category',
      });

      testItem = await ItemFactory.create(category, {
        name: 'Security Test Item',
      });
    });

    it('should prevent SQL injection in rating creation', async () => {
      const maliciousPayloads = [
        {
          itemId: "1 OR 1=1",
          score: 5,
          comment: "Great'; DROP TABLE ratings;--",
        },
        {
          itemId: "1; DROP TABLE ratings;--",
          score: 5,
          comment: 'Good product',
        },
        {
          itemId: testItem.id,
          score: 5,
          comment: "' OR '1'='1",
        },
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        // Should either validate input or return safe error
        if (response.status === 400) {
          expect(response.body.message).not.toContain('SQL');
          expect(response.body.message).not.toContain('syntax');
        }
      }

      // Verify database is intact
      const ratingsResponse = await request(app.getHttpServer())
        .get(`/ratings?itemId=${testItem.id}`)
        .expect(200);

      expect(ratingsResponse.body).toHaveProperty('data');
    });

    it('should prevent SQL injection in rating queries', async () => {
      // First create a rating
      const rating = await RatingFactory.create(
        { id: 1 } as any,
        testItem,
        { score: 4, comment: 'Test' }
      );

      const maliciousQueries = [
        `itemId=${testItem.id} OR 1=1`,
        `itemId=${testItem.id}; DROP TABLE ratings;--`,
        `itemId=${testItem.id} UNION SELECT * FROM users`,
        `itemId=${testItem.id}' OR '1'='1`,
      ];

      for (const query of maliciousQueries) {
        const response = await request(app.getHttpServer())
          .get(`/ratings?${query}`)
          .expect(400); // Should validate input

        expect(response.body.message).not.toContain('SQL');
        expect(response.body.message).not.toContain('error');
      }
    });

    it('should prevent SQL injection in rating update', async () => {
      const rating = await RatingFactory.create(
        { id: 1 } as any,
        testItem,
        { score: 3, comment: 'Original' }
      );

      const maliciousPayloads = [
        {
          score: 5,
          comment: "'; UPDATE ratings SET score=5 WHERE 1=1;--",
        },
        {
          score: 5,
          comment: "' OR 1=1;--",
        },
      ];

      for (const payload of maliciousPayloads) {
        await request(app.getHttpServer())
          .put(`/ratings/${rating.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload)
          .expect(200); // Should sanitize input

        // Verify only the intended rating was updated
        const response = await request(app.getHttpServer())
          .get(`/ratings/${rating.id}`)
          .expect(200);

        expect(response.body.id).toBe(rating.id);
      }
    });
  });

  describe('User endpoints', () => {
    it('should prevent SQL injection in user queries', async () => {
      const maliciousQueries = [
        'page=1&limit=10; DROP TABLE users;--',
        "page=1&limit=10' OR '1'='1",
        'page=1&limit=10 UNION SELECT * FROM passwords',
      ];

      for (const query of maliciousQueries) {
        const response = await request(app.getHttpServer())
          .get(`/users?${query}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400); // Should validate input

        expect(response.body.message).not.toContain('SQL');
      }
    });

    it('should prevent SQL injection in user search', async () => {
      const maliciousSearchTerms = [
        "' OR 1=1;--",
        "'; DROP TABLE users;--",
        "' UNION SELECT * FROM users--",
      ];

      for (const term of maliciousSearchTerms) {
        const response = await request(app.getHttpServer())
          .get(`/users/search?q=${encodeURIComponent(term)}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should return empty or sanitized results
        expect(response.body).toBeInstanceOf(Array);
      }
    });
  });

  describe('Database error handling', () => {
    it('should not expose database errors', async () => {
      // Try to trigger a database error with invalid data
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'a'.repeat(1000), // Very long email
          password: 'test',
        })
        .expect(400);

      // Should not expose internal database errors
      expect(response.body.message).not.toContain('SQL');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('column');
      expect(response.body.message).not.toContain('table');
    });
  });
});
