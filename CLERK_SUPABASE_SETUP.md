# 🔐 Clerk + Supabase 配置指南

本指南将帮助您配置 MorphID 项目的 Clerk 认证 + Supabase 数据库集成。

## 📋 前置要求

- [Clerk](https://clerk.com) 账户
- [Supabase](https://supabase.com) 项目
- Node.js 18+ 环境

## 🚀 第一步：Clerk 配置

### 1.1 创建 Clerk 应用

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 点击 "Create application"
3. 选择认证方式：
   - ✅ Email
   - ✅ Google OAuth
   - ✅ GitHub OAuth
   - ✅ 其他您需要的社交登录

### 1.2 获取 Clerk 密钥

在 Clerk Dashboard 中：
1. 进入 "API Keys" 页面
2. 复制以下密钥：
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 1.3 配置 Clerk 重定向 URL

在 Clerk Dashboard 的 "Paths" 设置中：
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/dashboard`
- After sign-up: `/dashboard`

### 1.4 设置 Webhook（可选但推荐）

1. 在 Clerk Dashboard 中进入 "Webhooks"
2. 点击 "Add Endpoint"
3. 设置 Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
4. 选择事件：
   - ✅ user.created
   - ✅ user.updated
   - ✅ user.deleted
5. 复制 Webhook Secret

## 🗄️ 第二步：Supabase 配置

### 2.1 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New project"
3. 选择组织和设置项目名称
4. 等待项目创建完成

### 2.2 获取 Supabase 密钥

在 Supabase Dashboard 中：
1. 进入 "Settings" → "API"
2. 复制以下密钥：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2.3 执行数据库迁移

1. 在 Supabase Dashboard 中进入 "SQL Editor"
2. 创建新查询
3. 复制 `supabase-migration.sql` 文件的内容
4. 执行 SQL 脚本
5. 确认所有表都已创建成功

### 2.4 配置 RLS 策略

数据库迁移脚本已经包含了 RLS 策略，但您需要确保：
1. 所有表都启用了 RLS
2. 策略正确配置了 Clerk JWT 验证

## ⚙️ 第三步：环境变量配置

### 3.1 创建环境变量文件

```bash
cp .env.example .env.local
```

### 3.2 填写环境变量

编辑 `.env.local` 文件：

```env
# Clerk 认证配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Clerk 重定向URL配置
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Clerk Webhook Secret（如果配置了webhook）
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI 模型配置
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 第四步：测试配置

### 4.1 启动开发服务器

```bash
npm run dev
```

### 4.2 测试认证流程

1. 访问 `http://localhost:3000`
2. 点击登录/注册
3. 完成认证流程
4. 确认重定向到仪表板

### 4.3 验证数据库同步

1. 登录后检查 Supabase 的 `users` 表
2. 确认用户记录已创建
3. 验证 `clerk_id` 字段正确填充

## 🔧 第五步：高级配置

### 5.1 自定义 Clerk 主题

在组件中使用 `appearance` 属性：

```tsx
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
      card: "shadow-lg",
    },
  }}
/>
```

### 5.2 配置 Supabase RLS

如果需要自定义 RLS 策略，可以在 Supabase SQL Editor 中修改：

```sql
-- 示例：允许用户查看特定页面
CREATE POLICY "Custom page access" ON pages
  FOR SELECT USING (
    visibility = 'public' OR 
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );
```

### 5.3 设置生产环境

1. 更新 Clerk 的生产域名
2. 配置 Supabase 的生产环境变量
3. 设置 Webhook 的生产 URL

## 🐛 常见问题

### Q: Clerk 认证后没有重定向到仪表板
**A:** 检查 `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` 环境变量是否正确设置。

### Q: Supabase 查询失败
**A:** 确认 RLS 策略正确配置，并且 JWT 中包含正确的 `sub` 字段。

### Q: Webhook 验证失败
**A:** 检查 `CLERK_WEBHOOK_SECRET` 是否正确，并确认 Webhook URL 可以访问。

### Q: 用户数据没有同步到 Supabase
**A:** 检查 Webhook 配置和 `syncUserWithClerk` 函数是否正常工作。

## 📚 相关文档

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

## 🎉 完成！

配置完成后，您的 MorphID 项目将拥有：
- ✅ 完整的用户认证系统
- ✅ 安全的数据库访问
- ✅ 用户数据自动同步
- ✅ 社交登录支持
- ✅ 生产就绪的配置

现在您可以开始开发 MorphID 的核心功能了！ 