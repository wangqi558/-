import { Request, Response } from 'express';
import { userService, CreateUserData } from '../services/userService';
import { AuthRequest } from '../types';
import { config } from '../config/env';

/**
 * User registration controller
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    // Check if email already exists
    if (await userService.emailExists(email)) {
      return res.status(409).json({
        error: 'Email already registered',
        field: 'email'
      });
    }

    // Check if username already exists
    if (await userService.usernameExists(username)) {
      return res.status(409).json({
        error: 'Username already taken',
        field: 'username'
      });
    }

    // Create user
    const userData: CreateUserData = { email, username, password };
    const user = await userService.createUser(userData);

    // Generate JWT token
    const token = userService.generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        reputation: user.reputation,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * User login controller
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is suspended
    const suspension = await userService.isUserSuspended(user.id);
    if (suspension.suspended) {
      return res.status(403).json({
        error: 'Account suspended',
        suspension: {
          expiresAt: suspension.expiresAt
        }
      });
    }

    // Validate password
    const isValidPassword = await userService.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = userService.generateToken(user);

    res.json({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        reputation: user.reputation,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await userService.getUserProfile(userId);

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { username, bio, avatar } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await userService.findByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          error: 'Username already taken',
          field: 'username'
        });
      }
    }

    const profile = await userService.updateProfile(userId, { username, bio, avatar });

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(userId, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Forgot password - send reset email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    // Create reset token
    const resetToken = await userService.createPasswordResetToken(user.id);

    // Send email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset password using token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    await userService.resetPassword(token, newPassword);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    if (error.message === 'Invalid or expired reset token') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * Admin: Suspend user
 */
export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, reason, duration } = req.body;
    const adminId = req.user!.id;

    await userService.suspendUser(userId, reason, duration, adminId);

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

/**
 * Admin: Update user reputation
 */
export const updateReputation = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action, amount, reason } = req.body;
    const adminId = req.user!.id;

    const newReputation = await userService.updateReputation(
      userId,
      action,
      amount,
      reason,
      adminId
    );

    res.json({
      message: 'Reputation updated successfully',
      newReputation
    });
  } catch (error) {
    console.error('Update reputation error:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
};

/**
 * Get user reputation history
 */
export const getReputationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await userService.getReputationHistory(userId, limit, offset);

    res.json({ history });
  } catch (error) {
    console.error('Get reputation history error:', error);
    res.status(500).json({ error: 'Failed to get reputation history' });
  }
};
