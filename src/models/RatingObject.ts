import { User } from './User';
import { Rating } from './Rating';
import { Report } from './Report';

export enum RatingObjectType {
  PRODUCT = 'product',
  SERVICE = 'service',
  BUSINESS = 'business',
  PLACE = 'place',
  MEDIA = 'media',
  EVENT = 'event',
  OTHER = 'other'
}

export enum RatingObjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export interface RatingObject {
  id: string;
  name: string;
  description?: string;
  type: RatingObjectType;
  category: string;
  tags: string[];
  images: string[];
  status: RatingObjectStatus;
  
  // Rating statistics
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  
  // Additional fields based on type
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
  
  // Metadata
  verified: boolean;
  featured: boolean;
  
  // Relations
  creatorId: string;
  creator?: User;
  ratings?: Rating[];
  reports?: Report[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingObjectSearchResult {
  id: string;
  name: string;
  type: RatingObjectType;
  category: string;
  images: string[];
  averageRating: number;
  totalRatings: number;
  tags: string[];
  verified: boolean;
  address?: string;
}
