export interface Report {
  id: number;
  reporter_id: number | null;
  target_type: 'rating' | 'comment' | 'object';
  target_id: number;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: Date;
  reporter_username?: string;
  reporter_email?: string;
}

export interface CreateReportDTO {
  target_type: 'rating' | 'comment' | 'object';
  target_id: number;
  reason: string;
}

export interface ReportFilters {
  status?: 'pending' | 'resolved' | 'dismissed';
  target_type?: 'rating' | 'comment' | 'object';
  reporter_id?: number;
  page?: number;
  limit?: number;
}

export interface ReportStatistics {
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
  byType: {
    rating: number;
    comment: number;
    object: number;
  };
}

export interface AdminAction {
  type: 'block_object' | 'delete_rating' | 'suspend_user' | 'dismiss_report';
  target_id: number;
  reason?: string;
  duration?: number; // For suspension duration in days
}
