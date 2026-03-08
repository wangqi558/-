const dbPool = require('../config/database');
const redisClient = require('../config/redis');

class DatabaseInitializer {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing database connection pool...');
      await dbPool.initialize();
      
      console.log('Initializing Redis client...');
      await redisClient.initialize();
      
      this.initialized = true;
      console.log('Database and Redis initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  async testConnections() {
    try {
      // Test database connection
      console.log('Testing database connection...');
      const dbResult = await dbPool.query('SELECT 1 as test');
      if (dbResult.rows[0].test !== 1) {
        throw new Error('Database test query failed');
      }
      console.log('Database connection test passed');

      // Test Redis connection
      console.log('Testing Redis connection...');
      const testKey = 'init_test_' + Date.now();
      await redisClient.set(testKey, 'test_value', 10);
      const retrievedValue = await redisClient.get(testKey);
      await redisClient.del(testKey);
      
      if (retrievedValue !== 'test_value') {
        throw new Error('Redis test failed');
      }
      console.log('Redis connection test passed');

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  async createDatabaseIfNotExists() {
    const config = require('../config/index');
    const { Pool } = require('pg');
    
    // Connect to postgres database to create the target database
    const pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: 'postgres',
      user: config.database.user,
      password: config.database.password,
    });

    try {
      console.log(`Checking if database '${config.database.name}' exists...`);
      
      const result = await pool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [config.database.name]
      );
      
      if (result.rows.length === 0) {
        console.log(`Creating database '${config.database.name}'...`);
        await pool.query(`CREATE DATABASE ${config.database.name}`);
        console.log(`Database '${config.database.name}' created successfully`);
      } else {
        console.log(`Database '${config.database.name}' already exists`);
      }
    } catch (error) {
      console.error('Failed to check/create database:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  async close() {
    try {
      await dbPool.close();
      await redisClient.close();
      this.initialized = false;
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }
}

// Singleton instance
const databaseInitializer = new DatabaseInitializer();

module.exports = databaseInitializer;
