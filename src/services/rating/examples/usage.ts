import { RatingService } from '../RatingService';
import { Redis } from 'ioredis';

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Create rating service instance
const ratingService = new RatingService(redis);

/**
 * Example: Submit a rating
 */
async function submitRatingExample() {
  try {
    // User rating
    const userRating = await ratingService.submitRating({
      userId: 'user123',
      targetId: 'product456',
      targetType: 'product',
      rating: 5,
      comment: 'Excellent product! Highly recommend.',
      ipAddress: '192.168.1.1',
    });

    console.log('User rating submitted:', userRating);

    // Anonymous rating
    const anonymousRating = await ratingService.submitRating({
      targetId: 'service789',
      targetType: 'service',
      rating: 4,
      comment: 'Good service overall.',
      ipAddress: '192.168.1.2',
    });

    console.log('Anonymous rating submitted:', anonymousRating);
  } catch (error) {
    console.error('Failed to submit rating:', error);
  }
}

/**
 * Example: Get rating statistics
 */
async function getStatisticsExample() {
  try {
    // Get statistics with cache
    const statsWithCache = await ratingService.getRatingStatistics({
      targetId: 'product456',
      targetType: 'product',
      useCache: true,
    });

    console.log('Statistics with cache:', statsWithCache);

    // Force fresh statistics (skip cache)
    const freshStats = await ratingService.getRatingStatistics({
      targetId: 'product456',
      targetType: 'product',
      useCache: false,
    });

    console.log('Fresh statistics:', freshStats);
  } catch (error) {
    console.error('Failed to get statistics:', error);
  }
}

/**
 * Example: Check if user has rated
 */
async function checkUserRatingExample() {
  try {
    // Check authenticated user
    const hasRated = await ratingService.hasUserRated(
      'user123',
      '192.168.1.1',
      'product456',
      'product'
    );

    console.log('User has rated:', hasRated);

    // Check anonymous user by IP
    const anonymousHasRated = await ratingService.hasUserRated(
      undefined,
      '192.168.1.2',
      'service789',
      'service'
    );

    console.log('Anonymous user has rated:', anonymousHasRated);
  } catch (error) {
    console.error('Failed to check user rating:', error);
  }
}

/**
 * Example: Cache management
 */
async function cacheManagementExample() {
  try {
    // Clear cache for specific targets
    await ratingService.clearCacheForTargets([
      { targetId: 'product456', targetType: 'product' },
      { targetId: 'service789', targetType: 'service' },
    ]);

    console.log('Cache cleared for specific targets');

    // Clear all cache
    await ratingService.clearAllCache();

    console.log('All cache cleared');

    // Warm up cache with all statistics
    await ratingService.warmupCache();

    console.log('Cache warmed up');

    // Check cache health
    const health = await ratingService.getCacheHealth();

    console.log('Cache health:', health);
  } catch (error) {
    console.error('Cache management failed:', error);
  }
}

/**
 * Example: Batch operations
 */
async function batchOperationsExample() {
  try {
    // Submit multiple ratings
    const ratings = [
      {
        userId: 'user1',
        targetId: 'product1',
        targetType: 'product',
        rating: 5,
        ipAddress: '192.168.1.1',
      },
      {
        userId: 'user2',
        targetId: 'product1',
        targetType: 'product',
        rating: 4,
        ipAddress: '192.168.1.2',
      },
      {
        targetId: 'product1',
        targetType: 'product',
        rating: 3,
        ipAddress: '192.168.1.3',
      },
    ];

    const results = await Promise.allSettled(
      ratings.map((rating) => ratingService.submitRating(rating))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Rating ${index + 1} submitted successfully`);
      } else {
        console.error(`Rating ${index + 1} failed:`, result.reason);
      }
    });

    // Get aggregated statistics
    const stats = await ratingService.getRatingStatistics({
      targetId: 'product1',
      targetType: 'product',
    });

    console.log('Aggregated statistics:', stats);
  } catch (error) {
    console.error('Batch operations failed:', error);
  }
}

/**
 * Example: Error handling
 */
async function errorHandlingExample() {
  try {
    // Try to submit duplicate rating
    const ratingData = {
      userId: 'user123',
      targetId: 'product456',
      targetType: 'product',
      rating: 5,
      ipAddress: '192.168.1.1',
    };

    await ratingService.submitRating(ratingData);
    console.log('First rating submitted');

    // This will fail
    await ratingService.submitRating(ratingData);
  } catch (error) {
    if (error.name === 'DuplicateRatingError') {
      console.log('User has already rated this item');
    } else if (error.name === 'InvalidRatingError') {
      console.log('Invalid rating value');
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('=== Submit Rating Example ===');
    await submitRatingExample();

    console.log('\n=== Get Statistics Example ===');
    await getStatisticsExample();

    console.log('\n=== Check User Rating Example ===');
    await checkUserRatingExample();

    console.log('\n=== Cache Management Example ===');
    await cacheManagementExample();

    console.log('\n=== Batch Operations Example ===');
    await batchOperationsExample();

    console.log('\n=== Error Handling Example ===');
    await errorHandlingExample();

    // Close Redis connection
    await redis.quit();
  })();
}
