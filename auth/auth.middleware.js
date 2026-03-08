const JWTUtils = require('./jwt.utils');
const RefreshTokenUtils = require('./refreshToken.utils');
const config = require('./config');

/**
 * Main authentication middleware
 */
class AuthMiddleware {
  /**
   * Verify access token
   */
  static verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'No authorization header provided'
        });
      }

      const token = JWTUtils.extractTokenFromHeader(authHeader);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authorization header format. Expected: Bearer <token>'
        });
      }

      // Verify the token
      const decoded = JWTUtils.verifyToken(token);
      
      // Attach user info to request
      req.user = {
        id: decoded.userId || decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
      
      req.tokenPayload = decoded;
      
      next();
    } catch (error) {
      if (error.message === 'Token has expired') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Token verification failed'
      });
    }
  }

  /**
   * Check if user has required role
   */
  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredRoles,
          userRoles: userRoles
        });
      }
      
      next();
    };
  }

  /**
   * Check if user has required permissions
   */
  static requirePermission(permissions) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredPermissions,
          userPermissions: userPermissions
        });
      }
      
      next();
    };
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }

      const token = JWTUtils.extractTokenFromHeader(authHeader);
      
      if (!token) {
        return next();
      }

      try {
        const decoded = JWTUtils.verifyToken(token);
        req.user = {
          id: decoded.userId || decoded.sub,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || []
        };
        req.tokenPayload = decoded;
      } catch (error) {
        // Continue without authentication
      }
      
      next();
    } catch (error) {
      next();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const refreshTokenUtils = new RefreshTokenUtils();
      const verification = refreshTokenUtils.verifyRefreshToken(refreshToken);
      
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: verification.error || 'Invalid refresh token'
        });
      }

      // Generate new access token
      const newAccessToken = JWTUtils.generateToken({
        userId: verification.userId,
        ...verification.payload
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          tokenType: 'Bearer',
          expiresIn: config.JWT.EXPIRES_IN
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  }

  /**
   * Logout and revoke tokens
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const refreshTokenUtils = new RefreshTokenUtils();
      
      // Revoke refresh token if provided
      if (refreshToken) {
        refreshTokenUtils.revokeRefreshToken(refreshToken);
      }
      
      // Revoke all user tokens if user is authenticated
      if (req.user) {
        refreshTokenUtils.revokeAllUserTokens(req.user.id);
      }
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Middleware to check token expiry and warn if close to expiration
   */
  static checkTokenExpiry(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }

      const token = JWTUtils.extractTokenFromHeader(authHeader);
      
      if (token && JWTUtils.isTokenAboutToExpire(token, 5)) {
        res.setHeader('X-Token-Expiry-Warning', 'true');
      }
      
      next();
    } catch (error) {
      next();
    }
  }
}

module.exports = AuthMiddleware;
