# 🧭 MorphID v0.1 - AI驱动的身份平台

> **版本**: v0.1  
> **类型**: MVP / 创始内测计划版  
> **目标**: 创建一个 AI 驱动的身份平台，用户通过多轮输入构建个性化主页，支持风格、结构、受众控制

## 🎯 产品定位

MorphID 是一个基于AI的职业身份平台，通过多轮智能对话和多数据源集成，为用户生成个性化的职业主页。

### 核心特色
- **三Agent协作系统**：数据收集 → 分析总结 → 页面创建
- **多数据源集成**：对话、文档、社交媒体等
- **智能页面生成**：基于用户画像的个性化设计
- **实时预览系统**：所见即所得的编辑体验

### 适用人群
- AI 工程师 / AI产品经理
- 自由职业者 / 应届生 / 创作者
- 交友 / 社媒达人 / 销售
- 需要个性化展示履历、照片、作品、项目、社交资料等的用户

## 🚀 快速开始

### 前置要求
- Node.js 18+
- [Clerk](https://clerk.com) 账户（用于认证）
- [Supabase](https://supabase.com) 项目（用于数据库）

### 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/your-username/morphid.git
cd morphid

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp env.example .env.local
# 编辑 .env.local 填入您的配置

# 4. 设置数据库
# 在 Supabase SQL Editor 中执行 supabase-migration.sql

# 5. 启动开发服务器
npm run dev
```

### 🔗 共享数据库部署（推荐）

MorphID 支持与父项目共享 Clerk 认证和 Supabase 数据库，实现统一的用户管理：

#### 架构优势
- ✅ **统一认证**：用户只需一次登录，可访问所有项目
- ✅ **数据一致性**：用户信息实时同步，无需重复维护
- ✅ **权限控制**：通过 `projects` 字段灵活控制项目访问权限
- ✅ **成本优化**：共享基础设施，降低运营成本

#### 快速配置
```bash
# 1. 使用共享配置模板
cp env.shared.example .env.local

# 2. 执行数据库迁移（添加 MorphID 表）
# 在 Supabase Dashboard 执行 supabase-migration-shared.sql

# 3. 启动项目
npm run dev
```

#### 数据库结构
```sql
-- 扩展现有用户表
users (
  id TEXT PRIMARY KEY,              -- Clerk用户ID
  projects TEXT[] DEFAULT '{}',     -- 项目访问权限 ['morphid', 'parent-project']
  plan TEXT DEFAULT 'free',         -- 用户计划
  default_model TEXT DEFAULT 'gpt-4o' -- 默认AI模型
)

-- MorphID 专用表（带前缀避免冲突）
morphid_pages, morphid_page_blocks, morphid_templates, 
morphid_page_analytics, morphid_user_assets
```

### 🔧 其他部署方案

#### 方案一：共享认证 + 独立数据库
```env
# 使用与父项目相同的 Clerk 配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_same_as_parent
CLERK_SECRET_KEY=sk_test_same_as_parent

# 使用 MorphID 专用的 Supabase 项目
NEXT_PUBLIC_SUPABASE_URL=https://morphid-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_morphid_key
```

#### 方案二：完全独立部署
```env
# 使用独立的 Clerk 和 Supabase 配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_morphid_only
NEXT_PUBLIC_SUPABASE_URL=https://morphid-only.supabase.co
```

### 详细配置指南

- 📖 [共享数据库配置指南](./SHARED_DATABASE_SETUP.md) **（推荐）**
- 📖 [独立部署配置指南](./CLERK_SUPABASE_SETUP.md)
- 🔗 [跨项目认证配置](./SHARED_AUTH_SETUP.md)
- 🚀 [快速开始指南](./QUICKSTART.md)

## 🔑 核心功能（MVP）

| 模块 | 描述 |
|------|------|
| 用户系统 | Clerk 认证，支持邮箱、Google、GitHub 登录 |
| 三Agent协作 | 数据收集Agent → 分析总结Agent → 页面创建Agent |
| 多数据源集成 | 对话输入、文档上传、社交媒体API集成 |
| 多模型接入 | Claude 3.7（默认），可选 OpenAI / Gemini / DeepSeek |
| 智能页面生成 | 基于用户画像自动生成页面结构和内容 |
| 页面管理 | 创建多个页面，自定义标题、风格、slug、可见性 |
| 实时预览 | 所见即所得的编辑体验，支持模块化风格切换 |
| Explore 社区 | 可选公开展示页面至 explore 流 |
| 权限系统 | 页面级可见性控制（公开 / 私密 / 链接可见） |
| 支付通行证（v1.1） | Stripe 支付 Pro 功能，内测用户解锁限制（预留） |

## 👤 用户角色

### 注册用户（免费）
- 默认生成主页，可编辑一个页面
- 使用 Claude 模型生成内容（免费额度限制）

### Pro Pioneer 用户（通行证）
- 无限页面
- 限定风格主题
- Explore 高亮展示

### 访客
- 可访问公开页面或链接权限页面

## 🔄 产品流程（用户视角）

### 1. 数据收集阶段
- **对话收集**: 通过友好对话了解用户背景
- **文档上传**: 支持简历PDF/Word解析
- **社交集成**: LinkedIn、GitHub、Twitter等平台数据

### 2. 分析总结阶段  
- **数据整合**: 多源数据的统一处理
- **画像生成**: 结构化用户职业画像
- **偏好推断**: 基于数据推断设计偏好

### 3. 页面创建阶段
- **智能设计**: 自动选择主题和布局
- **内容生成**: 生成具体页面内容
- **优化建议**: 提供改进建议

### 4. 编辑发布阶段
- **实时预览**: 所见即所得的编辑体验
- **模块调整**: 拖拽排序、显隐控制
- **权限设置**: 设置页面可见性
- **分享发布**: 生成分享链接

## ✨ 页面结构（前端渲染 JSON 结构）

```typescript
interface MorphPage {
  title: string
  slug: string
  visibility: "public" | "private" | "link-only"
  theme: "zen" | "creative" | "devgrid" | "minimal" | "bold"
  layout: "grid" | "hero" | "twocol" | "stack"
  blocks: PageBlock[]
  is_featured: boolean
}

type PageBlock = 
  | HeroBlock 
  | ProjectBlock 
  | SkillBlock 
  | LinkBlock 
  | RecruitBlock 
  | CustomBlock
```

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 14 (App Router)
- **UI库**: shadcn/ui + Tailwind CSS
- **状态管理**: React Hooks + Context
- **类型安全**: TypeScript
- **主题系统**: 支持亮色/暗色模式

### 后端技术栈
- **认证**: Clerk (邮箱、Google、GitHub OAuth)
- **数据库**: Supabase (PostgreSQL)
- **AI集成**: AI API (OpenAI, Claude, Gemini)
- **文件存储**: Supabase Storage

### 核心模块

#### 1. Agent系统 (`/lib/agents/`)
```
agents/
├── data-collection-agent.ts    # 信息收集Agent
├── summary-agent.ts           # 分析总结Agent  
├── page-creation-agent.ts     # 页面创建Agent
└── workflow-manager.ts        # 工作流管理器
```

#### 2. 组件系统 (`/components/`)
```
components/
├── flow-builder.tsx           # 流程构建器
├── page-renderer.tsx          # 页面渲染器
├── chat-interface.tsx         # 聊天界面
├── data-source-integration.tsx # 数据源集成
├── model-selector.tsx         # AI模型选择器
└── theme-toggle.tsx          # 主题切换器
```

#### 3. API路由 (`/app/api/`)
```
api/
├── pages/                     # 页面CRUD操作
├── generate-page/             # AI页面生成
├── intent-recognition/        # 意图识别
├── deploy/                   # 页面部署
└── webhooks/clerk/           # Clerk用户同步
```

## 🗃 数据库设计

### 核心表结构
```sql
-- 用户表（Clerk集成）
users (
  id uuid PRIMARY KEY,
  clerk_id text UNIQUE,        -- Clerk用户ID
  email text,
  username text UNIQUE,
  first_name text,
  last_name text,
  avatar_url text,
  plan text DEFAULT 'free',
  default_model text DEFAULT 'gpt-4o',
  created_at timestamp,
  updated_at timestamp
)

-- 页面表  
pages (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  slug text UNIQUE,
  title text,
  theme text,
  layout text,
  visibility text DEFAULT 'private',
  is_featured boolean DEFAULT false,
  created_at timestamp,
  updated_at timestamp
)

-- 页面模块表
page_blocks (
  id uuid PRIMARY KEY,
  page_id uuid REFERENCES pages(id),
  type text,
  data jsonb,
  position integer,
  is_visible boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
)
```

## 🎨 主题系统

### 支持的主题
- **zen**: 极简禅意风格
- **creative**: 创意炫酷风格  
- **devgrid**: 科技未来风格
- **minimal**: 现代简约风格
- **bold**: 大胆前卫风格

### 布局类型
- **grid**: 网格布局
- **hero**: 英雄布局
- **twocol**: 双列布局
- **stack**: 堆叠布局

## 🧠 多模型代理设计（模型调度层）

`/api/generate` 接口接收结构化用户输入，包含：
- `role`, `purpose`, `style`, `display_priority`
- `model_type`（可选字段）

后端通过 `modelRouter` 分发至：
- Claude 3.7（默认）
- OpenAI GPT-4-turbo
- Gemini 1.5-pro
- DeepSeek-Vision / Chat

## 🚀 部署与上线

| 平台 | 用途 |
|------|------|
| Vercel | Next.js 自动部署 |
| Supabase | Postgres + Storage |
| Clerk | 认证、OAuth、用户管理 |
| Stripe（后期） | 订阅 / 单次支付 |
| Cloudflare（可选） | 缓存 + 子域配置 |

## 📋 完整TODO清单

### 🔥 高优先级 (P0)
- [x] **用户认证系统**
  - [x] Clerk 集成配置
  - [x] 社交登录 (Google, GitHub)
  - [x] 用户数据同步到 Supabase
  
- [x] **页面管理功能**
  - [x] 页面编辑器
  - [ ] 页面删除和恢复
  - [ ] 页面复制功能
  
- [ ] **数据源集成**
  - [ ] 简历文档解析 (PDF/Word)
  - [ ] LinkedIn API集成
  - [ ] GitHub API集成

### 🚀 中优先级 (P1)
- [ ] **页面功能增强**
  - [ ] 自定义域名支持
  - [ ] SEO优化设置
  - [ ] 页面访问统计
  - [ ] 社交分享功能
  
- [ ] **编辑体验优化**
  - [ ] 拖拽排序模块
  - [ ] 实时预览更新
  - [ ] 撤销/重做功能
  - [ ] 模块模板库
  
- [ ] **AI功能扩展**
  - [ ] 更多AI模型支持
  - [ ] 智能内容建议
  - [ ] 自动SEO优化
  - [ ] 多语言生成

### 💡 低优先级 (P2)
- [ ] **高级功能**
  - [ ] 团队协作功能
  - [ ] 页面版本控制
  - [ ] A/B测试支持
  - [ ] 高级分析面板
  
- [ ] **扩展集成**
  - [ ] 更多社交平台
  - [ ] CRM系统集成
  - [ ] 邮件营销集成
  - [ ] 第三方插件系统
  
- [ ] **性能优化**
  - [ ] 图片CDN优化
  - [ ] 页面缓存策略
  - [ ] 数据库查询优化
  - [ ] 移动端性能优化

### 🎯 长期规划 (P3)
- [ ] **商业化功能**
  - [ ] 订阅计划管理
  - [ ] 付费功能解锁
  - [ ] 企业版功能
  - [ ] API开放平台
  
- [ ] **生态建设**
  - [ ] 模板市场
  - [ ] 插件开发平台
  - [ ] 开发者社区
  - [ ] 合作伙伴计划

## 📋 开发计划

详细的开发步骤请参考 [DEVELOPMENT.md](./DEVELOPMENT.md) 

## 🔧 配置文档

- 📖 [Clerk + Supabase 配置指南](./CLERK_SUPABASE_SETUP.md)
- 🚀 [快速开始指南](./QUICKSTART.md)
- 🏗️ [项目结构说明](./PROJECT_STRUCTURE.md)
- 📊 [项目总览](./PROJECT_OVERVIEW.md)

---

**MorphID** - 让每个人都能拥有专业的职业身份展示平台 ✨ 