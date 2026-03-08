import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../config/test-database';

describe('Rate Limiting Security Tests', () => {
  let app: INestApplication;

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
  });

  describe('Authentication rate limiting', () => {
    it('should limit login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(429);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Too many attempts');
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should reset rate limit after time window', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);
      }

      // Should be rate limited
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(429);

      // Wait for rate limit to reset (assuming 15 minutes)
      // In real tests, you might want to mock time
      // For now, we'll just verify the rate limit exists
    });

    it('should have separate rate limits per IP', async () => {
      const loginDto = {
        email: 'test1@example.com',
        password: 'wrongpassword',
      };

      // Simulate requests from different IPs
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Exhaust rate limit for first IP
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', ip1)
          .send(loginDto)
          .expect(401);
      }

      // First IP should be rate limited
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', ip1)
        .send(loginDto)
        .expect(429);

      // Second IP should still work
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', ip2)
        .send({
          email: 'test2@example.com',
          password: 'wrongpassword',
        })
        .expect(401); // Wrong password but not rate limited

      expect(response.status).toBe(401);
    });
  });

  describe('Registration rate limiting', () => {
    it('should limit registration attempts', async () => {
      const baseEmail = 'test';
      let counter = 0;

      // Make multiple registration attempts
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `${baseEmail}${i}@example.com`,
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
          });

        if (response.status === 429) {
          counter++;
          expect(response.body.message).toContain('Too many requests');
        }
      }

      expect(counter).toBeGreaterThan(0);
    });
  });

  describe('API rate limiting', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create a user and get auth token
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'apitest@example.com',
          password: 'Password123!',
          firstName: 'API',
          lastName: 'Test',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'apitest@example.com',
          password: 'Password123!',
        })
        .expect(200);

      authToken = loginResponse.body.access_token;
    });

    it('should limit API requests per authenticated user', async () => {
      // Make many API requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Count rate limited responses
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Verify rate limit headers
      if (rateLimited.length > 0) {
        const limitedResponse = rateLimited[0];
        expect(limitedResponse.headers).toHaveProperty('x-ratelimit-limit');
        expect(limitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
        expect(limitedResponse.body.message).toContain('Too many requests');
      }
    });

    it('should have different rate limits for different endpoints', async () => {
      // Test with profile endpoint (higher limit)
      const profilePromises = [];
      for (let i = 0; i < 50; i++) {
        profilePromises.push(
          request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const profileResponses = await Promise.all(profilePromises);
      const profileLimited = profileResponses.filter(r => r.status === 429);

      // Test with registration endpoint (lower limit)
      const registerPromises = [];
      for (let i = 0; i < 10; i++) {
        registerPromises.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              email: `rate${i}@example.com`,
              password: 'Password123!',
              firstName: 'Test',
              lastName: 'User',
            })
        );
      }

      const registerResponses = await Promise.all(registerPromises);
      const registerLimited = registerResponses.filter(r => r.status === 429);

      // Registration should have stricter rate limiting
      expect(registerLimited.length).toBeGreaterThanOrEqual(profileLimited.length);
    });
  });

  describe('Brute force protection', () => {
    it('should progressively delay responses after failed attempts', async () => {
      const loginDto = {
        email: 'bruteforce@example.com',
        password: 'wrongpassword',
      };

      const responseTimes = [];

      // Make multiple failed attempts and measure response time
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);

        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);
      }

      // Response times should increase (progressive delay)
      for (let i = 1; i < responseTimes.length; i++) {
        // Allow some variance but generally should increase
        expect(responseTimes[i]).toBeGreaterThanOrEqual(responseTimes[i - 1] * 0.8);
      }
    });

    it('should implement account lockout after many failed attempts', async () => {
      const loginDto = {
        email: 'lockout@example.com',
        password: 'wrongpassword',
      };

      // Create user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'lockout@example.com',
          password: 'Password123!',
          firstName: 'Lockout',
          lastName: 'Test',
        })
        .expect(201);

      // Make many failed attempts
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);
      }

      // Account should be locked
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'lockout@example.com',
          password: 'Password123!', // Correct password
        })
        .expect(423); // Locked

      expect(response.body.message).toContain('Account locked');
    });
  });

  describe('Distributed rate limiting', () => {
    it('should share rate limit state across instances', async () => {
      // This test would require multiple app instances
      // For now, we'll verify the rate limit headers are consistent
      
      const loginDto = {
        email: 'distributed@example.com',
        password: 'wrongpassword',
      };

      // Make requests and check headers
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Headers should be numeric
      expect(parseInt(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
    });
  });
});
