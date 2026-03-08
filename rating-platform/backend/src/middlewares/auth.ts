import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Authenticate user and check for suspension
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Check if user is suspended
    const suspension = await userService.isUserSuspended(decoded.id);
    if (suspension.suspended) {
      return res.status(403).json({
        error: 'Account suspended',
        suspension: {
          expiresAt: suspension.expiresAt
        }
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Require admin role
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Check if user is suspended
    const suspension = await userService.isUserSuspended(decoded.id);
    if (!suspension.suspended) {
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Invalid token, but we don't fail - just continue without auth
    next();
  }
};
