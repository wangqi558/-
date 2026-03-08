import { User } from './User';
import { Rating } from './Rating';
import { RatingObject } from './RatingObject';

export enum ReportType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FAKE_RATING = 'fake_rating',
  HARASSMENT = 'harassment',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  PRIVACY_VIOLATION = 'privacy_violation',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum ReportEntityType {
  RATING = 'rating',
  RATING_OBJECT = 'rating_object',
  USER = 'user'
}

export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  description: string;
  evidence?: string[]; // URLs to screenshots or other evidence
  
  // Entity being reported
  entityType: ReportEntityType;
  entityId: string;
  
  // Relations
  reporterId: string;
  reporter?: User;
  moderatorId?: string;
  moderator?: User;
  
  // Additional context
  rating?: Rating;
  ratingObject?: RatingObject;
  reportedUser?: User;
  
  // Moderation
  resolution?: string;
  actionTaken?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}
