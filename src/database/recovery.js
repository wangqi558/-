const dbPool = require('../config/database');
const redisClient = require('../config/redis');

class ConnectionRecovery {
  constructor() {
    this.dbRetryCount = 0;
    this.redisRetryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
    this.isRecovering = false;
  }

  async recoverDatabaseConnection() {
    if (this.isRecovering) {
      return false;
    }

    this.isRecovering = true;
    
    while (this.dbRetryCount < this.maxRetries) {
      try {
        console.log(`Attempting database recovery (attempt ${this.dbRetryCount + 1}/${this.maxRetries})...`);
        
        // Try to close existing pool
        try {
          await dbPool.close();
        } catch (error) {
          // Ignore errors when closing
        }
        
        // Reinitialize the pool
        await dbPool.initialize();
        
        // Test the connection
        await dbPool.query('SELECT 1');
        
        console.log('Database connection recovered successfully');
        this.dbRetryCount = 0;
        this.isRecovering = false;
        return true;
      } catch (error) {
        this.dbRetryCount++;
        console.error(`Database recovery attempt ${this.dbRetryCount} failed:`, error.message);
        
        if (this.dbRetryCount < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    this.isRecovering = false;
    console.error(`Database recovery failed after ${this.maxRetries} attempts`);
    return false;
  }

  async recoverRedisConnection() {
    while (this.redisRetryCount < this.maxRetries) {
      try {
        console.log(`Attempting Redis recovery (attempt ${this.redisRetryCount + 1}/${this.maxRetries})...`);
        
        // Close existing client
        try {
          await redisClient.close();
        } catch (error) {
          // Ignore errors when closing
        }
        
        // Reinitialize the client
        await redisClient.initialize();
        
        // Test the connection
        await redisClient.set('recovery_test', 'test', 10);
        
        console.log('Redis connection recovered successfully');
        this.redisRetryCount = 0;
        return true;
      } catch (error) {
        this.redisRetryCount++;
        console.error(`Redis recovery attempt ${this.redisRetryCount} failed:`, error.message);
        
        if (this.redisRetryCount < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    console.error(`Redis recovery failed after ${this.maxRetries} attempts`);
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  resetRetryCounts() {
    this.dbRetryCount = 0;
    this.redisRetryCount = 0;
  }

  async checkConnections() {
    const results = {
      database: { connected: false, error: null },
      redis: { connected: false, error: null },
    };

    // Check database
    try {
      await dbPool.query('SELECT 1');
      results.database.connected = true;
    } catch (error) {
      results.database.error = error.message;
    }

    // Check Redis
    try {
      await redisClient.set('health_check', 'test', 10);
      results.redis.connected = true;
    } catch (error) {
      results.redis.error = error.message;
    }

    return results;
  }

  async autoRecover() {
    const checks = await this.checkConnections();
    let recovered = true;

    if (!checks.database.connected) {
      console.log('Database connection lost, attempting recovery...');
      const dbRecovered = await this.recoverDatabaseConnection();
      if (!dbRecovered) {
        recovered = false;
      }
    }

    if (!checks.redis.connected) {
      console.log('Redis connection lost, attempting recovery...');
      const redisRecovered = await this.recoverRedisConnection();
      if (!redisRecovered) {
        recovered = false;
      }
    }

    return recovered;
  }
}

// Middleware for connection recovery
const connectionRecoveryMiddleware = async (req, res, next) => {
  try {
    // Check if connections are healthy
    const checks = await connectionRecovery.checkConnections();
    
    // If any connection is down, attempt recovery
    if (!checks.database.connected || !checks.redis.connected) {
      console.log('Connection issues detected, attempting recovery...');
      const recovered = await connectionRecovery.autoRecover();
      
      if (!recovered) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Unable to recover database connections',
          checks,
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Connection recovery middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check connection status',
    });
  }
};

const connectionRecovery = new ConnectionRecovery();

module.exports = {
  ConnectionRecovery,
  connectionRecovery,
  connectionRecoveryMiddleware,
};
