-- Password reset tokens table
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- User profile extensions
ALTER TABLE users 
ADD COLUMN bio TEXT CHECK (LENGTH(bio) <= 500),
ADD COLUMN avatar VARCHAR(500),
ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- User suspensions table
CREATE TABLE user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (LENGTH(reason) >= 10 AND LENGTH(reason) <= 500),
  duration VARCHAR(20) NOT NULL CHECK (duration IN ('1d', '3d', '7d', '30d', 'permanent')),
  suspended_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  suspended_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_expires_at ON user_suspensions(expires_at);

-- Reputation logs table
CREATE TABLE reputation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('increase', 'decrease')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL CHECK (LENGTH(reason) >= 10 AND LENGTH(reason) <= 500),
  admin_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_logs_user_id ON reputation_logs(user_id);
CREATE INDEX idx_reputation_logs_created_at ON reputation_logs(created_at DESC);

-- Update trigger for users table to include new fields
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
