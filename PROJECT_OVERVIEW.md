# 📊 MorphID 项目总览

## 🎯 项目概述

**MorphID** 是一个AI驱动的职业身份平台，让用户通过简单的多轮对话创建个性化的职业主页。平台支持多种风格、布局和展示方向，适合各类专业人士展示自己的技能、项目和经历。

### 核心特色
- **三Agent协作系统**：数据收集 → 分析总结 → 页面创建
- **多数据源集成**：对话、文档、社交媒体等
- **智能页面生成**：基于用户画像的个性化设计
- **实时预览系统**：所见即所得的编辑体验

## 📋 文档结构

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| `README.md` | 产品需求文档，完整的功能规格 | 产品经理、开发者、投资人 |
| `DEVELOPMENT.md` | 详细的8周开发计划和技术实现 | 开发团队、技术负责人 |
| `QUICKSTART.md` | 快速开始指南，一键启动开发 | 新加入的开发者 |
| `PROJECT_STRUCTURE.md` | 项目结构和架构设计 | 开发团队、架构师 |
| `setup.sh` | 自动化项目初始化脚本 | 所有开发者 |

## 🚀 快速开始

### 立即开始开发
```bash
# 1. 运行初始化脚本
./setup.sh

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入API密钥

# 3. 启动开发服务器
npm run dev
```

### 详细配置
查看 `QUICKSTART.md` 获取完整的配置指南。

## 🏗 技术架构

### 核心技术栈
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **UI组件**: Shadcn/ui + Radix UI
- **认证**: Supabase Auth (OAuth支持)
- **数据库**: Supabase (PostgreSQL)
- **AI模型**: Claude 3.7 + OpenAI + Gemini
- **状态管理**: React Hooks + Context
- **部署**: Vercel

## 📁 项目结构

```
MorphID/
├── 📄 README.md              # 产品需求文档
├── 📄 DEVELOPMENT.md         # 开发计划
├── 📄 QUICKSTART.md          # 快速开始
├── 📄 PROJECT_STRUCTURE.md   # 项目结构
├── 🔧 setup.sh               # 初始化脚本
├── 📁 app/                   # Next.js App Router
│   ├── (auth)/               # 认证相关页面组
│   │   ├── login/page.tsx    # 登录页面
│   │   ├── register/page.tsx # 注册页面
│   │   ├── callback/route.ts # OAuth回调处理
│   │   └── layout.tsx        # 认证布局
│   ├── (dashboard)/          # 仪表板页面组
│   │   ├── dashboard/page.tsx # 项目管理仪表板
│   │   ├── chat/             # 聊天相关页面
│   │   │   ├── new/page.tsx  # 新建项目聊天
│   │   │   └── [projectId]/page.tsx # 编辑项目聊天
│   │   └── layout.tsx        # 仪表板布局
│   ├── (public)/             # 公开页面组
│   │   └── p/[slug]/page.tsx # 公开页面展示
│   ├── api/                  # API 路由
│   │   ├── pages/            # 页面CRUD操作
│   │   ├── generate-page/    # AI页面生成
│   │   ├── intent-recognition/ # 意图识别
│   │   └── deploy/          # 页面部署
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 首页
├── 📁 components/            # 可复用组件
│   ├── ui/                  # shadcn/ui 组件
│   ├── flow-builder.tsx     # 流程构建器
│   ├── page-renderer.tsx    # 页面渲染器
│   ├── chat-interface.tsx   # 聊天界面
│   ├── data-source-integration.tsx # 数据源集成
│   ├── model-selector.tsx   # AI模型选择器
│   └── theme-toggle.tsx     # 主题切换器
├── 📁 lib/                  # 工具库
│   ├── agents/              # Agent系统
│   │   ├── data-collection-agent.ts
│   │   ├── summary-agent.ts
│   │   ├── page-creation-agent.ts
│   │   └── workflow-manager.ts
│   ├── supabase.ts         # 数据库客户端
│   ├── ai-models.ts        # AI模型集成
│   └── utils.ts            # 通用工具函数
├── 📁 hooks/                # 自定义Hooks
│   ├── use-chat.ts         # 聊天功能Hook
│   ├── use-agent-workflow.ts # Agent工作流Hook
│   └── use-chat-system.ts  # 聊天系统Hook
├── 📁 contexts/             # React Context
│   └── theme-context.tsx   # 主题上下文
├── 📁 types/                # TypeScript类型定义
│   ├── morphid.ts          # 核心业务类型
│   ├── chat.ts             # 聊天相关类型
│   ├── agent.ts            # Agent系统类型
│   └── models.ts           # AI模型类型
├── middleware.ts            # Next.js中间件
├── tailwind.config.ts      # Tailwind配置
├── next.config.mjs         # Next.js配置
└── package.json            # 项目依赖
```

