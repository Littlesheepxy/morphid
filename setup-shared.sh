#!/bin/bash

# MorphID 共享数据库配置脚本
# 用于快速配置 MorphID 使用父项目的 Clerk 和 Supabase

set -e

echo "🚀 MorphID 共享数据库配置脚本"
echo "=================================="

# 检查必要的文件
if [ ! -f "env.shared.example" ]; then
    echo "❌ 错误: env.shared.example 文件不存在"
    exit 1
fi

if [ ! -f "supabase-migration-shared.sql" ]; then
    echo "❌ 错误: supabase-migration-shared.sql 文件不存在"
    exit 1
fi

# 1. 复制环境变量文件
echo "📋 1. 配置环境变量..."
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local 已存在，是否覆盖? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cp env.shared.example .env.local
        echo "✅ 已覆盖 .env.local"
    else
        echo "⏭️  跳过环境变量配置"
    fi
else
    cp env.shared.example .env.local
    echo "✅ 已创建 .env.local"
fi

# 2. 检查 Node.js 版本
echo ""
echo "🔍 2. 检查 Node.js 版本..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "⚠️  警告: 建议使用 Node.js 18 或更高版本"
    echo "   当前版本: $(node -v)"
else
    echo "✅ Node.js 版本检查通过: $(node -v)"
fi

# 3. 安装依赖
echo ""
echo "📦 3. 安装项目依赖..."
if command -v pnpm &> /dev/null; then
    echo "使用 pnpm 安装依赖..."
    pnpm install
elif command -v yarn &> /dev/null; then
    echo "使用 yarn 安装依赖..."
    yarn install
else
    echo "使用 npm 安装依赖..."
    npm install
fi
echo "✅ 依赖安装完成"

# 4. 显示数据库迁移说明
echo ""
echo "🗃️  4. 数据库迁移说明"
echo "=================================="
echo "请按照以下步骤执行数据库迁移："
echo ""
echo "1. 打开 Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. 进入您的项目:"
echo "   https://chvjjnnwmqoidtehifvr.supabase.co"
echo ""
echo "3. 进入 'SQL Editor'"
echo ""
echo "4. 创建新查询并复制以下文件内容:"
echo "   📄 supabase-migration-shared.sql"
echo ""
echo "5. 执行 SQL 脚本"
echo ""
echo "6. 验证迁移结果:"
echo "   - ✅ users 表新增 projects, plan, default_model 字段"
echo "   - ✅ 创建 5 个 morphid_ 前缀的表"
echo "   - ✅ 所有现有用户获得 MorphID 访问权限"
echo "   - ✅ 创建 3 个示例模板"

# 5. 显示下一步操作
echo ""
echo "🎯 5. 下一步操作"
echo "=================================="
echo "数据库迁移完成后，运行以下命令启动开发服务器:"
echo ""
echo "   npm run dev"
echo ""
echo "然后访问: http://localhost:3000"

# 6. 显示配置文档链接
echo ""
echo "📚 6. 配置文档"
echo "=================================="
echo "如需详细配置说明，请查看:"
echo "📖 SHARED_DATABASE_SETUP.md - 共享数据库配置指南"
echo "🔗 SHARED_AUTH_SETUP.md - 跨项目认证配置"
echo "🚀 QUICKSTART.md - 快速开始指南"

# 7. 检查环境变量配置
echo ""
echo "🔧 7. 环境变量检查"
echo "=================================="
echo "请确认 .env.local 中的以下配置:"
echo ""
echo "Clerk 配置:"
echo "✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
echo "✓ CLERK_SECRET_KEY"
echo ""
echo "Supabase 配置:"
echo "✓ NEXT_PUBLIC_SUPABASE_URL"
echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "✓ SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "AI 模型配置 (可选):"
echo "○ OPENAI_API_KEY"
echo "○ ANTHROPIC_API_KEY"
echo "○ GOOGLE_AI_API_KEY"

echo ""
echo "🎉 配置脚本执行完成！"
echo "请按照上述说明完成数据库迁移，然后启动开发服务器。"
echo ""
echo "如有问题，请查看配置文档或提交 Issue。" 