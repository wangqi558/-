-- Admin actions log table
CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('block_object', 'delete_rating', 'suspend_user', 'resolve_report', 'dismiss_report')),
  target_id INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User suspensions table
CREATE TABLE user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  suspended_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  suspended_until TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add suspended_until field to users table
ALTER TABLE users ADD COLUMN suspended_until TIMESTAMP;

-- Create indexes for performance
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_suspended_until ON user_suspensions(suspended_until);
CREATE INDEX idx_users_suspended_until ON users(suspended_until);

-- Create function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_id_param INTEGER)
RETURNS TABLE(suspended BOOLEAN, expires_at TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN u.suspended_until IS NULL THEN FALSE
      WHEN u.suspended_until > NOW() THEN TRUE
      ELSE FALSE
    END,
    u.suspended_until
  FROM users u
  WHERE u.id = user_id_param;
END;
$$ LANGUAGE plpgsql;
