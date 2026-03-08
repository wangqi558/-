const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

// Import authentication utilities
const AuthMiddleware = require('./auth.middleware');
const JWTUtils = require('./jwt.utils');
const PasswordUtils = require('./password.utils');
const RefreshTokenUtils = require('./refreshToken.utils');
const RateLimitMiddleware = require('./rateLimit.middleware');
const { globalErrorHandler } = require('./errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', RateLimitMiddleware.apiLimiter);
app.use('/api/auth/login', RateLimitMiddleware.loginLimiter);
app.use('/api/auth/reset-password', RateLimitMiddleware.passwordResetLimiter);

// Routes

// User registration
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePassword(password, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    });

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Hash password
    const hashedPassword = await PasswordUtils.hashPassword(password);

    // In real app, save user to database
    const userId = Date.now().toString(); // Mock user ID

    // Generate token pair
    const tokenPair = JWTUtils.generateTokenPair({
      userId,
      email,
      role: 'user'
    });

    // Store refresh token
    const refreshTokenUtils = new RefreshTokenUtils();
    refreshTokenUtils.storeRefreshToken(userId, tokenPair.refreshToken);

    res.status(201).json({
      success: true,
      data: {
        userId,
        email,
        name,
        tokens: tokenPair,
        passwordStrength: passwordValidation.strength
      }
    });
  } catch (error) {
    next(error);
  }
});

// User login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // In real app, fetch user from database
    const mockUser = {
      id: '12345',
      email: 'user@example.com',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/R7ARZ4yLu', // "password123"
      role: 'user',
      permissions: ['read', 'write']
    };

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(password, mockUser.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token pair
    const tokenPair = JWTUtils.generateTokenPair({
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      permissions: mockUser.permissions
    });

    // Store refresh token
    const refreshTokenUtils = new RefreshTokenUtils();
    refreshTokenUtils.storeRefreshToken(mockUser.id, tokenPair.refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role
        },
        tokens: tokenPair
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refresh access token
app.post('/api/auth/refresh', AuthMiddleware.refreshAccessToken);

// Logout
app.post('/api/auth/logout', AuthMiddleware.verifyToken, AuthMiddleware.logout);

// Protected route - requires authentication
app.get('/api/user/profile', AuthMiddleware.verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      message: 'This is a protected route'
    }
  });
});

// Protected route - requires admin role
app.get('/api/admin/users', 
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole('admin'),
  (req, res) => {
    res.json({
      success: true,
      data: {
        users: [], // Mock data
        message: 'Admin only route'
      }
    });
  }
);

// Protected route - requires specific permission
app.post('/api/documents',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requirePermission('write'),
  (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Document created successfully',
        user: req.user
      }
    });
  }
);

// Optional authentication route
app.get('/api/public/data', AuthMiddleware.optionalAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Public data',
      authenticated: !!req.user,
      user: req.user || null
    }
  });
});

// Token expiry check
app.get('/api/token-status', 
  AuthMiddleware.verifyToken,
  AuthMiddleware.checkTokenExpiry,
  (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const isAboutToExpire = JWTUtils.isTokenAboutToExpire(token, 5);
    
    res.json({
      success: true,
      data: {
        valid: true,
        aboutToExpire: isAboutToExpire,
        user: req.user
      }
    });
  }
);

// Global error handler
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
