import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/database';
import { User } from '../types';
import { sendPasswordResetEmail, sendSuspensionEmail } from '../utils/email';
    // Send email notification
    await sendPasswordResetEmail(user.email, token);
import { config } from '../config/env';

interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used: boolean;
}

interface UserSuspension {
  id: number;
  user_id: number;
  reason: string;
  duration: string;
  suspended_at: Date;
  expires_at?: Date;
  suspended_by: number;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  bio?: string;
  avatar?: string;
  is_suspended?: boolean;
  suspension_expires_at?: Date;
}

export class UserService {
  private readonly BCRYPT_ROUNDS = 10;
  private readonly JWT_EXPIRES_IN = '7d';
  private readonly RESET_TOKEN_EXPIRES_IN = 60 * 60 * 1000; // 1 hour

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<Omit<User, 'password_hash'>> {
    const { email, username, password } = data;

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, username, reputation, role, created_at, updated_at`,
      [email, username, passwordHash]
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  /**
   * Validate password
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      config.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: number,
    data: { username?: string; bio?: string; avatar?: string }
  ): Promise<UserProfile> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(data.username);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(data.bio);
    }
    if (data.avatar !== undefined) {
      fields.push(`avatar = $${paramCount++}`);
      values.push(data.avatar);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount}
       RETURNING id, email, username, reputation, role, created_at, updated_at, bio, avatar`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return this.getUserProfile(result.rows[0].id);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Validate current password
    const isValid = await this.validatePassword(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: number): Promise<string> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRES_IN);

    // Store in database
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    return token;
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.validatePasswordResetToken(token);

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, resetToken.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [resetToken.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user profile with suspension status
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.reputation, u.role, 
              u.created_at, u.updated_at, u.bio, u.avatar,
              us.suspended_at, us.expires_at as suspension_expires_at
       FROM users u
       LEFT JOIN user_suspensions us ON u.id = us.user_id 
         AND (us.expires_at IS NULL OR us.expires_at > NOW())
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    return {
      ...user,
      is_suspended: !!user.suspended_at,
      suspension_expires_at: user.suspension_expires_at
    };
  }

  /**
   * Suspend user
   */
  async suspendUser(
    userId: number,
    reason: string,
    duration: string,
    suspendedBy: number
  ): Promise<void> {
    let expiresAt: Date | null = null;

    if (duration !== 'permanent') {
      const durationMs = this.parseDuration(duration);
      expiresAt = new Date(Date.now() + durationMs);
    }

    // Get user email for notification
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert suspension record
      await client.query(
        `INSERT INTO user_suspensions (user_id, reason, duration, expires_at, suspended_by) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, reason, duration, expiresAt, suspendedBy]
      );

      // Update user status
      await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['suspended', userId]
      );

      await client.query('COMMIT');

      // Send email notification
      await sendSuspensionEmail(user.email, duration, reason, expiresAt || undefined);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user reputation
   */
  async updateReputation(
    userId: number,
    action: 'increase' | 'decrease',
    amount: number,
    reason: string,
    adminId: number
  ): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update reputation
      const operator = action === 'increase' ? '+' : '-';
      const result = await client.query(
        `UPDATE users 
         SET reputation = reputation ${operator} $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING reputation`,
        [amount, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const newReputation = result.rows[0].reputation;

      // Log reputation change
      await client.query(
        `INSERT INTO reputation_logs (user_id, action, amount, reason, admin_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, amount, reason, adminId]
      );

      await client.query('COMMIT');

      return newReputation;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user is suspended
   */
  async isUserSuspended(userId: number): Promise<{ suspended: boolean; expiresAt?: Date }> {
    const result = await pool.query(
      `SELECT expires_at FROM user_suspensions 
       WHERE user_id = $1 
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY suspended_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { suspended: false };
    }

    return {
      suspended: true,
      expiresAt: result.rows[0].expires_at
    };
  }

  /**
   * Get user reputation history
   */
  async getReputationHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT rl.action, rl.amount, rl.reason, rl.created_at, u.username as admin_username
       FROM reputation_logs rl
       LEFT JOIN users u ON rl.admin_id = u.id
       WHERE rl.user_id = $1
       ORDER BY rl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new Error('Invalid duration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        throw new Error('Invalid duration unit');
    }
  }
}

export const userService = new UserService();
