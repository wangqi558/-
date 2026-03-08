const rateLimit = require('express-rate-limit');
const config = require('./config');

/**
 * Rate limiting middleware configurations
 */
class RateLimitMiddleware {
  /**
   * General API rate limiter
   */
  static apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT.WINDOW_MS,
    max: config.RATE_LIMIT.MAX_REQUESTS,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000)
    },
    standardHeaders: config.RATE_LIMIT.STANDARD_HEADERS,
    legacyHeaders: config.RATE_LIMIT.LEGACY_HEADERS,
    skipSuccessfulRequests: config.RATE_LIMIT.SKIP_SUCCESSFUL_REQUESTS,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        limit: config.RATE_LIMIT.MAX_REQUESTS,
        windowMs: config.RATE_LIMIT.WINDOW_MS
      });
    },
    onLimitReached: (req, res, options) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    }
  });

  /**
   * Strict rate limiter for sensitive endpoints
   */
  static strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        message: 'This is a sensitive endpoint with strict rate limiting'
      });
    }
  });

  /**
   * Login rate limiter
   */
  static loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: {
      success: false,
      error: 'Too many login attempts, please try again later',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many login attempts, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        message: 'Your account has been temporarily locked due to too many failed login attempts'
      });
    },
    onLimitReached: (req, res, options) => {
      console.warn(`Login rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email}`);
    }
  });

  /**
   * Password reset rate limiter
   */
  static passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
      success: false,
      error: 'Too many password reset attempts, please try again later',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many password reset attempts, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        message: 'Please wait before requesting another password reset'
      });
    }
  });

  /**
   * Verification code rate limiter (for 2FA, email verification, etc.)
   */
  static verificationCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 verification attempts per window
    message: {
      success: false,
      error: 'Too many verification attempts, please try again later',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many verification attempts, please try again later',
        retryAfter: res.getHeader('Retry-After'),
        message: 'Please check your code and try again later'
      });
    }
  });

  /**
   * Custom rate limiter with dynamic configuration
   */
  static createCustomLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,
      max = 100,
      message = 'Too many requests',
      skipSuccessfulRequests = false,
      keyGenerator = (req) => req.ip,
      ...otherOptions
    } = options;

    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests,
      keyGenerator,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: message,
          retryAfter: res.getHeader('Retry-After'),
          limit: max,
          windowMs: windowMs
        });
      },
      ...otherOptions
    });
  }

  /**
   * User-based rate limiter (limits per user ID rather than IP)
   */
  static userBasedLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour per user
    message: {
      success: false,
      error: 'Too many requests for this user account',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user ? req.user.id : req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests for this user account',
        retryAfter: res.getHeader('Retry-After'),
        message: req.user ? 'Your account has exceeded the hourly request limit' : 'Your IP has exceeded the hourly request limit'
      });
    }
  });

  /**
   * API key rate limiter
   */
  static apiKeyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10000, // 10000 requests per hour per API key
    message: {
      success: false,
      error: 'API key rate limit exceeded',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Extract API key from header
      return req.headers['x-api-key'] || req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'API key rate limit exceeded',
        retryAfter: res.getHeader('Retry-After'),
        message: 'Your API key has exceeded the hourly request limit'
      });
    }
  });

  /**
   * Sliding window rate limiter
   */
  static slidingWindowLimiter(options = {}) {
    const {
      windowMs = 60 * 1000, // 1 minute window
      max = 60, // 60 requests per minute
      ...otherOptions
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!requests.has(key)) {
        requests.set(key, []);
      }

      const userRequests = requests.get(key);
      
      // Remove requests outside the window
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        });
      }

      // Add current request
      validRequests.push(now);
      requests.set(key, validRequests);

      next();
    };
  }
}

module.exports = RateLimitMiddleware;
