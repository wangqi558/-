import { User, PublicUser, UserRole } from '../models/User';
import { Rating, RatingValue, RatingWithUser } from '../models/Rating';
import { RatingObject, RatingObjectType, RatingObjectSearchResult } from '../models/RatingObject';
import { Report, ReportType, ReportStatus } from '../models/Report';

// Auth API Types
export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: UserRole;
}

export interface SignupResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// User API Types
export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  profilePicture?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfileResponse {
  user: PublicUser;
  ratings: RatingWithUser[];
  ratingObjects: RatingObjectSearchResult[];
  statistics: {
    totalRatings: number;
    averageRatingGiven: number;
    totalComments: number;
    reputation: number;
  };
}

// Rating Object API Types
export interface CreateRatingObjectRequest {
  name: string;
  description?: string;
  type: RatingObjectType;
  category: string;
  tags: string[];
  images: string[];
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  openingHours?: {
    [key: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
}

export interface UpdateRatingObjectRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  images?: string[];
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  openingHours?: {
    [key: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
}

export interface SearchRatingObjectsRequest {
  query?: string;
  type?: RatingObjectType;
  category?: string;
  tags?: string[];
  minRating?: number;
  maxRating?: number;
  verified?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  sortBy?: 'relevance' | 'rating' | 'newest' | 'most_rated';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchRatingObjectsResponse {
  results: RatingObjectSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Rating API Types
export interface CreateRatingRequest {
  ratingObjectId: string;
  value: RatingValue;
  title?: string;
  comment?: string;
  images?: string[];
  criteria?: {
    [key: string]: number;
  };
  verifiedPurchase?: boolean;
}

export interface UpdateRatingRequest {
  value?: RatingValue;
  title?: string;
  comment?: string;
  images?: string[];
  criteria?: {
    [key: string]: number;
  };
}

export interface RateHelpfulnessRequest {
  ratingId: string;
  helpful: boolean;
}

export interface GetRatingsRequest {
  ratingObjectId?: string;
  userId?: string;
  status?: 'active' | 'hidden' | 'deleted';
  minRating?: number;
  maxRating?: number;
  verified?: boolean;
  sortBy?: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating' | 'most_helpful';
  page?: number;
  limit?: number;
}

export interface GetRatingsResponse {
  ratings: RatingWithUser[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Report API Types
export interface CreateReportRequest {
  type: ReportType;
  description: string;
  evidence?: string[];
  entityType: 'rating' | 'rating_object' | 'user';
  entityId: string;
}

export interface UpdateReportRequest {
  status?: ReportStatus;
  resolution?: string;
  actionTaken?: string;
}

export interface GetReportsRequest {
  reporterId?: string;
  moderatorId?: string;
  type?: ReportType;
  status?: ReportStatus;
  entityType?: 'rating' | 'rating_object' | 'user';
  entityId?: string;
  page?: number;
  limit?: number;
}

export interface GetReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Common Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// File Upload Types
export interface UploadImageRequest {
  file: File;
  type: 'profile_picture' | 'rating_image' | 'rating_object_image' | 'report_evidence';
}

export interface UploadImageResponse {
  success: boolean;
  url: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'new_rating' | 'rating_update' | 'new_comment' | 'report_update' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// Error Types
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT'
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}
