export interface RatingObject {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  creatorId?: string;
  status: 'active' | 'inactive' | 'deleted';
  visibility: 'public' | 'private';
  allowAnonymousRatings: boolean;
  allowComments: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingObjectWithStats extends RatingObject {
  statistics: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
      [key: number]: number;
    };
  };
}

export interface CreateRatingObjectInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  creatorId?: string;
  visibility?: 'public' | 'private';
  allowAnonymousRatings?: boolean;
  allowComments?: boolean;
}

export interface UpdateRatingObjectInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: 'public' | 'private';
  allowAnonymousRatings?: boolean;
  allowComments?: boolean;
  status?: 'active' | 'inactive' | 'deleted';
}

export interface RatingObjectFilter {
  category?: string;
  tags?: string[];
  creatorId?: string;
  status?: 'active' | 'inactive' | 'deleted';
  visibility?: 'public' | 'private';
  search?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface RatingObjectSearchOptions {
  filter: RatingObjectFilter;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'averageRating' | 'totalRatings';
  sortOrder?: 'asc' | 'desc';
}

export interface RatingObjectListResponse {
  data: RatingObjectWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
