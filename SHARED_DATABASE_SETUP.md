# 🔗 MorphID 共享数据库配置指南

本指南将帮助您配置 MorphID 使用与父项目相同的 Clerk 认证和 Supabase 数据库。

## ✅ 已完成的配置

基于您提供的信息，我已经为您配置了：

### 1. 环境变量配置
- ✅ 使用您的 Clerk 配置
- ✅ 使用您的 Supabase 配置
- ✅ 创建了 `env.shared.example` 文件

### 2. 数据库迁移脚本
- ✅ 创建了 `supabase-migration-shared.sql`
- ✅ 适配您现有的用户表结构
- ✅ 添加了 MorphID 专用表（带 `morphid_` 前缀）
- ✅ 配置了多项目访问控制

### 3. 代码更新
- ✅ 更新了 `lib/supabase.ts` 适配共享数据库
- ✅ 更新了用户同步逻辑
- ✅ 创建了跨项目同步服务

## 🚀 下一步操作

### 1. 复制环境变量
```bash
cp env.shared.example .env.local
```

### 2. 执行数据库迁移
1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入您的项目：`https://chvjjnnwmqoidtehifvr.supabase.co`
3. 进入 "SQL Editor"
4. 创建新查询
5. 复制 `supabase-migration-shared.sql` 的内容
6. 执行 SQL 脚本

### 3. 验证迁移结果
执行后您应该看到：
- ✅ `users` 表新增了 `projects`、`plan`、`default_model` 字段
- ✅ 创建了 5 个新的 MorphID 表
- ✅ 所有现有用户自动获得 MorphID 访问权限
- ✅ 创建了 3 个示例模板

### 4. 启动开发服务器
```bash
npm run dev
```

## 📊 数据库结构概览

### 现有表（已扩展）
```sql
users (
  id TEXT PRIMARY KEY,              -- Clerk用户ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  projects TEXT[] DEFAULT '{}',     -- 新增：项目访问权限
  plan TEXT DEFAULT 'free',         -- 新增：用户计划
  default_model TEXT DEFAULT 'gpt-4o', -- 新增：默认AI模型
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 新增的 MorphID 表
```sql
morphid_pages (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  slug TEXT UNIQUE,
  title TEXT,
  theme TEXT DEFAULT 'zen',
  layout TEXT DEFAULT 'grid',
  visibility TEXT DEFAULT 'private',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

morphid_page_blocks (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES morphid_pages(id),
  type TEXT,
  data JSONB DEFAULT '{}',
  position INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- 还有：morphid_page_analytics, morphid_templates, morphid_user_assets
```

## 🔐 权限控制

### 多项目访问控制
- 用户的 `projects` 字段控制可访问的项目
- MorphID 用户需要 `projects` 包含 `"morphid"`
- RLS 策略确保数据隔离

### 示例权限检查
```typescript
// 检查用户是否有 MorphID 访问权限
const hasAccess = await queries.checkMorphIDAccess(clerkUserId)

// 获取用户的所有项目权限
const { data } = await queries.getUserProjects(clerkUserId)
console.log(data.projects) // ['morphid', 'other-project']
```

## 🧪 测试配置

### 1. 测试用户认证
1. 访问 `http://localhost:3000`
2. 使用现有账户登录
3. 确认重定向到仪表板

### 2. 测试数据库访问
```typescript
// 在浏览器控制台测试
import { queries } from '@/lib/supabase'

// 检查 MorphID 访问权限
const hasAccess = await queries.checkMorphIDAccess('your-clerk-user-id')
console.log('Has MorphID access:', hasAccess)

// 获取用户页面
const pages = await queries.getUserMorphIDPages('your-clerk-user-id')
console.log('User pages:', pages)
```

## 🔄 数据同步流程

### 用户注册/更新时
1. Clerk Webhook 触发
2. `syncUserAcrossProjects()` 执行
3. 用户信息同步到共享数据库
4. 自动添加 MorphID 访问权限

### 跨项目数据访问
- 父项目和 MorphID 共享同一个用户表
- 通过 `projects` 字段控制访问权限
- 实时数据同步，无需额外配置

## 🚨 注意事项

### 数据安全
- ✅ 所有 MorphID 表都启用了 RLS
- ✅ 用户只能访问自己的数据
- ✅ 公开页面有单独的访问策略

### 性能优化
- ✅ 已创建必要的数据库索引
- ✅ 使用 GIN 索引优化 `projects` 字段查询
- ✅ 配置了实时订阅频率限制

### 扩展性
- 🔄 可以轻松添加新的项目到 `projects` 数组
- 🔄 MorphID 表使用前缀，避免命名冲突
- 🔄 支持独立部署或集成部署

## 📞 问题排查

### 常见问题

**Q: 用户登录后没有 MorphID 访问权限**
A: 检查数据库迁移是否正确执行，确认 `projects` 字段包含 `"morphid"`

**Q: 无法创建 MorphID 页面**
A: 确认 RLS 策略正确配置，用户有相应的数据库权限

**Q: 跨项目数据不同步**
A: 检查 Clerk Webhook 配置，确认 `syncUserAcrossProjects` 函数正常工作

### 调试命令
```bash
# 检查数据库连接
npm run dev

# 查看 Webhook 日志
# 在 Vercel/部署平台查看函数日志

# 测试 Supabase 连接
# 在浏览器开发者工具中测试查询
```

## 🎉 完成！

配置完成后，您的 MorphID 项目将：
- ✅ 与父项目共享用户认证
- ✅ 使用相同的 Supabase 数据库
- ✅ 支持多项目访问控制
- ✅ 实现实时数据同步
- ✅ 保持数据安全和隔离

现在您可以开始开发 MorphID 的核心功能了！ 