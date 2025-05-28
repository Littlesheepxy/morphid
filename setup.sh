#!/bin/bash

echo "🧭 MorphID 项目初始化脚本"
echo "================================"

# 检查是否已经在MorphID目录中
if [ "$(basename "$PWD")" = "MorphID" ]; then
    echo "✅ 已在MorphID目录中"
else
    echo "❌ 请在MorphID项目根目录中运行此脚本"
    exit 1
fi

# 1. 初始化Next.js项目（如果package.json不存在）
if [ ! -f "package.json" ]; then
    echo "📦 初始化Next.js项目..."
    npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
fi

# 2. 安装核心依赖
echo "📦 安装核心依赖..."
npm install @clerk/nextjs @supabase/supabase-js zustand

# 3. 安装UI组件依赖
echo "🎨 安装UI组件..."
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-button
npm install class-variance-authority clsx tailwind-merge lucide-react

# 4. 安装表单和验证
echo "📝 安装表单组件..."
npm install @hookform/resolvers zod react-hook-form

# 5. 安装AI模型SDK
echo "🤖 安装AI模型SDK..."
npm install @anthropic-ai/sdk openai @google/generative-ai

# 6. 安装开发工具
echo "🛠 安装开发工具..."
npm install -D @types/node prettier eslint-config-prettier husky lint-staged

# 7. 创建目录结构
echo "📁 创建项目结构..."
mkdir -p app/\(auth\)/sign-in
mkdir -p app/\(auth\)/sign-up
mkdir -p app/\(dashboard\)/dashboard
mkdir -p app/\(dashboard\)/create
mkdir -p app/\(dashboard\)/pages
mkdir -p app/\(public\)/explore
mkdir -p app/\(public\)/\[username\]
mkdir -p app/api/generate
mkdir -p app/api/pages
mkdir -p app/api/users
mkdir -p components/ui
mkdir -p components/blocks
mkdir -p components/editor
mkdir -p components/layout
mkdir -p components/create
mkdir -p lib/ai
mkdir -p types
mkdir -p hooks

# 8. 创建环境变量模板
echo "🔐 创建环境变量模板..."
cat > .env.example << 'EOF'
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Models
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# 9. 创建基础配置文件
echo "⚙️ 创建配置文件..."

# Prettier配置
cat > .prettierrc << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
EOF

# ESLint配置更新
cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "prefer-const": "error",
    "no-unused-vars": "warn"
  }
}
EOF

# 10. 初始化Shadcn/ui
echo "🎨 初始化Shadcn/ui..."
npx shadcn-ui@latest init -d

# 11. 安装常用Shadcn组件
echo "📦 安装Shadcn组件..."
npx shadcn-ui@latest add button card input label textarea select tabs dialog toast avatar

# 12. 创建基础类型定义
echo "📝 创建类型定义..."
cat > types/page.ts << 'EOF'
export interface FlowPage {
  id: string
  title: string
  slug: string
  visibility: 'public' | 'private' | 'link-only'
  theme: 'zen' | 'creative' | 'devgrid' | 'minimal'
  layout: 'grid' | 'hero' | 'twocol' | 'stack'
  blocks: PageBlock[]
  userId: string
  createdAt: string
  updatedAt: string
}

export type PageBlock = 
  | HeroBlock 
  | ProjectBlock 
  | SkillBlock 
  | LinkBlock 
  | RecruitBlock 
  | CustomBlock

export interface HeroBlock {
  id: string
  type: 'hero'
  data: {
    name: string
    title: string
    description: string
    avatar?: string
    background?: string
  }
}

export interface ProjectBlock {
  id: string
  type: 'project'
  data: {
    title: string
    projects: Array<{
      name: string
      description: string
      url?: string
      image?: string
      tags: string[]
    }>
  }
}

export interface SkillBlock {
  id: string
  type: 'skill'
  data: {
    title: string
    skills: Array<{
      name: string
      level?: number
      category?: string
    }>
  }
}

export interface LinkBlock {
  id: string
  type: 'link'
  data: {
    title: string
    links: Array<{
      name: string
      url: string
      icon?: string
      description?: string
    }>
  }
}

export interface RecruitBlock {
  id: string
  type: 'recruit'
  data: {
    title: string
    isOpen: boolean
    description: string
    requirements?: string[]
    contact?: string
  }
}

export interface CustomBlock {
  id: string
  type: 'custom'
  data: {
    title: string
    content: string
    html?: string
  }
}
EOF

# 13. 创建用户类型
cat > types/user.ts << 'EOF'
export interface User {
  id: string
  clerkId: string
  email: string
  username?: string
  plan: 'free' | 'pro'
  defaultModel: string
  createdAt: string
}

export interface CreateUserData {
  clerkId: string
  email: string
  username?: string
}
EOF

# 14. 创建工具函数
cat > lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}
EOF

# 15. 创建Git hooks
echo "🔧 设置Git hooks..."
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# 16. 创建lint-staged配置
cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
EOF

echo ""
echo "✅ MorphID 项目初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 复制 .env.example 到 .env.local 并填入你的API密钥"
echo "2. 设置Supabase数据库（运行DEVELOPMENT.md中的SQL脚本）"
echo "3. 配置Clerk认证"
echo "4. 运行 npm run dev 启动开发服务器"
echo ""
echo "📚 查看详细开发计划: DEVELOPMENT.md"
echo "📖 查看产品文档: README.md"
echo ""
echo "🚀 开始构建你的AI驱动身份平台吧！" 