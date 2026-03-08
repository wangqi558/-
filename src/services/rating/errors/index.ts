import { AppError } from '../../../errors/AppError';

export class DuplicateRatingError extends AppError {
  constructor(message = 'You have already rated this item') {
    super(message, 409);
    this.name = 'DuplicateRatingError';
  }
}

export class InvalidRatingError extends AppError {
  constructor(message = 'Invalid rating value') {
    super(message, 400);
    this.name = 'InvalidRatingError';
  }
}

export class RatingNotFoundError extends AppError {
  constructor(message = 'Rating not found') {
    super(message, 404);
    this.name = 'RatingNotFoundError';
  }
}

export class RatingStatsNotFoundError extends AppError {
  constructor(message = 'Rating statistics not found') {
    super(message, 404);
    this.name = 'RatingStatsNotFoundError';
  }
}

export class RatingCacheError extends AppError {
  constructor(message = 'Rating cache operation failed') {
    super(message, 500);
    this.name = 'RatingCacheError';
  }
}
