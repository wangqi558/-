// Main exports for the authentication utilities
const JWTUtils = require('./jwt.utils');
const AuthMiddleware = require('./auth.middleware');
const PasswordUtils = require('./password.utils');
const RefreshTokenUtils = require('./refreshToken.utils');
const RateLimitMiddleware = require('./rateLimit.middleware');
const { ErrorHandler, globalErrorHandler } = require('./errorHandler');
const config = require('./config');

module.exports = {
  // Core utilities
  JWTUtils,
  AuthMiddleware,
  PasswordUtils,
  RefreshTokenUtils,
  RateLimitMiddleware,
  ErrorHandler,
  globalErrorHandler,
  config
};
