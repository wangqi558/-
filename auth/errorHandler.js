/**
 * Centralized error handler for authentication errors
 */
class ErrorHandler {
  /**
   * Handle authentication errors
   */
  static handleAuthError(error, req, res, next) {
    console.error('Auth Error:', error);

    // JWT specific errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        message: 'Please login again to continue'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'The provided token is invalid'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        error: 'Token not active',
        code: 'TOKEN_NOT_ACTIVE',
        message: 'The token is not yet active'
      });
    }

    // Rate limiting errors
    if (error.statusCode === 429) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: error.message || 'Please try again later',
        retryAfter: error.headers?.['Retry-After']
      });
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors || error.message
      });
    }

    // Authentication errors
    if (error.message?.toLowerCase().includes('authentication')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        message: error.message
      });
    }

    // Authorization errors
    if (error.message?.toLowerCase().includes('permission') || 
        error.message?.toLowerCase().includes('unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        message: error.message
      });
    }

    // Password errors
    if (error.message?.toLowerCase().includes('password')) {
      return res.status(400).json({
        success: false,
        error: 'Password error',
        code: 'PASSWORD_ERROR',
        message: error.message
      });
    }

    // Default error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }

  /**
   * Async error wrapper for route handlers
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create custom error with status code
   */
  static createError(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  /**
   * Authentication error factory
   */
  static authErrors = {
    INVALID_CREDENTIALS: (message = 'Invalid credentials') => 
      ErrorHandler.createError(message, 401, 'INVALID_CREDENTIALS'),
    
    TOKEN_EXPIRED: (message = 'Token has expired') => 
      ErrorHandler.createError(message, 401, 'TOKEN_EXPIRED'),
    
    INVALID_TOKEN: (message = 'Invalid token') => 
      ErrorHandler.createError(message, 401, 'INVALID_TOKEN'),
    
    MISSING_TOKEN: (message = 'No token provided') => 
      ErrorHandler.createError(message, 401, 'MISSING_TOKEN'),
    
    INSUFFICIENT_PERMISSIONS: (message = 'Insufficient permissions') => 
      ErrorHandler.createError(message, 403, 'INSUFFICIENT_PERMISSIONS'),
    
    ACCOUNT_LOCKED: (message = 'Account is locked') => 
      ErrorHandler.createError(message, 403, 'ACCOUNT_LOCKED'),
    
    EMAIL_NOT_VERIFIED: (message = 'Email not verified') => 
      ErrorHandler.createError(message, 403, 'EMAIL_NOT_VERIFIED'),
    
    TWO_FACTOR_REQUIRED: (message = 'Two-factor authentication required') => 
      ErrorHandler.createError(message, 403, 'TWO_FACTOR_REQUIRED'),
    
    PASSWORD_TOO_WEAK: (message = 'Password is too weak') => 
      ErrorHandler.createError(message, 400, 'PASSWORD_TOO_WEAK'),
    
    PASSWORD_MISMATCH: (message = 'Passwords do not match') => 
      ErrorHandler.createError(message, 400, 'PASSWORD_MISMATCH'),
    
    USER_NOT_FOUND: (message = 'User not found') => 
      ErrorHandler.createError(message, 404, 'USER_NOT_FOUND'),
    
    USER_ALREADY_EXISTS: (message = 'User already exists') => 
      ErrorHandler.createError(message, 409, 'USER_ALREADY_EXISTS'),
    
    INVALID_REFRESH_TOKEN: (message = 'Invalid refresh token') => 
      ErrorHandler.createError(message, 401, 'INVALID_REFRESH_TOKEN'),
    
    RATE_LIMIT_EXCEEDED: (message = 'Too many requests') => 
      ErrorHandler.createError(message, 429, 'RATE_LIMIT_EXCEEDED')
  };

  /**
   * Sanitize error for client response
   */
  static sanitizeError(error) {
    const sanitized = {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR'
    };

    if (error.details) {
      sanitized.details = error.details;
    }

    if (error.retryAfter) {
      sanitized.retryAfter = error.retryAfter;
    }

    return sanitized;
  }

  /**
   * Log error details (for server-side logging)
   */
  static logError(error, req) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      }
    };

    // In production, use proper logging service
    console.error('Error Log:', JSON.stringify(logData, null, 2));
  }
}

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log error for debugging
  ErrorHandler.logError(err, req);
  
  // Handle the error
  ErrorHandler.handleAuthError(err, req, res, next);
};

module.exports = {
  ErrorHandler,
  globalErrorHandler
};
