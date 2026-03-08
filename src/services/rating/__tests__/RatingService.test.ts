import { RatingService } from '../RatingService';
import { RatingRepository } from '../RatingRepository';
import { RatingCacheService } from '../RatingCacheService';
import { db } from '../../../db';
import { Redis } from 'ioredis';
import { SubmitRatingInput } from '../types';
import {
  DuplicateRatingError,
  InvalidRatingError,
  RatingStatsNotFoundError,
} from '../errors';

// Mock dependencies
jest.mock('../RatingRepository');
jest.mock('../RatingCacheService');
jest.mock('../../../db', () => ({
  db: {
    transaction: jest.fn(async (callback) => {
      return callback({});
    }),
  },
}));

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
} as unknown as Redis;

describe('RatingService', () => {
  let ratingService: RatingService;
  let mockRatingRepository: jest.Mocked<RatingRepository>;
  let mockRatingCacheService: jest.Mocked<RatingCacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    ratingService = new RatingService(mockRedis);
    mockRatingRepository = (RatingRepository as jest.MockedClass<typeof RatingRepository>).prototype as any;
    mockRatingCacheService = (RatingCacheService as jest.MockedClass<typeof RatingCacheService>).prototype as any;
  });

  describe('submitRating', () => {
    const validInput: SubmitRatingInput = {
      userId: 'user123',
      targetId: 'product456',
      targetType: 'product',
      rating: 4,
      comment: 'Great product!',
      ipAddress: '192.168.1.1',
    };

    it('should successfully submit a rating', async () => {
      const mockRating = {
        id: 'rating123',
        ...validInput,
        ipHash: 'hashed-ip',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(null);
      mockRatingRepository.createRating.mockResolvedValueOnce(mockRating);
      mockRatingRepository.calculateStatistics.mockResolvedValueOnce({
        targetId: validInput.targetId,
        targetType: validInput.targetType,
        averageRating: 4.0,
        totalRatings: 1,
        ratingDistribution: { 4: 1 },
        lastCalculated: new Date(),
      });

      const result = await ratingService.submitRating(validInput);

      expect(result).toEqual(mockRating);
      expect(mockRatingRepository.findByUserAndTarget).toHaveBeenCalledWith(
        validInput.userId,
        expect.any(String),
        validInput.targetId,
        validInput.targetType
      );
      expect(db.transaction).toHaveBeenCalled();
    });

    it('should throw InvalidRatingError for invalid rating value', async () => {
      const invalidInput = { ...validInput, rating: 6 };

      await expect(ratingService.submitRating(invalidInput)).rejects.toThrow(
        InvalidRatingError
      );
    });

    it('should throw InvalidRatingError for invalid IP address', async () => {
      const invalidInput = { ...validInput, ipAddress: 'invalid-ip' };

      await expect(ratingService.submitRating(invalidInput)).rejects.toThrow(
        InvalidRatingError
      );
    });

    it('should throw DuplicateRatingError if user already rated', async () => {
      const existingRating = {
        id: 'existing123',
        userId: validInput.userId,
        ipHash: 'hashed-ip',
        targetId: validInput.targetId,
        targetType: validInput.targetType,
        rating: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(existingRating);

      await expect(ratingService.submitRating(validInput)).rejects.toThrow(
        DuplicateRatingError
      );
    });

    it('should handle anonymous ratings', async () => {
      const anonymousInput = {
        ...validInput,
        userId: undefined,
      };

      const mockRating = {
        id: 'rating123',
        ...anonymousInput,
        ipHash: 'hashed-ip',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(null);
      mockRatingRepository.createRating.mockResolvedValueOnce(mockRating);
      mockRatingRepository.calculateStatistics.mockResolvedValueOnce({
        targetId: validInput.targetId,
        targetType: validInput.targetType,
        averageRating: 4.0,
        totalRatings: 1,
        ratingDistribution: { 4: 1 },
        lastCalculated: new Date(),
      });

      const result = await ratingService.submitRating(anonymousInput);

      expect(result.userId).toBeUndefined();
      expect(mockRatingRepository.findByUserAndTarget).toHaveBeenCalledWith(
        undefined,
        expect.any(String),
        validInput.targetId,
        validInput.targetType
      );
    });
  });

  describe('getRatingStatistics', () => {
    const target = {
      targetId: 'product123',
      targetType: 'product',
    };

    it('should return cached statistics if available', async () => {
      const cachedStats = {
        ...target,
        averageRating: 4.5,
        totalRatings: 10,
        ratingDistribution: { 4: 5, 5: 5 },
        lastCalculated: new Date(),
      };

      mockRatingCacheService.get.mockResolvedValueOnce(cachedStats);

      const result = await ratingService.getRatingStatistics({
        ...target,
        useCache: true,
      });

      expect(result).toEqual(cachedStats);
      expect(mockRatingRepository.getRatingStatistics).not.toHaveBeenCalled();
    });

    it('should calculate statistics if not cached', async () => {
      const calculatedStats = {
        ...target,
        averageRating: 3.8,
        totalRatings: 5,
        ratingDistribution: { 3: 2, 4: 2, 5: 1 },
        lastCalculated: new Date(),
      };

      mockRatingCacheService.get.mockResolvedValueOnce(null);
      mockRatingRepository.getRatingStatistics.mockResolvedValueOnce(null);
      mockRatingRepository.calculateStatistics.mockResolvedValueOnce(calculatedStats);
      mockRatingRepository.upsertRatingStatistics.mockResolvedValueOnce(calculatedStats);

      const result = await ratingService.getRatingStatistics({
        ...target,
        useCache: true,
      });

      expect(result).toEqual(calculatedStats);
      expect(mockRatingRepository.calculateStatistics).toHaveBeenCalledWith(
        target.targetId,
        target.targetType
      );
      expect(mockRatingCacheService.set).toHaveBeenCalledWith(
        { targetId: target.targetId, targetType: target.targetType },
        calculatedStats
      );
    });

    it('should skip cache when useCache is false', async () => {
      const stats = {
        ...target,
        averageRating: 4.0,
        totalRatings: 3,
        ratingDistribution: { 4: 3 },
        lastCalculated: new Date(),
      };

      mockRatingRepository.getRatingStatistics.mockResolvedValueOnce(stats);

      const result = await ratingService.getRatingStatistics({
        ...target,
        useCache: false,
      });

      expect(result).toEqual(stats);
      expect(mockRatingCacheService.get).not.toHaveBeenCalled();
      expect(mockRatingCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('hasUserRated', () => {
    it('should return true if user has rated', async () => {
      const existingRating = {
        id: 'rating123',
        userId: 'user123',
        ipHash: 'hashed-ip',
        targetId: 'product456',
        targetType: 'product',
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(existingRating);

      const result = await ratingService.hasUserRated(
        'user123',
        '192.168.1.1',
        'product456',
        'product'
      );

      expect(result).toBe(true);
    });

    it('should return false if user has not rated', async () => {
      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(null);

      const result = await ratingService.hasUserRated(
        'user123',
        '192.168.1.1',
        'product456',
        'product'
      );

      expect(result).toBe(false);
    });

    it('should check by IP for anonymous users', async () => {
      mockRatingRepository.findByUserAndTarget.mockResolvedValueOnce(null);

      await ratingService.hasUserRated(
        undefined,
        '192.168.1.1',
        'product456',
        'product'
      );

      expect(mockRatingRepository.findByUserAndTarget).toHaveBeenCalledWith(
        undefined,
        expect.any(String),
        'product456',
        'product'
      );
    });
  });

  describe('clearCacheForTargets', () => {
    it('should clear cache for specified targets', async () => {
      const targets = [
        { targetId: 'product1', targetType: 'product' },
        { targetId: 'service1', targetType: 'service' },
      ];

      await ratingService.clearCacheForTargets(targets);

      expect(mockRatingCacheService.deleteMultiple).toHaveBeenCalledWith([
        { targetId: 'product1', targetType: 'product' },
        { targetId: 'service1', targetType: 'service' },
      ]);
    });
  });

  describe('warmupCache', () => {
    it('should warm up cache with all statistics', async () => {
      const stats = [
        {
          targetId: 'product1',
          targetType: 'product',
          averageRating: 4.0,
          totalRatings: 10,
          ratingDistribution: { 4: 10 },
          lastCalculated: new Date(),
        },
        {
          targetId: 'service1',
          targetType: 'service',
          averageRating: 3.5,
          totalRatings: 5,
          ratingDistribution: { 3: 3, 4: 2 },
          lastCalculated: new Date(),
        },
      ];

      mockRatingRepository.getAllRatingStatistics.mockResolvedValueOnce(stats);

      await ratingService.warmupCache();

      expect(mockRatingRepository.getAllRatingStatistics).toHaveBeenCalled();
      expect(mockRatingCacheService.warmup).toHaveBeenCalledWith(stats);
    });
  });

  describe('getCacheHealth', () => {
    it('should return cache health status', async () => {
      mockRatingCacheService.isHealthy.mockResolvedValueOnce(true);

      const result = await ratingService.getCacheHealth();

      expect(result).toEqual({ healthy: true });
      expect(mockRatingCacheService.isHealthy).toHaveBeenCalled();
    });
  });
});
