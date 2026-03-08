const redis = require('redis');
const config = require('./index');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          // Reconnect after delay
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis client ready');
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      throw error;
    }
  }

  async set(key, value, expireSeconds = null) {
    try {
      const serializedValue = JSON.stringify(value);
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      throw error;
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      throw error;
    }
  }

  async flushDb() {
    try {
      await this.client.flushDb();
      console.log('Redis database flushed');
    } catch (error) {
      console.error('Redis flushDb error:', error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        console.log('Redis client closed successfully');
      } catch (error) {
        console.error('Error closing Redis client:', error);
        throw error;
      }
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
