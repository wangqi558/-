const bcrypt = require('bcrypt');
const config = require('./config');

class PasswordUtils {
  /**
   * Hash a password using bcrypt
   * @param {string} password - The plain text password
   * @param {number} saltRounds - Number of salt rounds (default from config)
   * @returns {Promise<string>} - The hashed password
   */
  static async hashPassword(password, saltRounds = config.BCRYPT.SALT_ROUNDS) {
    try {
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      const hash = await bcrypt.hash(password, saltRounds);
      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Compare a plain password with a hash
   * @param {string} password - The plain text password
   * @param {string} hash - The hashed password
   * @returns {Promise<boolean>} - True if passwords match
   */
  static async comparePassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }
      
      const isMatch = await bcrypt.compare(password, hash);
      return isMatch;
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  /**
   * Validate password strength
   * @param {string} password - The password to validate
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  static validatePassword(password, options = {}) {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = false,
      specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    } = options;

    const errors = [];

    // Check minimum length
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    // Check for uppercase letters
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letters
    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (requireSpecialChars) {
      const specialCharRegex = new RegExp(`[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026')}]`);
      if (!specialCharRegex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.getPasswordStrength(password)
    };
  }

  /**
   * Get password strength score
   * @param {string} password - The password to evaluate
   * @returns {number} - Strength score (0-5)
   */
  static getPasswordStrength(password) {
    let score = 0;

    // Length score
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;

    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;

    return Math.min(score, 5);
  }

  /**
   * Generate a secure random password
   * @param {number} length - Password length (default: 16)
   * @returns {string} - Generated password
   */
  static generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specialChars;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

module.exports = PasswordUtils;
