-- 插入测试管理员用户（密码: admin123）
INSERT INTO users (email, username, password_hash, role, reputation)
VALUES (
  'admin@example.com',
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'admin123'
  'admin',
  100
);

-- 插入测试普通用户（密码: password）
INSERT INTO users (email, username, password_hash, reputation)
VALUES
  ('user1@example.com', 'user1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 50),
  ('user2@example.com', 'user2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 30);

-- 插入测试评分对象
INSERT INTO rating_objects (title, description, category, tags, creator_id)
VALUES
  ('iPhone 15 Pro', 'Apple\'s latest flagship smartphone', 'Technology', '{"smartphone", "apple", "mobile"}', 1),
  ('Tesla Model 3', 'Electric sedan from Tesla', 'Automotive', '{"electric", "tesla", "car"}', 1),
  ('MacBook Pro M3', 'Apple\'s professional laptop', 'Technology', '{"laptop", "apple", "computer"}', 2);

-- 插入测试评分
INSERT INTO ratings (object_id, user_id, score, comment, anonymous)
VALUES
  (1, 2, 5, 'Excellent phone, great camera quality!', false),
  (1, 3, 4, 'Good phone but battery could be better', false),
  (2, 2, 5, 'Amazing car, love the autopilot feature', false),
  (2, 3, 4, 'Great range and performance', false),
  (3, 2, 5, 'Perfect for development work', false);