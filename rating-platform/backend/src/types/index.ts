export interface User {
  id: number;
  email: string;
  username?: string;
  password_hash: string;
  reputation: number;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface RatingObject {
  id: number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  allow_comments: boolean;
  visibility: 'public' | 'private';
  creator_id: number;
  status: 'active' | 'blocked';
  created_at: Date;
  updated_at: Date;
}

export interface Rating {
  id: number;
  object_id: number;
  user_id?: number;
  score: number;
  comment?: string;
  anonymous: boolean;
  source_ip_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: number;
  reporter_id: number;
  target_type: 'rating' | 'comment' | 'object';
  target_id: number;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export interface RatingInput {
  objectId: number;
  score: number;
  comment?: string;
  anonymous?: boolean;
  ipHash?: string;
}

export interface ObjectStats {
  vote_count: number;
  avg_score: number | null;
  distribution: {
    [key: number]: number;
  };
}