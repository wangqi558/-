#!/usr/bin/env node

/**
 * 评分平台快速启动脚本
 * 无需完整npm安装即可体验核心功能
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 简单的路由处理
const routes = {
  '/': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head><title>评分平台 API</title></head>
        <body>
          <h1>🎉 评分平台已启动！</h1>
          <p>这是一个演示版本，展示了评分平台的基本结构。</p>
          <h2>可用端点：</h2>
          <ul>
            <li><a href="/health">GET /health</a> - 健康检查</li>
            <li><a href="/api">GET /api</a> - API信息</li>
            <li><a href="/api-docs">GET /api-docs</a> - API文档</li>
          </ul>
          <p>📍 完整版本需要安装依赖：npm install</p>
          <p>📚 查看 <a href="/guide">启动指南</a></p>
        </body>
      </html>
    `);
  },

  '/health': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: 'demo'
    }));
  },

  '/api': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: '评分平台 API',
      version: '1.0.0',
      description: '公开评分平台MVP',
      endpoints: [
        'POST /api/auth/signup - 用户注册',
        'POST /api/auth/login - 用户登录',
        'POST /api/rating-objects - 创建评分对象',
        'GET /api/rating-objects/:id - 获取对象详情',
        'POST /api/ratings - 提交评分',
        'GET /api/ratings/statistics/:objectId - 获取统计信息'
      ]
    }));
  },

  '/api-docs': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head><title>API文档</title></head>
        <body>
          <h1>📚 API文档</h1>
          <p>完整API文档需要启动完整服务。</p>
          <h2>快速测试API：</h2>
          <pre>
# 健康检查
curl http://localhost:3000/health

# 注册用户（完整版）
curl -X POST http://localhost:3000/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"password123","username":"testuser"}'

# 创建评分对象（完整版）
curl -X POST http://localhost:3000/api/rating-objects \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{"title":"测试产品","description":"这是一个测试产品","category":"电子产品","tags":["测试","演示"]}'
          </pre>
        </body>
      </html>
    `);
  },

  '/guide': (req, res) => {
    const guidePath = path.join(__dirname, 'START_GUIDE.md');
    if (fs.existsSync(guidePath)) {
      const content = fs.readFileSync(guidePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <h1>🚀 启动指南</h1>
            <h2>快速启动完整版本：</h2>
            <ol>
              <li>安装依赖：npm install</li>
              <li>配置环境：cp .env.example .env</li>
              <li>启动数据库：docker-compose up -d postgres redis</li>
              <li>运行迁移：npm run migrate:up</li>
              <li>启动服务：npm run dev</li>
            </ol>
          </body>
        </html>
      `);
    }
  }
};

// 创建服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // 处理路由
  if (routes[pathname]) {
    routes[pathname](req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - 页面未找到');
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n🎉 评分平台快速启动成功！');
  console.log(`📍 访问地址：http://localhost:${PORT}`);
  console.log(`🔗 端点：`);
  console.log(`   • http://localhost:${PORT}/health - 健康检查`);
  console.log(`   • http://localhost:${PORT}/api - API信息`);
  console.log(`   • http://localhost:${PORT}/api-docs - API文档`);
  console.log(`   • http://localhost:${PORT}/guide - 启动指南`);
  console.log('\n💡 提示：这是演示版本，完整功能需要安装依赖');
  console.log('   运行：npm install && npm run dev\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});