## 🔄 页面流程设计

### 1. 用户认证流程
```
首页 → 注册/登录 → 邮箱验证 → 仪表板
```

### 2. 项目创建流程
```
仪表板 → 新建项目 → Agent对话 → 数据收集 → 分析总结 → 页面生成 → 预览保存
```

### 3. 项目编辑流程
```
仪表板 → 选择项目 → 编辑界面 → 实时预览 → 保存发布
```

### 4. 页面访问流程
```
公开链接 → 页面展示 → 访问统计 → 社交分享
```

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

## 📈 开发进度

### Phase 1: 基础架构 (Week 1-2)
- [x] 项目文档完成
- [x] 初始化脚本就绪
- [x] Next.js项目搭建
- [x] 用户认证系统
- [x] 数据库设计

### Phase 2: 核心功能 (Week 3-5)
- [x] AI模型集成
- [x] 多阶段输入表单
- [x] 页面生成系统
- [x] 页面编辑器

### Phase 3: 高级功能 (Week 6-7)
- [ ] 多页面管理
- [ ] 权限系统
- [ ] Explore社区
- [ ] 分享功能

### Phase 4: 优化部署 (Week 8)
- [ ] 性能优化
- [ ] 测试覆盖
- [ ] 生产部署

## 🎨 产品特色

### 🤖 AI驱动生成
- 支持Claude、OpenAI、Gemini多模型
- 智能理解用户意图和风格偏好
- 自动生成页面结构和内容

### 🎭 多样化主题
- **极简禅意**: 简洁优雅的设计风格
- **创意炫酷**: 充满活力的视觉效果
- **开发者网格**: 技术感十足的布局
- **商务专业**: 正式的商务风格

### 🔧 灵活编辑
- 可视化页面编辑器
- 拖拽式模块排序
- 实时预览效果
- 自定义内容编辑

### 🌐 社区分享
- 公开页面展示
- Explore社区发现
- 多种分享方式
- 权限精细控制

## 💰 商业模式

### 免费用户
- 1个页面
- 基础主题
- Claude模型使用（有限额度）

### Pro用户 ($9/月)
- 无限页面
- 所有主题和布局
- 所有AI模型
- Explore高亮展示
- 自定义域名

## 🎯 目标用户

### 主要用户群体
1. **AI从业者**: 展示AI项目和技能
2. **自由职业者**: 吸引客户和合作
3. **应届生**: 求职和技能展示
4. **创作者**: 作品集和个人品牌
5. **销售人员**: 个人营销页面

### 使用场景
- 求职简历展示
- 项目作品集
- 个人品牌建设
- 商务合作介绍
- 社交网络展示

## 📊 竞争分析

### 竞品对比
| 产品 | 优势 | 劣势 |
|------|------|------|
| **MorphID** | AI生成、多主题、易用 | 新产品、用户基数小 |
| **Linktree** | 简单、知名度高 | 功能单一、无AI |
| **About.me** | 专业、模板丰富 | 无AI、定制性差 |
| **Notion** | 功能强大、灵活 | 复杂、学习成本高 |

### 差异化优势
1. **AI驱动**: 自动生成个性化内容
2. **多模型支持**: 用户可选择AI模型
3. **中文优化**: 针对中文用户体验
4. **开发者友好**: 技术人员专属功能

## 🚀 部署和配置

### 环境变量
```env
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
```

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

## 🔮 未来规划

### v0.2 (Q2 2024)
- 移动端优化
- 更多主题模板
- 团队协作功能
- 数据分析面板

### v0.3 (Q3 2024)
- 自定义域名
- 高级SEO优化
- 第三方集成
- API开放平台

### v1.0 (Q4 2024)
- 企业版功能
- 白标解决方案
- 国际化支持
- 高级分析工具

## 📞 联系方式

### 开发团队
- **产品负责人**: [您的姓名]
- **技术负责人**: [技术负责人]
- **设计负责人**: [设计负责人]

### 项目资源
- **代码仓库**: [GitHub链接]
- **设计稿**: [Figma链接]
- **项目管理**: [项目管理工具链接]
- **文档中心**: [文档链接]

---

## 🎉 开始您的MorphID之旅

准备好构建下一代AI驱动的身份平台了吗？

1. **阅读文档**: 从 `README.md` 了解产品全貌
2. **查看计划**: 在 `DEVELOPMENT.md` 中了解技术实现
3. **快速开始**: 按照 `QUICKSTART.md` 立即开始开发
4. **了解架构**: 在 `PROJECT_STRUCTURE.md` 中查看详细结构
5. **运行脚本**: 执行 `./setup.sh` 一键初始化项目

**让我们一起创造未来的个人品牌展示方式！** 🚀

---

*最后更新: 2024年12月*
*版本: v0.1* 