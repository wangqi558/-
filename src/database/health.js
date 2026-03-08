const dbPool = require('../config/database');
const redisClient = require('../config/redis');

class HealthCheck {
  constructor() {
    this.checks = {
      database: this.checkDatabase.bind(this),
      redis: this.checkRedis.bind(this),
    };
  }

  async checkDatabase() {
    const checkResult = {
      status: 'unknown',
      message: '',
      latency: null,
      timestamp: new Date().toISOString(),
    };

    try {
      const start = Date.now();
      const result = await dbPool.query('SELECT NOW() as current_time');
      const latency = Date.now() - start;
      
      if (result.rows.length > 0) {
        checkResult.status = 'healthy';
        checkResult.message = 'Database connection successful';
        checkResult.latency = latency;
      } else {
        checkResult.status = 'unhealthy';
        checkResult.message = 'Database query returned no results';
      }
    } catch (error) {
      checkResult.status = 'unhealthy';
      checkResult.message = `Database connection failed: ${error.message}`;
      console.error('Database health check failed:', error);
    }

    return checkResult;
  }

  async checkRedis() {
    const checkResult = {
      status: 'unknown',
      message: '',
      latency: null,
      timestamp: new Date().toISOString(),
    };

    try {
      if (!redisClient.isConnected) {
        checkResult.status = 'unhealthy';
        checkResult.message = 'Redis client not connected';
        return checkResult;
      }

      const start = Date.now();
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'test_value';
      
      await redisClient.set(testKey, testValue, 10); // 10 seconds expiry
      const retrievedValue = await redisClient.get(testKey);
      await redisClient.del(testKey);
      
      const latency = Date.now() - start;
      
      if (retrievedValue === testValue) {
        checkResult.status = 'healthy';
        checkResult.message = 'Redis connection and operations successful';
        checkResult.latency = latency;
      } else {
        checkResult.status = 'unhealthy';
        checkResult.message = 'Redis set/get operations failed';
      }
    } catch (error) {
      checkResult.status = 'unhealthy';
      checkResult.message = `Redis connection failed: ${error.message}`;
      console.error('Redis health check failed:', error);
    }

    return checkResult;
  }

  async performAllChecks() {
    const results = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
    };

    const checkPromises = Object.entries(this.checks).map(async ([service, checkFn]) => {
      try {
        const result = await checkFn();
        results.services[service] = result;
        
        if (result.status === 'unhealthy') {
          results.overall = 'unhealthy';
        }
      } catch (error) {
        console.error(`Health check for ${service} threw an exception:`, error);
        results.services[service] = {
          status: 'unhealthy',
          message: `Health check threw an exception: ${error.message}`,
          timestamp: new Date().toISOString(),
        };
        results.overall = 'unhealthy';
      }
    });

    await Promise.all(checkPromises);

    return results;
  }

  async performCheck(serviceName) {
    const checkFn = this.checks[serviceName];
    if (!checkFn) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    return await checkFn();
  }
}

// Middleware for health check endpoint
const healthCheckMiddleware = async (req, res) => {
  try {
    const healthCheck = new HealthCheck();
    const results = await healthCheck.performAllChecks();
    
    const statusCode = results.overall === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(results);
  } catch (error) {
    console.error('Health check middleware error:', error);
    res.status(500).json({
      overall: 'unhealthy',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Middleware for readiness check (checks if services are ready to accept traffic)
const readinessCheckMiddleware = async (req, res) => {
  try {
    const healthCheck = new HealthCheck();
    const dbStatus = await healthCheck.performCheck('database');
    const redisStatus = await healthCheck.performCheck('redis');
    
    const isReady = dbStatus.status === 'healthy' && redisStatus.status === 'healthy';
    const statusCode = isReady ? 200 : 503;
    
    res.status(statusCode).json({
      ready: isReady,
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Readiness check middleware error:', error);
    res.status(503).json({
      ready: false,
      error: 'Readiness check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Middleware for liveness check (checks if the application is running)
const livenessCheckMiddleware = (req, res) => {
  res.status(200).json({
    alive: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  HealthCheck,
  healthCheckMiddleware,
  readinessCheckMiddleware,
  livenessCheckMiddleware,
};
