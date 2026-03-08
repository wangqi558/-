# Authentication Middleware and JWT Utilities

A comprehensive authentication system with JWT token management, password hashing, refresh tokens, rate limiting, and security middleware for Node.js and Express applications.

## Features

- **JWT Token Management**: Generate, verify, and decode JWT tokens with configurable expiration
- **Password Security**: Bcrypt-based password hashing with strength validation
- **Refresh Tokens**: Secure refresh token handling with rotation and revocation
- **Authentication Middleware**: Route protection with role-based and permission-based access control
- **Rate Limiting**: Multiple rate limiting strategies for different endpoints
- **Error Handling**: Centralized error handling with proper error codes and messages
- **Security**: Helmet.js integration, CORS support, and secure cookie configuration

## Installation

```bash
npm install jsonwebtoken bcrypt express-rate-limit express-validator helmet cors dotenv
```

## Quick Start

```javascript
const express = require('express');
const AuthMiddleware = require('./auth/auth.middleware');
const JWTUtils = require('./auth/jwt.utils');

const app = express();

// Protected route
app.get('/api/protected', AuthMiddleware.verifyToken, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

// Admin only route
app.get('/api/admin', 
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);
```

## Configuration

Create a `.env` file with the following variables:

```env
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=production
```

## JWT Utilities

### Generate Token

```javascript
const JWTUtils = require('./auth/jwt.utils');

// Generate access token
const token = JWTUtils.generateToken({
  userId: '12345',
  email: 'user@example.com',
  role: 'user'
});

// Generate token pair (access + refresh)
const { accessToken, refreshToken } = JWTUtils.generateTokenPair({
  userId: '12345',
  email: 'user@example.com'
});
```

### Verify Token

```javascript
try {
  const decoded = JWTUtils.verifyToken(token);
  console.log(decoded); // Token payload
} catch (error) {
  console.error('Token verification failed:', error.message);
}
```

### Check Token Expiry

```javascript
const isAboutToExpire = JWTUtils.isTokenAboutToExpire(token, 5); // 5 minutes threshold
```

## Password Utilities

### Hash Password

```javascript
const PasswordUtils = require('./auth/password.utils');

// Hash password
const hashedPassword = await PasswordUtils.hashPassword('userPassword123');

// Compare password
const isValid = await PasswordUtils.comparePassword('userPassword123', hashedPassword);
```

### Validate Password Strength

```javascript
const validation = PasswordUtils.validatePassword('MyPassword123!', {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
});

console.log(validation.isValid); // true/false
console.log(validation.errors); // Array of error messages
console.log(validation.strength); // Strength score (0-5)
```

### Generate Secure Password

```javascript
const securePassword = PasswordUtils.generateSecurePassword(16);
```

## Authentication Middleware

### Basic Authentication

```javascript
// Protect route - requires valid token
app.get('/api/protected', AuthMiddleware.verifyToken, (req, res) => {
  // req.user contains decoded token payload
  res.json({ user: req.user });
});
```

### Role-Based Access

```javascript
// Single role
app.get('/api/admin', AuthMiddleware.requireRole('admin'), handler);

// Multiple roles (OR condition)
app.get('/api/moderator', AuthMiddleware.requireRole(['admin', 'moderator']), handler);
```

### Permission-Based Access

```javascript
// Single permission
app.post('/api/posts', AuthMiddleware.requirePermission('write'), handler);

// Multiple permissions (AND condition)
app.delete('/api/posts/:id', AuthMiddleware.requirePermission(['write', 'delete']), handler);
```

### Optional Authentication

```javascript
app.get('/api/public', AuthMiddleware.optionalAuth, (req, res) => {
  // req.user might be undefined or contain user info
  if (req.user) {
    // User is authenticated
  } else {
    // User is not authenticated
  }
});
```

### Token Refresh

```javascript
app.post('/api/auth/refresh', AuthMiddleware.refreshAccessToken);

// Request body:
// {
//   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
// }
```

