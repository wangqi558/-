# 评分平台启动指南

## 🚀 快速启动

### 方法1：使用Docker（推荐）

```bash
# 1. 进入项目目录
cd rating-platform

# 2. 启动所有服务（PostgreSQL + Redis + Backend）
docker-compose up -d

# 3. 查看日志
docker-compose logs -f backend

# 4. 访问API
curl http://localhost:3000/health
```

### 方法2：本地开发环境

#### 前提条件
- Node.js v16+
- PostgreSQL v13+
- Redis v6+

#### 步骤

```bash
# 1. 进入后端目录
cd rating-platform/backend

# 2. 安装依赖（如果遇到权限问题，请看下方解决方案）
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库和Redis连接

# 4. 运行数据库迁移
npm run migrate:up

# 5. 启动开发服务器
npm run dev

# 6. 访问API
curl http://localhost:3000/health
```

## 🔧 依赖安装问题解决方案

如果遇到npm安装权限问题，尝试以下解决方案：

### 方案1：使用npx（无需安装）
```bash
# 直接运行已编译的代码
cd src
npx ts-node server.ts
```

### 方案2：手动安装核心依赖
```bash
# 安装核心依赖（跳过可选依赖）
npm install --only=prod --no-optional

# 或手动安装关键包
npm install express pg redis jsonwebtoken bcrypt dotenv
npm install -D typescript @types/node ts-node nodemon
```

### 方案3：使用yarn替代npm
```bash
# 安装yarn
npm install -g yarn

# 使用yarn安装依赖
yarn install
```

## 📋 环境配置

编辑 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/rating_platform

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# 端口配置
PORT=3000
NODE_ENV=development
```

## 🗄️ 数据库初始化

```bash
# 创建数据库（PostgreSQL）
createdb rating_platform

# 运行迁移
npm run migrate:up

# 插入测试数据（可选）
npm run seed
```

## 🔍 验证服务

```bash
# 健康检查
curl http://localhost:3000/health

# 查看API文档
open http://localhost:3000/api-docs

# 注册测试用户
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser"}'
```

## 🐳 Docker Compose 服务

启动后包含以下服务：
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **API文档**: http://localhost:3000/api-docs

## 📝 常用命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start

# 运行测试
npm test
npm run test:coverage

# 数据库操作
npm run migrate:up
npm run migrate:down
npm run migrate:rollback

# 代码检查
npm run lint
npm run lint:fix
npm run format
```

## 🚨 故障排除

### 端口被占用
```bash
# 查看端口使用情况
lsof -i :3000

# 终止占用进程
kill -9 <PID>
```

### 数据库连接失败
```bash
# 检查PostgreSQL状态
pg_isready -h localhost -p 5432

# 检查连接字符串
psql $DATABASE_URL -c "SELECT 1;"
```

### Redis连接失败
```bash
# 检查Redis状态
redis-cli ping
```

## 📚 更多信息

- [API文档](backend/docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [测试指南](tests/README.md)
- [架构说明](docs/ARCHITECTURE.md)

## 💡 提示

1. **开发模式**使用 `npm run dev` 支持热重载
2. **API测试**可使用Postman或curl，参考 `examples/` 目录
3. **数据库管理**推荐使用pgAdmin或DBeaver
4. **Redis查看**可使用Redis Insight或redis-cli

开始享受你的评分平台吧！🎉