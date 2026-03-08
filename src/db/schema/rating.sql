-- Rating table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of IP + salt
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite index for duplicate checking
    CONSTRAINT unique_user_target UNIQUE (user_id, target_id, target_type),
    
    -- Index for performance
    INDEX idx_ratings_target (target_id, target_type),
    INDEX idx_ratings_user (user_id),
    INDEX idx_ratings_ip_hash (ip_hash),
    INDEX idx_ratings_created_at (created_at)
);

-- Rating statistics table
CREATE TABLE rating_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_ratings INTEGER NOT NULL DEFAULT 0,
    rating_distribution JSONB NOT NULL DEFAULT '{}',
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one stats record per target
    CONSTRAINT unique_target_stats UNIQUE (target_id, target_type),
    
    -- Index for performance
    INDEX idx_stats_target (target_id, target_type),
    INDEX idx_stats_average_rating (average_rating),
    INDEX idx_stats_total_ratings (total_ratings)
);

-- Create updated_at trigger for ratings table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ratings_updated_at 
    BEFORE UPDATE ON ratings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rating_statistics_updated_at 
    BEFORE UPDATE ON rating_statistics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_ratings_composite ON ratings(target_id, target_type, created_at DESC);
CREATE INDEX idx_ratings_rating ON ratings(rating);

-- Create partial index for anonymous ratings
CREATE INDEX idx_ratings_anonymous ON ratings(ip_hash, target_id, target_type) WHERE user_id IS NULL;
