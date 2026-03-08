import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../../../errors/AppError';

/**
 * Custom validation middleware for rating objects
 */
export const validateRatingObjectInput = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    return next(new AppError('Validation failed', 400, { errors: errorMessages }));
  }

  next();
};

/**
 * Validate rating object permissions
 */
export const validateRatingObjectPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const objectId = req.params.id;

  // If user is admin, allow all operations
  if (userRole === 'admin' || userRole === 'moderator') {
    return next();
  }

  // For non-admin users, check if they own the rating object
  if (req.method === 'PATCH' || req.method === 'DELETE') {
    try {
      const result = await req.db.query(
        'SELECT creator_id FROM rating_objects WHERE id = $1',
        [objectId]
      );

      if (result.rows.length === 0) {
        return next(new AppError('Rating object not found', 404));
      }

      const creatorId = result.rows[0].creator_id;

      if (creatorId !== userId) {
        return next(new AppError('You can only modify your own rating objects', 403));
      }
    } catch (error) {
      return next(error);
    }
  }

  next();
};

/**
 * Validate rating object status transitions
 */
export const validateStatusTransition = (
  currentStatus: string,
  newStatus: string,
  userRole: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    active: ['inactive', 'deleted'],
    inactive: ['active', 'deleted'],
    deleted: [], // Cannot transition from deleted
  };

  // Admins can make any transition
  if (userRole === 'admin' || userRole === 'moderator') {
    return true;
  }

  // Regular users can only delete their own objects
  if (newStatus === 'deleted') {
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  return false;
};

/**
 * Validate rating object search parameters
 */
export const validateSearchParams = (req: Request, res: Response, next: NextFunction): void => {
  const { minRating, maxRating, startDate, endDate } = req.query;

  // Validate rating range
  if (minRating || maxRating) {
    const min = minRating ? parseFloat(minRating as string) : 1;
    const max = maxRating ? parseFloat(maxRating as string) : 5;

    if (min < 1 || max > 5 || min > max) {
      return next(new AppError('Invalid rating range. Must be between 1 and 5', 400));
    }
  }

  // Validate date range
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;

    if (start && isNaN(start.getTime())) {
      return next(new AppError('Invalid start date format', 400));
    }

    if (end && isNaN(end.getTime())) {
      return next(new AppError('Invalid end date format', 400));
    }

    if (start && end && start > end) {
      return next(new AppError('Start date must be before end date', 400));
    }
  }

  next();
};

/**
 * Sanitize rating object input
 */
export const sanitizeRatingObjectInput = (req: Request, res: Response, next: NextFunction): void => {
  const { title, description, category, tags } = req.body;

  // Trim string fields
  if (title) req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  if (category) req.body.category = category.trim();

  // Normalize tags
  if (tags && Array.isArray(tags)) {
    req.body.tags = tags
      .map((tag: string) => tag.trim().toLowerCase())
      .filter((tag: string) => tag.length > 0)
      .slice(0, 20); // Limit to 20 tags
  }

  next();
};
