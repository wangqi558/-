#!/bin/bash

# 评分平台导航脚本

echo "🎯 评分平台导航菜单"
echo "=================="
echo ""
echo "当前目录: $(pwd)"
echo ""
echo "请选择操作："
echo "1) 进入backend目录"
echo "2) 启动演示程序"
echo "3) 启动Docker完整环境"
echo "4) 检查服务状态"
echo "5) 查看API文档"
echo "6) 退出"
echo ""

read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo "📁 进入backend目录..."
        cd /Users/wangqiran/Desktop/评分系统/rating-platform/backend
        echo "当前目录: $(pwd)"
        echo "可以运行: npm install 或 docker-compose up -d"
        ;;
    2)
        echo "🚀 启动演示程序..."
        cd /Users/wangqiran/Desktop/评分系统/rating-platform
        node quick-start.js
        ;;
    3)
        echo "🐳 启动Docker环境..."
        cd /Users/wangqiran/Desktop/评分系统/rating-platform/backend
        docker-compose up -d
        echo "等待30秒后访问: http://localhost:3000"
        ;;
    4)
        echo "🔍 检查服务状态..."
        curl -s http://localhost:3000/health || echo "服务未运行"
        ;;
    5)
        echo "📚 打开API文档..."
        open http://localhost:3000/api-docs
        ;;
    6)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        ;;
esac

echo ""
echo "按任意键继续..."
read -n 1 -s