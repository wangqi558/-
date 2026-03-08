const config = {
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    ALGORITHM: 'HS256'
  },
  REFRESH_TOKEN: {
    SECRET: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change-this-too',
    EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  BCRYPT: {
    SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    SKIP_SUCCESSFUL_REQUESTS: false,
    STANDARD_HEADERS: true,
    LEGACY_HEADERS: false
  },
  SECURITY: {
    COOKIE_SECURE: process.env.NODE_ENV === 'production',
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'strict'
  }
};

module.exports = config;
