const JWTUtils = require('./jwt.utils');
const config = require('./config');

class RefreshTokenUtils {
  constructor() {
    // In production, use Redis or a database to store refresh tokens
    this.refreshTokens = new Map();
    this.blacklistedTokens = new Set();
  }

  /**
   * Generate a refresh token
   * @param {Object} payload - The payload to include in the token
   * @returns {string} - The generated refresh token
   */
  static generateRefreshToken(payload) {
    try {
      const refreshToken = JWTUtils.generateToken(
        payload, 
        config.REFRESH_TOKEN.EXPIRES_IN
      );
      return refreshToken;
    } catch (error) {
      throw new Error(`Refresh token generation failed: ${error.message}`);
    }
  }

  /**
   * Store refresh token (in production, use Redis/database)
   * @param {string} userId - User ID
   * @param {string} refreshToken - The refresh token to store
   * @param {Object} metadata - Additional metadata
   */
  storeRefreshToken(userId, refreshToken, metadata = {}) {
    const tokenData = {
      token: refreshToken,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.getRefreshTokenExpiry()),
      ...metadata
    };

    // In production, store in database with TTL
    this.refreshTokens.set(refreshToken, tokenData);
    
    // Also store by user ID for easy lookup
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, new Set());
    }
    this.userTokens.get(userId).add(refreshToken);
  }

  /**
   * Verify refresh token
   * @param {string} refreshToken - The refresh token to verify
   * @returns {Object} - Verification result
   */
  static verifyRefreshToken(refreshToken) {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(refreshToken)) {
        throw new Error('Token has been revoked');
      }

      // Verify the token
      const decoded = JWTUtils.verifyToken(refreshToken);
      
      // In production, check if token exists in database
      const storedToken = this.refreshTokens.get(refreshToken);
      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      // Check if token has expired
      if (new Date() > storedToken.expiresAt) {
        this.revokeRefreshToken(refreshToken);
        throw new Error('Refresh token has expired');
      }

      return {
        valid: true,
        userId: decoded.userId || decoded.sub,
        payload: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke a refresh token
   * @param {string} refreshToken - The refresh token to revoke
   */
  revokeRefreshToken(refreshToken) {
    // Add to blacklist
    this.blacklistedTokens.add(refreshToken);
    
    // Remove from storage
    const tokenData = this.refreshTokens.get(refreshToken);
    if (tokenData) {
      this.refreshTokens.delete(refreshToken);
      
      // Remove from user tokens
      const userTokens = this.userTokens.get(tokenData.userId);
      if (userTokens) {
        userTokens.delete(refreshToken);
        if (userTokens.size === 0) {
          this.userTokens.delete(tokenData.userId);
        }
      }
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   */
  revokeAllUserTokens(userId) {
    const userTokens = this.userTokens.get(userId);
    if (userTokens) {
      userTokens.forEach(token => {
        this.blacklistedTokens.add(token);
        this.refreshTokens.delete(token);
      });
      this.userTokens.delete(userId);
    }
  }

  /**
   * Rotate refresh token
   * @param {string} oldRefreshToken - The old refresh token
   * @param {Object} payload - Payload for the new token
   * @returns {Object} - New refresh token and access token
   */
  rotateRefreshToken(oldRefreshToken, payload) {
    try {
      // Verify old token
      const verification = this.verifyRefreshToken(oldRefreshToken);
      if (!verification.valid) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newTokenPair = JWTUtils.generateTokenPair(payload);
      
      // Revoke old token
      this.revokeRefreshToken(oldRefreshToken);
      
      // Store new refresh token
      this.storeRefreshToken(
        verification.userId, 
        newTokenPair.refreshToken,
        { rotatedFrom: oldRefreshToken }
      );

      return newTokenPair;
    } catch (error) {
      throw new Error(`Token rotation failed: ${error.message}`);
    }
  }

  /**
   * Get refresh token expiry in milliseconds
   * @returns {number} - Expiry time in milliseconds
   */
  getRefreshTokenExpiry() {
    const expiresIn = config.REFRESH_TOKEN.EXPIRES_IN;
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    return value * multipliers[unit];
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [token, tokenData] of this.refreshTokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.refreshTokens.delete(token);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Get user's active tokens count
   * @param {string} userId - User ID
   * @returns {number} - Number of active tokens
   */
  getUserTokenCount(userId) {
    const userTokens = this.userTokens.get(userId);
    return userTokens ? userTokens.size : 0;
  }
}

// Initialize static properties
RefreshTokenUtils.prototype.refreshTokens = new Map();
RefreshTokenUtils.prototype.userTokens = new Map();
RefreshTokenUtils.prototype.blacklistedTokens = new Set();

module.exports = RefreshTokenUtils;