### Logout

```javascript
app.post('/api/auth/logout', AuthMiddleware.verifyToken, AuthMiddleware.logout);
```

## Refresh Token Management

```javascript
const RefreshTokenUtils = require('./auth/refreshToken.utils');
const refreshTokenUtils = new RefreshTokenUtils();

// Store refresh token
refreshTokenUtils.storeRefreshToken(userId, refreshToken);

// Verify refresh token
const result = refreshTokenUtils.verifyRefreshToken(refreshToken);

// Revoke refresh token
refreshTokenUtils.revokeRefreshToken(refreshToken);

// Revoke all user tokens
refreshTokenUtils.revokeAllUserTokens(userId);

// Rotate refresh token
const newTokens = refreshTokenUtils.rotateRefreshToken(oldRefreshToken, payload);
```

## Rate Limiting

### Pre-configured Limiters

```javascript
const RateLimitMiddleware = require('./auth/rateLimit.middleware');

// General API rate limiting
app.use('/api/', RateLimitMiddleware.apiLimiter);

// Login attempts
app.use('/api/auth/login', RateLimitMiddleware.loginLimiter);

// Password reset
app.use('/api/auth/reset-password', RateLimitMiddleware.passwordResetLimiter);

// Verification codes
app.use('/api/verify', RateLimitMiddleware.verificationCodeLimiter);

// Strict limiting for sensitive endpoints
app.use('/api/admin', RateLimitMiddleware.strictLimiter);
```

### Custom Rate Limiter

```javascript
const customLimiter = RateLimitMiddleware.createCustomLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per window
  message: 'Custom rate limit message'
});

app.use('/api/custom', customLimiter);
```

### User-Based Rate Limiting

```javascript
app.use('/api/user', RateLimitMiddleware.userBasedLimiter);
```

### API Key Rate Limiting

```javascript
app.use('/api/key', RateLimitMiddleware.apiKeyLimiter);
```

## Error Handling

### Global Error Handler

```javascript
const { globalErrorHandler } = require('./auth/errorHandler');

// Add as the last middleware
app.use(globalErrorHandler);
```

### Custom Errors

```javascript
const { ErrorHandler } = require('./auth/errorHandler');

// Throw custom errors
throw ErrorHandler.authErrors.INVALID_CREDENTIALS();
throw ErrorHandler.authErrors.TOKEN_EXPIRED();
throw ErrorHandler.authErrors.INSUFFICIENT_PERMISSIONS();

// Create custom errors
const error = ErrorHandler.createError('Custom error', 400, 'CUSTOM_ERROR');
```

### Async Error Wrapper

```javascript
const { ErrorHandler } = require('./auth/errorHandler');

// Wrap async route handlers
app.get('/api/data', ErrorHandler.asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

## Security Best Practices

1. **Environment Variables**: Always use environment variables for sensitive configuration
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store tokens securely (httpOnly cookies recommended)
4. **Token Expiration**: Use short expiration times for access tokens
5. **Rate Limiting**: Implement rate limiting on all authentication endpoints
6. **Password Policy**: Enforce strong password requirements
7. **Input Validation**: Always validate and sanitize user input
8. **Error Messages**: Don't expose sensitive information in error messages

## Production Considerations

1. **Refresh Token Storage**: Use Redis or a database instead of in-memory storage
2. **Token Blacklisting**: Implement proper token blacklisting
3. **Key Rotation**: Regularly rotate JWT secrets
4. **Monitoring**: Implement proper logging and monitoring
5. **Testing**: Write comprehensive tests for all authentication flows
6. **Performance**: Consider caching strategies for frequently accessed data

## Example Implementation

See `example.js` for a complete implementation example with:
- User registration with password validation
- Login with rate limiting
- Token refresh
- Protected routes with role-based access
- Optional authentication
- Error handling

## License

MIT
