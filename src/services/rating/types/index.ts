export interface Rating {
  id: string;
  userId?: string;
  ipHash: string;
  targetId: string;
  targetType: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingStatistics {
  targetId: string;
  targetType: string;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    [key: number]: number; // rating value -> count
  };
  lastCalculated: Date;
}

export interface SubmitRatingInput {
  userId?: string;
  targetId: string;
  targetType: string;
  rating: number;
  comment?: string;
  ipAddress: string;
}

export interface UpdateRatingStatsInput {
  targetId: string;
  targetType: string;
}

export interface RatingFilter {
  targetId?: string;
  targetType?: string;
  userId?: string;
  ipHash?: string;
  rating?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface GetRatingStatsInput {
  targetId: string;
  targetType: string;
  useCache?: boolean;
}

export interface RatingCacheKey {
  targetId: string;
  targetType: string;
}
