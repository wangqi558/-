import { submitRating, getObjectStats } from '../src/services/ratingService';
import { pool } from '../src/config/database';
import { cacheGet, cacheSet } from '../src/config/redis';

jest.mock('../src/config/redis');

describe('RatingService', () => {
  let testUserId: number;
  let testObjectId: number;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['test@rating.com', 'testuser', '$2b$10$test']
    );
    testUserId = userResult.rows[0].id;

    // Create test object
    const objectResult = await pool.query(
      'INSERT INTO rating_objects (title, description, creator_id) VALUES ($1, $2, $3) RETURNING id',
      ['Test Product', 'A test product for rating', testUserId]
    );
    testObjectId = objectResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM ratings WHERE object_id = $1', [testObjectId]);
    await pool.query('DELETE FROM rating_objects WHERE id = $1', [testObjectId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('submitRating', () => {
    it('should create a new rating for authenticated user', async () => {
      const ratingData = {
        objectId: testObjectId,
        score: 5,
        comment: 'Excellent product!',
        anonymous: false
      };

      const stats = await submitRating(ratingData, testUserId);

      expect(stats.vote_count).toBe(1);
      expect(stats.avg_score).toBe(5);
      expect(stats.distribution[5]).toBe(1);
      expect(stats.distribution[4]).toBe(0);
    });

    it('should update existing rating for authenticated user', async () => {
      const ratingData = {
        objectId: testObjectId,
        score: 4,
        comment: 'Good product',
        anonymous: false
      };

      const stats = await submitRating(ratingData, testUserId);

      expect(stats.vote_count).toBe(1);
      expect(stats.avg_score).toBe(4);
      expect(stats.distribution[5]).toBe(0);
      expect(stats.distribution[4]).toBe(1);
    });

    it('should create anonymous rating with IP hash', async () => {
      const ratingData = {
        objectId: testObjectId,
        score: 3,
        comment: 'Average product',
        anonymous: true,
        ipHash: 'hashed-ip-address'
      };

      const stats = await submitRating(ratingData);

      expect(stats.vote_count).toBe(2);
      expect(stats.avg_score).toBeCloseTo(3.5, 1);
      expect(stats.distribution[3]).toBe(1);
    });

    it('should handle concurrent rating submissions', async () => {
      const objectResult = await pool.query(
        'INSERT INTO rating_objects (title, description, creator_id) VALUES ($1, $2, $3) RETURNING id',
        ['Concurrent Test Product', 'Test concurrent ratings', testUserId]
      );
      const newObjectId = objectResult.rows[0].id;

      // Submit multiple ratings concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        submitRating({
          objectId: newObjectId,
          score: i + 1,
          comment: `Rating ${i + 1}`,
          anonymous: false
        }, testUserId + i + 1)
      );

      const results = await Promise.all(promises);

      // Get final stats
      const finalStats = await getObjectStats(newObjectId);

      expect(finalStats.vote_count).toBe(5);
      expect(finalStats.avg_score).toBe(3);

      // Clean up
      await pool.query('DELETE FROM rating_objects WHERE id = $1', [newObjectId]);
    });
  });

  describe('getObjectStats', () => {
    it('should return cached stats when available', async () => {
      const mockStats = {
        vote_count: 10,
        avg_score: 4.5,
        distribution: { 1: 0, 2: 1, 3: 1, 4: 3, 5: 5 }
      };

      (cacheGet as jest.Mock).mockResolvedValue(mockStats);

      const stats = await getObjectStats(testObjectId);

      expect(stats).toEqual(mockStats);
      expect(cacheGet).toHaveBeenCalledWith(`stats:${testObjectId}`);
    });

    it('should fetch from database and cache when not in cache', async () => {
      (cacheGet as jest.Mock).mockResolvedValue(null);

      const stats = await getObjectStats(testObjectId);

      expect(stats.vote_count).toBeGreaterThan(0);
      expect(stats).toHaveProperty('avg_score');
      expect(stats).toHaveProperty('distribution');
      expect(cacheSet).toHaveBeenCalledWith(
        `stats:${testObjectId}`,
        stats,
        300
      );
    });

    it('should handle empty ratings gracefully', async () => {
      const objectResult = await pool.query(
        'INSERT INTO rating_objects (title, description, creator_id) VALUES ($1, $2, $3) RETURNING id',
        ['Empty Test Product', 'No ratings yet', testUserId]
      );
      const emptyObjectId = objectResult.rows[0].id;

      const stats = await getObjectStats(emptyObjectId);

      expect(stats.vote_count).toBe(0);
      expect(stats.avg_score).toBeNull();
      expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      // Clean up
      await pool.query('DELETE FROM rating_objects WHERE id = $1', [emptyObjectId]);
    });
  });
});