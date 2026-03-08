import { User, PublicUser } from './User';
import { RatingObject } from './RatingObject';
import { Report } from './Report';

export enum RatingValue {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5
}

export enum RatingStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted'
}

export interface Rating {
  id: string;
  value: RatingValue;
  title?: string;
  comment?: string;
  images: string[];
  status: RatingStatus;
  
  // Additional rating criteria (optional)
  criteria?: {
    [key: string]: number; // Custom criteria with 1-5 values
  };
  
  // Helpful votes
  helpfulVotes: number;
  totalVotes: number;
  
  // Verification
  verified: boolean;
  verifiedPurchase?: boolean;
  
  // Relations
  userId: string;
  user?: User;
  ratingObjectId: string;
  ratingObject?: RatingObject;
  reports?: Report[];
  
  // User interaction
  userVotedHelpful?: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingWithUser extends Rating {
  user: PublicUser;
}

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
