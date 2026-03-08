import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

describe('RatingController', () => {
  let authToken: string;
  let testUserId: number;
  let testObjectId: number;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['rating@test.com', 'ratinguser', '$2b$10$test']
    );
    testUserId = userResult.rows[0].id;

    // Create test object
    const objectResult = await pool.query(
      'INSERT INTO rating_objects (title, description, allow_comments, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Rating Test Product', 'Test product for ratings', true, testUserId]
    );
    testObjectId = objectResult.rows[0].id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        email: 'rating@test.com',
        password: 'password'
      });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM ratings WHERE object_id = $1', [testObjectId]);
    await pool.query('DELETE FROM rating_objects WHERE id = $1', [testObjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /api/objects/:id/ratings', () => {
    it('should create a new rating', async () => {
      const response = await request(app)
        .post(`/api/objects/${testObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 5,
          comment: 'Amazing product!',
          anonymous: false
        })
        .expect(200);

      expect(response.body.message).toBe('Rating submitted successfully');
      expect(response.body.stats).toHaveProperty('vote_count', 1);
      expect(response.body.stats).toHaveProperty('avg_score', 5);
    });

    it('should update existing rating', async () => {
      const response = await request(app)
        .post(`/api/objects/${testObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 4,
          comment: 'Good product'
        })
        .expect(200);

      expect(response.body.stats.vote_count).toBe(1);
      expect(response.body.stats.avg_score).toBe(4);
    });

    it('should validate score range', async () => {
      await request(app)
        .post(`/api/objects/${testObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 6,
          comment: 'Invalid score'
        })
        .expect(400);

      await request(app)
        .post(`/api/objects/${testObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 0,
          comment: 'Invalid score'
        })
        .expect(400);
    });

    it('should validate comment length', async () => {
      const longComment = 'a'.repeat(1001);

      await request(app)
        .post(`/api/objects/${testObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 3,
          comment: longComment
        })
        .expect(400);
    });

    it('should not allow comments when disabled', async () => {
      // Create object with comments disabled
      const objectResult = await pool.query(
        'INSERT INTO rating_objects (title, allow_comments, creator_id) VALUES ($1, $2, $3) RETURNING id',
        ['No Comments Product', false, testUserId]
      );
      const noCommentObjectId = objectResult.rows[0].id;

      await request(app)
        .post(`/api/objects/${noCommentObjectId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 3,
          comment: 'This should fail'
        })
        .expect(400);

      // Clean up
      await pool.query('DELETE FROM rating_objects WHERE id = $1', [noCommentObjectId]);
    });

    it('should handle non-existent object', async () => {
      await request(app)
        .post('/api/objects/99999/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 3
        })
        .expect(404);
    });

    it('should allow anonymous rating', async () => {
      // Create new object for anonymous test
      const objectResult = await pool.query(
        'INSERT INTO rating_objects (title, allow_comments, creator_id) VALUES ($1, $2, $3) RETURNING id',
        ['Anonymous Test', true, testUserId]
      );
      const anonymousObjectId = objectResult.rows[0].id;

      const response = await request(app)
        .post(`/api/objects/${anonymousObjectId}/ratings`)
        .send({
          score: 3,
          comment: 'Anonymous rating'
        })
        .expect(200);

      expect(response.body.stats.vote_count).toBe(1);

      // Clean up
      await pool.query('DELETE FROM rating_objects WHERE id = $1', [anonymousObjectId]);
    });
  });

  describe('GET /api/objects/:id/ratings', () => {
    beforeAll(async () => {
      // Add multiple ratings with comments
      await pool.query(
        'INSERT INTO ratings (object_id, user_id, score, comment) VALUES ($1, $2, $3, $4)',
        [testObjectId, testUserId, 5, 'Great!']
      );
      await pool.query(
        'INSERT INTO ratings (object_id, score, comment, anonymous, source_ip_hash) VALUES ($1, $2, $3, $4, $5)',
        [testObjectId, 4, 'Good', true, 'hashed-ip']
      );
    });

    it('should get ratings with pagination', async () => {
      const response = await request(app)
        .get(`/api/objects/${testObjectId}/ratings`)
        .expect(200);

      expect(response.body).toHaveProperty('ratings');
      expect(response.body.ratings.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
      expect(response.body).toHaveProperty('total');
    });

    it('should only return ratings with comments', async () => {
      // Add rating without comment
      await pool.query(
        'INSERT INTO ratings (object_id, user_id, score) VALUES ($1, $2, $3)',
        [testObjectId, testUserId, 3]
      );

      const response = await request(app)
        .get(`/api/objects/${testObjectId}/ratings`)
        .expect(200);

      // All returned ratings should have comments
      expect(response.body.ratings.every((r: any) => r.comment !== null)).toBe(true);
    });

    it('should handle reviewer information correctly', async () => {
      const response = await request(app)
        .get(`/api/objects/${testObjectId}/ratings`)
        .expect(200);

      const anonymousRating = response.body.ratings.find((r: any) => r.anonymous === true);
      const nonAnonymousRating = response.body.ratings.find((r: any) => r.anonymous === false);

      if (anonymousRating) {
        expect(anonymousRating.reviewer).toBeNull();
      }
      if (nonAnonymousRating) {
        expect(nonAnonymousRating.reviewer).toHaveProperty('id');
        expect(nonAnonymousRating.reviewer).toHaveProperty('username');
      }
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get(`/api/objects/${testObjectId}/ratings?page=2&limit=2`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(2);
    });
  });
});