import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting', () => {
  let app: express.Application;
  const windowMs = 1000; // 1 second for testing
  const max = 5; // 5 requests per window

  beforeEach(() => {
    app = express();

    // Apply rate limiting middleware
    const limiter = rateLimit({
      windowMs,
      max,
      message: { error: 'Too many requests' },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use('/test/', limiter);

    // Test endpoint
    app.get('/test/endpoint', (req, res) => {
      res.json({ message: 'Success' });
    });
  });

  it('should allow requests under the limit', async () => {
    for (let i = 0; i < max; i++) {
      const response = await request(app)
        .get('/test/endpoint')
        .set('X-Forwarded-For', '192.168.1.1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    }
  });

  it('should block requests over the limit', async () => {
    // Make max requests
    for (let i = 0; i < max; i++) {
      await request(app)
        .get('/test/endpoint')
        .set('X-Forwarded-For', '192.168.1.1');
    }

    // Next request should be blocked
    const response = await request(app)
      .get('/test/endpoint')
      .set('X-Forwarded-For', '192.168.1.1');

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests');
  });

  it('should reset after window expires', async () => {
    // Make max requests
    for (let i = 0; i < max; i++) {
      await request(app)
        .get('/test/endpoint')
        .set('X-Forwarded-For', '192.168.1.1');
    }

    // Verify blocked
    let response = await request(app)
      .get('/test/endpoint')
      .set('X-Forwarded-For', '192.168.1.1');
    expect(response.status).toBe(429);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, windowMs + 100));

    // Should be allowed again
    response = await request(app)
      .get('/test/endpoint')
      .set('X-Forwarded-For', '192.168.1.1');
    expect(response.status).toBe(200);
  }, 2000);

  it('should track different IPs separately', async () => {
    // Max requests from first IP
    for (let i = 0; i < max; i++) {
      await request(app)
        .get('/test/endpoint')
        .set('X-Forwarded-For', '192.168.1.1');
    }

    // Different IP should still work
    const response = await request(app)
      .get('/test/endpoint')
      .set('X-Forwarded-For', '192.168.1.2');

    expect(response.status).toBe(200);
  });

  it('should include rate limit headers', async () => {
    const response = await request(app)
      .get('/test/endpoint')
      .set('X-Forwarded-For', '192.168.1.1');

    expect(response.headers).toHaveProperty('ratelimit-limit', '5');
    expect(response.headers).toHaveProperty('ratelimit-remaining');
    expect(response.headers).toHaveProperty('ratelimit-reset');
  });

  it('should handle concurrent requests', async () => {
    // Send many concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .get('/test/endpoint')
        .set('X-Forwarded-For', '192.168.1.1')
    );

    const responses = await Promise.all(promises);

    // Count successful and blocked requests
    const successful = responses.filter(r => r.status === 200).length;
    const blocked = responses.filter(r => r.status === 429).length;

    expect(successful).toBeLessThanOrEqual(max);
    expect(blocked).toBeGreaterThan(0);
    expect(successful + blocked).toBe(10);
  });
});