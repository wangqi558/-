const JWTUtils = require('./jwt.utils');
const PasswordUtils = require('./password.utils');
const RefreshTokenUtils = require('./refreshToken.utils');
const config = require('./config');

describe('Authentication Utilities', () => {
  // JWT Utils Tests
  describe('JWTUtils', () => {
    const payload = {
      userId: '12345',
      email: 'test@example.com',
      role: 'user'
    };

    test('should generate a valid token', () => {
      const token = JWTUtils.generateToken(payload);
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify a valid token', () => {
      const token = JWTUtils.generateToken(payload);
      const decoded = JWTUtils.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    test('should generate token pair', () => {
      const { accessToken, refreshToken } = JWTUtils.generateTokenPair(payload);
      
      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
      expect(accessToken).not.toBe(refreshToken);
    });

    test('should extract token from header', () => {
      const token = 'valid.jwt.token';
      const header = `Bearer ${token}`;
      
      expect(JWTUtils.extractTokenFromHeader(header)).toBe(token);
      expect(JWTUtils.extractTokenFromHeader('InvalidHeader')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader(null)).toBeNull();
    });
  });

  // Password Utils Tests
  describe('PasswordUtils', () => {
    test('should hash password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
    });

    test('should compare password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      
      const isValid = await PasswordUtils.comparePassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await PasswordUtils.comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    test('should validate password strength', () => {
      const weakPassword = 'password';
      const strongPassword = 'StrongP@ssw0rd123!';
      
      const weakValidation = PasswordUtils.validatePassword(weakPassword);
      expect(weakValidation.isValid).toBe(false);
      expect(weakValidation.errors.length).toBeGreaterThan(0);
      
      const strongValidation = PasswordUtils.validatePassword(strongPassword, {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      });
      expect(strongValidation.isValid).toBe(true);
      expect(strongValidation.errors.length).toBe(0);
    });

    test('should generate secure password', () => {
      const password = PasswordUtils.generateSecurePassword(16);
      
      expect(password).toBeTruthy();
      expect(password.length).toBe(16);
      
      // Check for at least one character from each category
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[^a-zA-Z\d]/.test(password)).toBe(true);
    });
  });

  // Refresh Token Utils Tests
  describe('RefreshTokenUtils', () => {
    let refreshTokenUtils;
    const userId = '12345';
    const payload = { userId, email: 'test@example.com' };

    beforeEach(() => {
      refreshTokenUtils = new RefreshTokenUtils();
    });

    test('should generate refresh token', () => {
      const refreshToken = RefreshTokenUtils.generateRefreshToken(payload);
      expect(refreshToken).toBeTruthy();
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    test('should store and verify refresh token', () => {
      const refreshToken = RefreshTokenUtils.generateRefreshToken(payload);
      
      refreshTokenUtils.storeRefreshToken(userId, refreshToken);
      
      const verification = refreshTokenUtils.verifyRefreshToken(refreshToken);
      expect(verification.valid).toBe(true);
      expect(verification.userId).toBe(userId);
    });

    test('should revoke refresh token', () => {
      const refreshToken = RefreshTokenUtils.generateRefreshToken(payload);
      
      refreshTokenUtils.storeRefreshToken(userId, refreshToken);
      refreshTokenUtils.revokeRefreshToken(refreshToken);
      
      const verification = refreshTokenUtils.verifyRefreshToken(refreshToken);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Token has been revoked');
    });

    test('should rotate refresh token', () => {
      const oldRefreshToken = RefreshTokenUtils.generateRefreshToken(payload);
      
      refreshTokenUtils.storeRefreshToken(userId, oldRefreshToken);
      
      const newTokenPair = refreshTokenUtils.rotateRefreshToken(oldRefreshToken, payload);
      
      expect(newTokenPair.accessToken).toBeTruthy();
      expect(newTokenPair.refreshToken).toBeTruthy();
      expect(newTokenPair.refreshToken).not.toBe(oldRefreshToken);
      
      // Old token should be revoked
      const oldVerification = refreshTokenUtils.verifyRefreshToken(oldRefreshToken);
      expect(oldVerification.valid).toBe(false);
    });
  });
});
