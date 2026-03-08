import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL'
];

const optionalEnvVars = {
  PORT: '3000',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '60',
  BCRYPT_ROUNDS: '10',
  JWT_EXPIRES_IN: '7d',
  // Email configuration (optional)
  EMAIL_HOST: '',
  EMAIL_PORT: '587',
  EMAIL_SECURE: 'false',
  EMAIL_USER: '',
  EMAIL_PASSWORD: '',
  EMAIL_FROM: 'noreply@ratingplatform.com',
  FRONTEND_URL: 'http://localhost:3000'
};

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REDIS_URL: process.env.REDIS_URL!,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60'),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  // Email configuration
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@ratingplatform.com',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

export const validateEnv = () => {
  // 检查必需的环境变量
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // 设置默认值
  for (const [envVar, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      console.log(`Set default value for ${envVar}: ${defaultValue}`);
    }
  }

  // 验证 JWT_SECRET 强度
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // 验证数据库连接字符串格式
  if (!process.env.DATABASE_URL!.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must start with postgresql://');
  }

  console.log('Environment validation passed');
};
