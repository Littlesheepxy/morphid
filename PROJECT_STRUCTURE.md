# MorphID MVP 项目结构

## 📁 目录结构

\`\`\`
MorphID-mvp/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 认证相关页面组
│   │   ├── login/page.tsx        # 登录页面
│   │   ├── register/page.tsx     # 注册页面
│   │   ├── callback/route.ts     # OAuth回调处理
│   │   └── layout.tsx            # 认证布局
│   │
│   ├── (dashboard)/              # 仪表板页面组
│   │   ├── dashboard/page.tsx    # 项目管理仪表板
│   │   ├── chat/                 # 聊天相关页面
│   │   │   ├── new/page.tsx      # 新建项目聊天
│   │   │   └── [projectId]/page.tsx # 编辑项目聊天
│   │   └── layout.tsx            # 仪表板布局
│   │
│   ├── (public)/                 # 公开页面组
│   │   └── p/[slug]/page.tsx     # 公开页面展示
│   │
│   ├── api/                      # API 路由
│   │   ├── pages/                # 页面CRUD操作
│   │   ├── generate-page/        # AI页面生成
│   │   ├── intent-recognition/   # 意图识别
│   │   └── deploy/              # 页面部署
│   │
│   ├── globals.css              # 全局样式
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 首页
│
├── components/                   # 可复用组件
│   ├── ui/                      # shadcn/ui 组件
│   ├── flow-builder.tsx         # 流程构建器
│   ├── page-renderer.tsx        # 页面渲染器
│   ├── chat-interface.tsx       # 聊天界面
│   ├── data-source-integration.tsx # 数据源集成
│   ├── model-selector.tsx       # AI模型选择器
│   └── theme-toggle.tsx         # 主题切换器
│
├── lib/                         # 工具库
│   ├── agents/                  # Agent系统
│   │   ├── data-collection-agent.ts
│   │   ├── summary-agent.ts
│   │   ├── page-creation-agent.ts
│   │   └── workflow-manager.ts
│   ├── supabase.ts             # 数据库客户端
│   ├── ai-models.ts            # AI模型集成
│   └── utils.ts                # 通用工具函数
│
├── hooks/                       # 自定义Hooks
│   ├── use-chat.ts             # 聊天功能Hook
│   ├── use-agent-workflow.ts   # Agent工作流Hook
│   └── use-chat-system.ts      # 聊天系统Hook
│
├── contexts/                    # React Context
│   └── theme-context.tsx       # 主题上下文
│
├── types/                       # TypeScript类型定义
│   ├── MorphID.ts               # 核心业务类型
│   ├── chat.ts                 # 聊天相关类型
│   ├── agent.ts                # Agent系统类型
│   └── models.ts               # AI模型类型
│
├── middleware.ts                # Next.js中间件
├── tailwind.config.ts          # Tailwind配置
├── next.config.mjs             # Next.js配置
└── package.json                # 项目依赖
\`\`\`

## 🔄 页面流程设计

### 1. 用户认证流程
\`\`\`
首页 → 注册/登录 → 邮箱验证 → 仪表板
\`\`\`

### 2. 项目创建流程
\`\`\`
仪表板 → 新建项目 → Agent对话 → 数据收集 → 分析总结 → 页面生成 → 预览保存
\`\`\`

### 3. 项目编辑流程
\`\`\`
仪表板 → 选择项目 → 编辑界面 → 实时预览 → 保存发布
\`\`\`

### 4. 页面访问流程
\`\`\`
公开链接 → 页面展示 → 访问统计 → 社交分享
\`\`\`

## 🎯 核心功能模块

### 1. 认证系统 (`/app/(auth)/`)
- ✅ 邮箱密码注册/登录
- ✅ 社交登录 (Google, GitHub)
- ✅ 密码强度验证
- ✅ 邮箱验证流程
- ✅ 自动重定向处理

### 2. 项目管理 (`/app/(dashboard)/`)
- ✅ 项目列表展示
- ✅ 项目搜索筛选
- ✅ 项目统计分析
- ✅ 项目操作菜单
- ✅ 新建项目入口

### 3. 聊天系统 (`/components/chat-interface.tsx`)
- ✅ 多Agent协作
- ✅ 实时消息处理
- ✅ 选项式交互
- ✅ 数据源集成
- ✅ 模型选择器

### 4. Agent工作流 (`/lib/agents/`)
- ✅ 数据收集Agent
- ✅ 分析总结Agent
- ✅ 页面创建Agent
- ✅ 工作流管理器
- ✅ 多数据源支持

### 5. 页面渲染 (`/components/page-renderer.tsx`)
- ✅ 多主题支持
- ✅ 响应式布局
- ✅ 模块化设计
- ✅ 实时预览
- ✅ SEO优化

## 🚀 部署和配置

### 环境变量
\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Models
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# 其他配置
NEXTAUTH_SECRET=
NEXTAUTH_URL=
\`\`\`

### 数据库表
- `users` - 用户信息
- `pages` - 页面数据
- `page_blocks` - 页面模块
- `chat_sessions` - 聊天会话 (TODO)
- `page_analytics` - 访问统计 (TODO)

## 📋 开发优先级

### 🔥 P0 (立即完成)
- [x] 用户认证系统
- [x] 项目管理界面
- [x] 聊天系统重构
- [x] Agent工作流集成
- [x] 页面预览功能

### 🚀 P1 (近期完成)
- [ ] 数据库表创建和迁移
- [ ] 页面保存和加载功能
- [ ] 实际的数据源集成
- [ ] 页面部署功能
- [ ] 访问统计系统

### 💡 P2 (中期规划)
- [ ] 页面编辑器
- [ ] 协作功能
- [ ] 模板市场
- [ ] 高级分析
- [ ] 移动端优化

这个重构后的架构更加清晰和模块化，支持了你提到的需求：
1. **Chat拆分**: 分为项目管理(dashboard)和具体聊天(chat/new, chat/[id])
2. **认证系统**: 完整的注册登录流程
3. **预览分离**: 独立的预览页面和编辑界面
4. **项目管理**: 清晰的项目层级结构

每个模块都有详细的注释和TODO清单，便于后续开发和维护！
