# 🔗 共享认证架构配置指南

本指南说明如何将 MorphID 作为子项目，与父项目共享用户认证和数据库。

## 🎯 架构概述

```
父项目 (Main App)
├── Clerk 认证系统 (共享)
├── Supabase 主数据库
└── 用户管理、核心功能

MorphID 子项目
├── 使用相同的 Clerk 配置
├── 独立的 Supabase 项目 (可选)
└── 专注于 AI 页面生成功能
```

## 🚀 方案一：共享 Clerk + 独立 Supabase（推荐）

### 优势
- ✅ 用户认证完全统一
- ✅ 数据隔离，便于独立开发
- ✅ 可以独立部署和扩展
- ✅ 通过 Clerk 用户 ID 关联数据

### 配置步骤

#### 1. 使用相同的 Clerk 配置

```env
# .env.local - 与父项目使用相同的 Clerk 密钥
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_same_as_parent_project
CLERK_SECRET_KEY=sk_test_same_as_parent_project

# 可以自定义重定向路径
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/morphid/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/morphid/dashboard
```

#### 2. 配置独立的 Supabase 项目

```env
# MorphID 专用的 Supabase 项目
NEXT_PUBLIC_SUPABASE_URL=https://morphid-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_morphid_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_morphid_supabase_service_key
```

#### 3. 跨项目用户数据同步

创建用户同步服务：

```typescript
// lib/cross-project-sync.ts
export async function syncUserAcrossProjects(clerkUser: any) {
  // 1. 同步到 MorphID 数据库
  await syncUserWithClerk(clerkUser)
  
  // 2. 可选：通知父项目用户更新
  if (process.env.PARENT_PROJECT_WEBHOOK_URL) {
    await fetch(process.env.PARENT_PROJECT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user.updated',
        source: 'morphid',
        data: clerkUser
      })
    })
  }
}
```

## 🔄 方案二：共享 Clerk + 共享 Supabase

### 优势
- ✅ 完全统一的用户和数据管理
- ✅ 实时数据同步
- ✅ 简化的架构

### 配置步骤

#### 1. 使用父项目的 Supabase

```env
# 使用与父项目相同的 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://parent-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=same_as_parent_project
SUPABASE_SERVICE_ROLE_KEY=same_as_parent_project
```

#### 2. 修改表结构以支持多项目

```sql
-- 在现有用户表中添加项目标识
ALTER TABLE users ADD COLUMN IF NOT EXISTS projects TEXT[] DEFAULT '{}';

-- 为 MorphID 特定的表添加前缀
CREATE TABLE IF NOT EXISTS morphid_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- ... 其他字段
);

CREATE TABLE IF NOT EXISTS morphid_page_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES morphid_pages(id) ON DELETE CASCADE,
  -- ... 其他字段
);
```

#### 3. 更新 RLS 策略

```sql
-- 更新策略以支持多项目访问
CREATE POLICY "Users can access morphid data" ON morphid_pages
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = auth.jwt() ->> 'sub'
      AND 'morphid' = ANY(projects)
    )
  );
```

## 🌐 方案三：微服务架构（高级）

### 架构设计

```
API Gateway / 父项目
├── 统一认证入口
├── 路由分发
└── 用户管理

MorphID 微服务
├── 独立的 API 服务
├── 通过 JWT 验证用户
└── 专注业务逻辑
```

### 配置步骤

#### 1. 创建 JWT 验证中间件

```typescript
// lib/jwt-auth.ts
import { auth } from "@clerk/nextjs/server"

export async function verifyUserFromParent() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }
  
  // 可选：从父项目 API 获取用户详细信息
  const userResponse = await fetch(`${process.env.PARENT_PROJECT_API}/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
    }
  })
  
  return userResponse.json()
}
```

#### 2. 配置 API 路由

```typescript
// app/api/pages/route.ts
import { verifyUserFromParent } from "@/lib/jwt-auth"

export async function GET() {
  try {
    const user = await verifyUserFromParent()
    // 处理业务逻辑
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
```

## 🔧 推荐配置（方案一详细实现）

基于您的需求，我推荐使用方案一。让我为您更新配置：

### 1. 更新环境变量模板

```env
# 父项目共享的 Clerk 配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_shared_with_parent
CLERK_SECRET_KEY=sk_test_shared_with_parent

# MorphID 特定的重定向配置
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MorphID 独立的 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://morphid-specific.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=morphid_specific_anon_key
SUPABASE_SERVICE_ROLE_KEY=morphid_specific_service_key

# 跨项目通信配置（可选）
PARENT_PROJECT_API_URL=https://parent-project.com/api
PARENT_PROJECT_WEBHOOK_URL=https://parent-project.com/api/webhooks/morphid
INTERNAL_API_KEY=shared_internal_api_key

# AI 模型配置
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 2. 部署配置

#### 独立部署
```bash
# MorphID 可以独立部署到子域名
https://morphid.your-domain.com
```

#### 路径部署
```bash
# 或者作为父项目的子路径
https://your-domain.com/morphid
```

## 🔄 数据同步策略

### 用户数据同步

```typescript
// lib/user-sync.ts
export async function syncUserWithParentProject(clerkUser: any) {
  // 1. 同步到 MorphID 数据库
  const morphidUser = await syncUserWithClerk(clerkUser)
  
  // 2. 通知父项目（如果需要）
  if (process.env.PARENT_PROJECT_WEBHOOK_URL) {
    try {
      await fetch(process.env.PARENT_PROJECT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
        },
        body: JSON.stringify({
          type: 'morphid.user.updated',
          userId: clerkUser.id,
          data: morphidUser
        })
      })
    } catch (error) {
      console.error('Failed to sync with parent project:', error)
    }
  }
  
  return morphidUser
}
```

### 跨项目数据访问

```typescript
// lib/cross-project-api.ts
export async function getUserFromParentProject(clerkUserId: string) {
  if (!process.env.PARENT_PROJECT_API_URL) {
    return null
  }
  
  try {
    const response = await fetch(
      `${process.env.PARENT_PROJECT_API_URL}/users/${clerkUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
        }
      }
    )
    
    return response.json()
  } catch (error) {
    console.error('Failed to fetch user from parent project:', error)
    return null
  }
}
```

## 🚀 快速启动

1. **选择架构方案**（推荐方案一）
2. **配置共享的 Clerk 密钥**
3. **创建 MorphID 专用的 Supabase 项目**
4. **更新环境变量**
5. **部署到独立域名或子路径**

## 📋 迁移检查清单

- [ ] 确认父项目的 Clerk 配置
- [ ] 创建 MorphID 专用 Supabase 项目
- [ ] 配置跨项目通信（如需要）
- [ ] 测试用户认证流程
- [ ] 验证数据同步
- [ ] 配置部署环境

这样配置后，用户可以使用相同的账户在父项目和 MorphID 之间无缝切换，同时保持数据的独立性和灵活性。 