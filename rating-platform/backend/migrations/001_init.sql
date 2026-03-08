-- 创建数据库
CREATE DATABASE rating_platform;

-- 连接数据库
\c rating_platform;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  reputation INTEGER DEFAULT 0 CHECK (reputation >= 0),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 评分对象表
CREATE TABLE rating_objects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 255),
  description TEXT CHECK (LENGTH(description) <= 2000),
  category VARCHAR(100),
  tags TEXT[],
  allow_comments BOOLEAN DEFAULT true,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 评分表
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  object_id INTEGER REFERENCES rating_objects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  comment TEXT CHECK (LENGTH(comment) <= 1000),
  anonymous BOOLEAN DEFAULT false,
  source_ip_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引和约束
CREATE UNIQUE INDEX idx_user_object_rating ON ratings(object_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_anonymous_object_rating ON ratings(object_id, source_ip_hash) WHERE user_id IS NULL;
CREATE INDEX idx_ratings_object_id ON ratings(object_id);
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);

-- 举报表
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) CHECK (target_type IN ('rating', 'comment', 'object')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (LENGTH(reason) >= 10 AND LENGTH(reason) <= 500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rating_objects_updated_at BEFORE UPDATE ON rating_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();