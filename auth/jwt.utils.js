const jwt = require('jsonwebtoken');
const config = require('./config');

class JWTUtils {
  /**
   * Generate a JWT token
   * @param {Object} payload - The payload to include in the token
   * @param {string} expiresIn - Token expiration time
   * @returns {string} - The generated JWT token
   */
  static generateToken(payload, expiresIn = config.JWT.EXPIRES_IN) {
    try {
      const token = jwt.sign(payload, config.JWT.SECRET, {
        expiresIn,
        algorithm: config.JWT.ALGORITHM
      });
      return token;
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify a JWT token
   * @param {string} token - The token to verify
   * @returns {Object} - The decoded token payload
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.JWT.SECRET, {
        algorithms: [config.JWT.ALGORITHM]
      });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode a JWT token without verification
   * @param {string} token - The token to decode
   * @returns {Object} - The decoded token payload
   */
  static decodeToken(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      throw new Error(`Token decoding failed: ${error.message}`);
    }
  }

  /**
   * Generate token pair (access and refresh tokens)
   * @param {Object} payload - The payload for both tokens
   * @returns {Object} - Object containing accessToken and refreshToken
   */
  static generateTokenPair(payload) {
    try {
      const accessToken = this.generateToken(payload, config.JWT.EXPIRES_IN);
      const refreshToken = this.generateToken(payload, config.REFRESH_TOKEN.EXPIRES_IN);
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      throw new Error(`Token pair generation failed: ${error.message}`);
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - The Authorization header value
   * @returns {string|null} - The extracted token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if token is about to expire
   * @param {string} token - The token to check
   * @param {number} thresholdMinutes - Minutes before expiration to consider as "about to expire"
   * @returns {boolean} - True if token is about to expire
   */
  static isTokenAboutToExpire(token, thresholdMinutes = 5) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      const thresholdSeconds = thresholdMinutes * 60;
      
      return timeUntilExpiry < thresholdSeconds;
    } catch (error) {
      return true;
    }
  }
}

module.exports = JWTUtils;
