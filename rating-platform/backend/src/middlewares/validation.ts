import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for report submission
 */
export const validateReportSubmission = [
  body('reason')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
    .trim()
    .escape(),
  
  body('target_type')
    .isIn(['rating', 'comment', 'object'])
    .withMessage('Target type must be one of: rating, comment, object'),
  
  body('target_id')
    .isInt({ min: 1 })
    .withMessage('Target ID must be a positive integer')
];

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};
