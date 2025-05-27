# 🧭 FlowID v0.1 - AI驱动的身份平台

> **版本**: v0.1  
> **类型**: MVP / 创始内测计划版  
> **目标**: 创建一个 AI 驱动的身份平台，用户通过多轮输入构建个性化主页，支持风格、结构、受众控制

## 🎯 产品定位

FlowID 是一个 AI 驱动的职业主页平台，帮助用户根据"身份、目标、风格、展示方向"生成多个可控的职业页面，并能轻松分享和管理。

### 适用人群
- AI 工程师 / AI产品经理
- 自由职业者 / 应届生 / 创作者
- 交友 / 社媒达人 / 销售
- 需要个性化展示履历、照片、作品、项目、社交资料等的用户

## 🔑 核心功能（MVP）

| 模块 | 描述 |
|------|------|
| 用户系统 | 登录/注册，OAuth 授权（GitHub、Google） |
| 多阶段用户输入 | 分阶段输入：身份 → 目的 → 风格 → 展示内容 |
| 多模型接入 | Claude 3.7（默认），可选 OpenAI / Gemini / DeepSeek |
| 页面生成 Agent | 调用模型生成页面结构 JSON + 配置项 |
| 页面管理 | 创建多个页面，自定义标题、风格、slug、可见性 |
| 页面展示 | 支持分享，支持模块化风格切换，风格样式支持 Tailwind Theme 结构 |
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

## 🧩 产品流程（用户视角）

1. **注册 / 登录**（Clerk）
2. **输入一句话触发创建 FlowID** → 进入多阶段构建流程：
   - 人物背景（如 AI 学生、独立设计师）
   - 目标用途（找工作、展示、合作等）
   - 表达风格（极简、炫酷、科技感等）
   - 展示重点（项目、文章、招聘、技能）
3. **调用 Claude 3.7** → 输出 JSON 页面结构（带模块 & layout & theme）
4. **用户可手动修改**页面内容 + 模块显隐
5. **命名页面** / 设置 slug / 设置权限
6. **生成分享页** `flowid.ai/yourname/slug`
7. **可将页面添加到 Explore**

## ✨ 页面结构（前端渲染 JSON 结构）

```typescript
interface FlowPage {
  title: string
  slug: string
  visibility: "public" | "private" | "link-only"
  theme: "zen" | "creative" | "devgrid" | string
  layout: "grid" | "hero" | "twocol" | string
  blocks: PageBlock[]
}

type PageBlock = 
  | HeroBlock 
  | ProjectBlock 
  | SkillBlock 
  | LinkBlock 
  | RecruitBlock 
  | CustomBlock
```

## 🔧 技术架构（Next.js 全栈）

### 🏗 前端（App Router）

| 技术 | 用途 |
|------|------|
| Next.js (App Router) | 页面渲染，前后端分离架构 |
| TypeScript | 全类型控制 |
| Tailwind CSS + Shadcn/ui | UI 组件构建 |
| Zustand / Jotai | 页面编辑器状态管理 |
| TipTap（可选） | 支持富文本编辑模块 |

### 🧠 后端 / AI

| 技术 | 用途 |
|------|------|
| API 路由（/api/flowagent） | 调用 Claude / OpenAI / Gemini |
| Claude 3.7-Sonnet（默认） | 用于结构生成（角色感 + 风格表达） |
| 多模型支持切换（select） | 供用户选择调用其他大模型 API（预留） |

### 🔐 登录与用户管理

| 技术 | 用途 |
|------|------|
| Clerk | 登录注册、OAuth（GitHub/Google） |
| Supabase Edge Functions | 可集成身份验证安全性补充（后期） |

## 🗃 数据结构（Supabase）

### 表：users
| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 用户主键 |
| email | string | 邮箱地址 |
| username | string | 自定义用户名（用于子路径） |
| plan | "free" / "pro" | 权限字段 |
| default_model | string | 模型偏好（如 claude/openai） |

### 表：pages
| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 页面主键 |
| user_id | FK | 用户 ID |
| slug | string | 页面路径后缀 |
| title | string | 页面标题 |
| theme | string | 风格名称（Tailwind theme） |
| layout | string | 页面布局风格 |
| visibility | string | 权限控制 |
| created_at | timestamp | 创建时间 |

### 表：page_blocks
| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 模块 ID |
| page_id | FK | 所属页面 |
| type | string | 模块类型 |
| data | jsonb | 模块内容（如项目列表、技能标签等） |

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
| Clerk | 登录、OAuth |
| Stripe（后期） | 订阅 / 单次支付 |
| Cloudflare（可选） | 缓存 + 子域配置 |

## 📋 开发计划

详细的开发步骤请参考 [DEVELOPMENT.md](./DEVELOPMENT.md) 