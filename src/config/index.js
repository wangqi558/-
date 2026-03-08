require('dotenv').config();
const Joi = require('joi');

// Define validation schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  // Database configuration
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().integer().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_POOL_MAX: Joi.number().integer().default(20),
  DB_IDLE_TIMEOUT: Joi.number().integer().default(30000),
  DB_CONNECTION_TIMEOUT: Joi.number().integer().default(2000),
  DB_SSL: Joi.boolean().default(false),
  
  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().integer().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().integer().default(0),
  
  // Application configuration
  PORT: Joi.number().integer().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  // Security
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  BCRYPT_ROUNDS: Joi.number().integer().default(10),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().default(100),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
  
  // Session
  SESSION_SECRET: Joi.string().required(),
  SESSION_MAX_AGE: Joi.number().integer().default(86400000), // 24 hours
}).unknown(true);

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  logLevel: envVars.LOG_LEVEL,
  
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    poolMax: envVars.DB_POOL_MAX,
    idleTimeoutMillis: envVars.DB_IDLE_TIMEOUT,
    connectionTimeoutMillis: envVars.DB_CONNECTION_TIMEOUT,
    ssl: envVars.DB_SSL,
  },
  
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  
  bcrypt: {
    rounds: envVars.BCRYPT_ROUNDS,
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  
  session: {
    secret: envVars.SESSION_SECRET,
    maxAge: envVars.SESSION_MAX_AGE,
  },
};

module.exports = config;
