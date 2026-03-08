import { RatingObject } from './RatingObject';
import { Rating } from './Rating';
import { Report } from './Report';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  profilePicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  reputation: number;
  totalRatings: number;
  totalComments: number;
  verified: boolean;
  emailVerified: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  ratings?: Rating[];
  ratingObjects?: RatingObject[];
  reports?: Report[];
}

export interface PublicUser {
  id: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  reputation: number;
  totalRatings: number;
  totalComments: number;
  verified: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}
