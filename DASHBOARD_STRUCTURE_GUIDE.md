# App/(dashboard) 目录结构说明

## 📁 总体结构

```
app/(dashboard)/
├── chat/
│   ├── new/
│   │   └── page.tsx          # 新建聊天/项目页面
│   └── [projectId]/
│       └── page.tsx          # 编辑现有项目页面
├── resume/
│   └── new/
│       └── page.tsx          # 新建简历页面（使用新布局）
└── dashboard/
    ├── page.tsx              # 主仪表板页面
    └── loading.tsx           # 加载状态页面
```

## 🔍 路由组概念

### `(dashboard)` 是什么？
`(dashboard)` 是 Next.js 13+ 的 **路由组 (Route Groups)** 语法：
- **括号语法**: `(名称)` 不会影响实际的 URL 路径
- **作用**: 用于组织和分组相关路由，共享布局或中间件
- **URL**: `/dashboard`, `/chat/new`, `/resume/new` 等（不包含 `(dashboard)`）

### 为什么使用路由组？
1. **权限控制**: 统一的认证保护（在 `middleware.ts` 中定义）
2. **布局共享**: 可以添加共同的 layout.tsx
3. **代码组织**: 将需要登录的页面分组管理

## 📄 各文件详细说明

### 1. `/dashboard/page.tsx`
- **路由**: `/dashboard`
- **功能**: 主要的工作台页面
- **特点**:
  - 项目管理中心
  - 统计数据展示
  - 项目列表和搜索
  - 批量操作功能
  - 不是创建入口，而是管理中心

### 2. `/chat/new/page.tsx`  
- **路由**: `/chat/new`
- **功能**: 创建新项目的聊天页面
- **特点**:
  - 使用新的 ResumeBuilder 布局
  - 集成 ChatInterface 组件
  - 支持代码生成和下载
  - 从 dashboard 快速创建入口

### 3. `/chat/[projectId]/page.tsx`
- **路由**: `/chat/项目ID`
- **功能**: 编辑现有项目
- **特点**:
  - 项目头部导航（返回、预览、分享等）
  - 使用新的 ResumeBuilder 布局
  - 支持项目数据转换
  - 实时保存功能

### 4. `/resume/new/page.tsx`
- **路由**: `/resume/new`
- **功能**: 专门的简历创建页面
- **特点**:
  - 使用最新的 ResumeBuilder 布局
  - 专注于简历生成
  - 完整的用户数据处理
  - 代码下载和部署功能

### 5. `/dashboard/loading.tsx`
- **功能**: 仪表板加载状态
- **作用**: 提供更好的用户体验

## 🔐 权限和访问控制

### 中间件保护
在 `middleware.ts` 中定义：
```typescript
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/chat(.*)",     // 包括 /chat/new 和 /chat/[projectId]
  "/settings(.*)",
  // ... 其他受保护路由
])
```

### 访问流程
1. **未登录用户**: 访问这些路由会被重定向到 `/sign-in`
2. **已登录用户**: 可以正常访问所有路由
3. **登录后**: 自动重定向到 `/dashboard`

## 🔄 页面流程关系

### 用户旅程
```
Landing (/) 
    ↓ 登录
Dashboard (/dashboard)
    ↓ 新建项目
Chat New (/chat/new) 
    ↓ 或编辑现有
Chat Edit (/chat/[id])
    ↓ 专门简历
Resume New (/resume/new)
```

### 导航关系
- **主入口**: `/chat` (外部聊天页面)
- **管理中心**: `/dashboard` 
- **创建页面**: `/chat/new`, `/resume/new`
- **编辑页面**: `/chat/[projectId]`

## 🆚 与外部页面的区别

### `app/chat/page.tsx` vs `app/(dashboard)/chat/new/page.tsx`
| 特性 | `/chat` (外部) | `/chat/new` (dashboard) |
|------|----------------|-------------------------|
| **认证** | 不要求登录 | 需要登录 |
| **布局** | 左侧会话列表 + 右侧对话 | ResumeBuilder 布局 |
| **用途** | 首次体验，选择会话 | 创建新项目 |
| **导航** | 有到 dashboard 的链接 | 内置返回导航 |

## 📋 建议和最佳实践

### 1. 路由组织
- `(dashboard)` 用于需要认证的页面
- `(public)` 可用于公开页面
- `(auth)` 可用于登录相关页面

### 2. 布局复用
- 可以在 `(dashboard)` 下添加 `layout.tsx` 用于共享布局
- 统一的侧边栏、头部导航等

### 3. 权限控制
- 中间件统一处理认证
- 页面级别的权限检查
- 用户角色和权限管理

## 🎯 总结

`app/(dashboard)` 目录是 HeysMe 项目的**核心工作区域**，包含了：

- ✅ **项目管理**: dashboard 主页
- ✅ **项目创建**: chat/new, resume/new  
- ✅ **项目编辑**: chat/[projectId]
- ✅ **统一认证**: 路由组保护
- ✅ **现代布局**: 使用新的 ResumeBuilder 组件

这个结构清晰地分离了公开访问和需要认证的功能，为用户提供了专业的项目管理体验。 