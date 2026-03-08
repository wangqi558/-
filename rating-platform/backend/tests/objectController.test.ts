import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

describe('ObjectController', () => {
  let authToken: string;
  let testUserId: number;
  let testObjectId: number;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['object@test.com', 'objectuser', '$2b$10$test']
    );
    testUserId = userResult.rows[0].id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: 'object@test.com',
        password: 'password'
      });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ratings WHERE object_id = $1', [testObjectId]);
    await pool.query('DELETE FROM rating_objects WHERE creator_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /api/objects', () => {
    it('should create a new rating object', async () => {
      const response = await request(app)
        .post('/api/objects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Product',
          description: 'A product for testing',
          category: 'Test',
          tags: ['test', 'product'],
          allow_comments: true,
          visibility: 'public'
        })
        .expect(201);

      expect(response.body.title).toBe('Test Product');
      expect(response.body.description).toBe('A product for testing');
      expect(response.body.category).toBe('Test');
      expect(response.body.tags).toEqual(['test', 'product']);
      expect(response.body.creator_id).toBe(testUserId);

      testObjectId = response.body.id;
    });

    it('should not create object without title', async () => {
      await request(app)
        .post('/api/objects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'No title'
        })
        .expect(400);
    });

    it('should not create object without authentication', async () => {
      await request(app)
        .post('/api/objects')
        .send({
          title: 'No auth'
        })
        .expect(401);
    });
  });

  describe('GET /api/objects/:id', () => {
    beforeAll(async () => {
      // Add some ratings to test stats
      await pool.query(
        'INSERT INTO ratings (object_id, user_id, score, comment) VALUES ($1, $2, $3, $4)',
        [testObjectId, testUserId, 5, 'Great product!']
      );
    });

    it('should get object with statistics', async () => {
      const response = await request(app)
        .get(`/api/objects/${testObjectId}`)
        .expect(200);

      expect(response.body.id).toBe(testObjectId);
      expect(response.body.title).toBe('Test Product');
      expect(response.body).toHaveProperty('avg_score');
      expect(response.body).toHaveProperty('vote_count');
      expect(response.body).toHaveProperty('score_distribution');
      expect(response.body).toHaveProperty('recent_comments');
      expect(response.body.creator_summary).toHaveProperty('id', testUserId);
    });

    it('should return 404 for non-existent object', async () => {
      await request(app)
        .get('/api/objects/99999')
        .expect(404);
    });

    it('should not return blocked objects', async () => {
      // Create and block an object
      const blockedResult = await pool.query(
        'INSERT INTO rating_objects (title, creator_id, status) VALUES ($1, $2, $3) RETURNING id',
        ['Blocked Product', testUserId, 'blocked']
      );
      const blockedId = blockedResult.rows[0].id;

      await request(app)
        .get(`/api/objects/${blockedId}`)
        .expect(404);

      // Clean up
      await pool.query('DELETE FROM rating_objects WHERE id = $1', [blockedId]);
    });
  });

  describe('GET /api/objects', () => {
    beforeAll(async () => {
      // Create additional test objects
      await pool.query(
        'INSERT INTO rating_objects (title, description, category, creator_id) VALUES ($1, $2, $3, $4)',
        ['Another Product', 'Another test', 'Test', testUserId]
      );
      await pool.query(
        'INSERT INTO rating_objects (title, description, category, creator_id) VALUES ($1, $2, $3, $4)',
        ['Third Product', 'Third test', 'Different', testUserId]
      );
    });

    it('should list all public objects', async () => {
      const response = await request(app)
        .get('/api/objects')
        .expect(200);

      expect(response.body).toHaveProperty('objects');
      expect(response.body.objects.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/objects?category=Test')
        .expect(200);

      expect(response.body.objects.every((obj: any) => obj.category === 'Test')).toBe(true);
    });

    it('should search by title or description', async () => {
      const response = await request(app)
        .get('/api/objects?search=Product')
        .expect(200);

      expect(response.body.objects.length).toBeGreaterThan(0);
      expect(response.body.objects.some((obj: any) =>
        obj.title.includes('Product') || obj.description.includes('Product')
      )).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/objects?page=2&limit=1')
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(1);
    });
  });
});