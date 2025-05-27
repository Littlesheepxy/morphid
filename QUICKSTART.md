# 🚀 FlowID 快速开始指南

## 📋 前置要求

在开始之前，请确保您的开发环境已安装：

- **Node.js** (v18.17+)
- **npm** 或 **yarn**
- **Git**

## ⚡ 一键启动

### 1. 运行初始化脚本

```bash
# 确保在flowid项目根目录
./setup.sh
```

这个脚本会自动：
- 初始化Next.js项目
- 安装所有必需依赖
- 创建项目目录结构
- 设置开发工具配置
- 创建基础类型定义

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local
```

然后编辑 `.env.local` 文件，填入您的API密钥：

```env
# Clerk Authentication (https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Supabase (https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Models
ANTHROPIC_API_KEY=sk-ant-your_key_here
OPENAI_API_KEY=sk-your_key_here
GOOGLE_AI_API_KEY=your_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 设置数据库

在Supabase控制台中运行以下SQL脚本：

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  default_model TEXT DEFAULT 'claude',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 页面表
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  theme TEXT DEFAULT 'zen',
  layout TEXT DEFAULT 'grid',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'link-only')),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- 页面模块表
CREATE TABLE page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_pages_user_id ON pages(user_id);
CREATE INDEX idx_pages_visibility ON pages(visibility);
CREATE INDEX idx_page_blocks_page_id ON page_blocks(page_id);
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看您的应用！

## 🔧 服务配置指南

### Clerk 认证设置

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 创建新应用
3. 在 **API Keys** 中获取密钥
4. 在 **OAuth** 中启用 GitHub 和 Google 登录
5. 设置重定向URL：
   - Sign-in: `http://localhost:3000/sign-in`
   - Sign-up: `http://localhost:3000/sign-up`
   - After sign-in: `http://localhost:3000/dashboard`

### Supabase 数据库设置

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 在 **Settings > API** 中获取URL和密钥
4. 在 **SQL Editor** 中运行上面的数据库脚本
5. 在 **Authentication > Settings** 中配置：
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`

### AI 模型 API 设置

#### Anthropic Claude
1. 访问 [Anthropic Console](https://console.anthropic.com)
2. 创建API密钥
3. 选择合适的使用计划

#### OpenAI
1. 访问 [OpenAI Platform](https://platform.openai.com)
2. 创建API密钥
3. 设置使用限制

#### Google AI
1. 访问 [Google AI Studio](https://aistudio.google.com)
2. 创建API密钥
3. 启用Gemini API

## 📁 项目结构说明

```
flowid/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   ├── (dashboard)/       # 用户仪表板
│   ├── (public)/          # 公开页面
│   └── api/               # API路由
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   ├── blocks/           # 页面模块组件
│   ├── editor/           # 编辑器组件
│   └── layout/           # 布局组件
├── lib/                  # 工具库
│   ├── ai/              # AI模型集成
│   ├── supabase.ts      # 数据库客户端
│   └── utils.ts         # 工具函数
├── types/               # TypeScript类型定义
└── hooks/               # 自定义React Hooks
```

## 🎯 开发流程

### Phase 1: 基础功能 (当前)
1. ✅ 项目初始化完成
2. 🔄 实现用户认证
3. 🔄 创建基础页面结构
4. 🔄 集成AI模型

### 下一步开发任务
1. 创建登录/注册页面
2. 实现多阶段输入表单
3. 集成Claude API生成页面
4. 创建页面编辑器

## 🐛 常见问题

### Q: 安装依赖时出现错误
**A:** 确保Node.js版本 >= 18.17，清除npm缓存：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Q: Clerk认证不工作
**A:** 检查环境变量是否正确设置，确保Clerk应用配置正确的重定向URL。

### Q: Supabase连接失败
**A:** 验证Supabase URL和密钥，确保数据库表已创建。

### Q: AI API调用失败
**A:** 检查API密钥是否有效，确认账户有足够的使用额度。

## 📚 学习资源

- [Next.js 文档](https://nextjs.org/docs)
- [Clerk 文档](https://clerk.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Shadcn/ui 组件](https://ui.shadcn.com)

## 🤝 获取帮助

如果遇到问题：
1. 查看 `DEVELOPMENT.md` 详细开发计划
2. 检查 `README.md` 产品文档
3. 查看项目Issues
4. 联系开发团队

---

**准备好开始构建您的AI驱动身份平台了吗？** 🚀

运行 `./setup.sh` 开始您的FlowID开发之旅！ 