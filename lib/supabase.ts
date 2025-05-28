/**
 * Supabase 数据库客户端配置 - 共享数据库版本
 *
 * 功能：
 * - 提供客户端和服务端的Supabase连接
 * - 处理Clerk用户与共享Supabase数据库的同步
 * - 支持实时订阅和文件存储
 *
 * 架构说明：
 * - 认证：使用Clerk进行用户认证
 * - 数据库：使用共享的Supabase数据库
 * - 用户表：使用Clerk ID作为主键，支持多项目访问控制
 *
 * TODO:
 * - [ ] 添加连接池配置
 * - [ ] 实现自动重连机制
 * - [ ] 添加查询性能监控
 * - [ ] 支持多环境配置
 * - [ ] 添加缓存层
 */

import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"

// 环境变量验证
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

/**
 * 客户端 Supabase 实例
 * 用于：前端组件、数据查询、文件上传
 * 注意：不使用Supabase Auth，认证由Clerk处理
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 不使用Supabase的会话管理
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // 实时事件频率限制
    },
  },
})

/**
 * 服务端 Supabase 实例
 * 用于：API路由、管理员操作、数据同步
 * 权限：完整的数据库访问权限，需谨慎使用
 */
export const createServerClient = () => {
  if (!supabaseServiceKey) {
    throw new Error("Missing Supabase service role key")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // 服务端不持久化会话
    },
  })
}

/**
 * 获取当前用户的Supabase用户记录
 * 如果用户不存在，则创建新记录
 */
export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const serverClient = createServerClient()
  
  // 首先尝试获取现有用户
  const { data: existingUser, error: fetchError } = await serverClient
    .from("users")
    .select("*")
    .eq("id", userId) // 使用 Clerk ID 作为主键
    .single()

  if (existingUser) {
    return existingUser
  }

  // 如果用户不存在，创建新用户记录
  if (fetchError?.code === "PGRST116") { // 记录不存在
    const { data: newUser, error: createError } = await serverClient
      .from("users")
      .insert({
        id: userId, // 使用 Clerk ID 作为主键
        email: "", // 将在 syncUserWithClerk 中更新
        projects: ["morphid"], // 默认给予 MorphID 访问权限
        plan: "free",
        default_model: "gpt-4o",
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating user:", createError)
      return null
    }

    return newUser
  }

  console.error("Error fetching user:", fetchError)
  return null
}

/**
 * 同步Clerk用户信息到共享Supabase数据库
 * 在用户登录或信息更新时调用
 */
export async function syncUserWithClerk(clerkUser: any) {
  const serverClient = createServerClient()
  
  const userData = {
    id: clerkUser.id, // 使用 Clerk ID 作为主键
    email: clerkUser.emailAddresses[0]?.emailAddress,
    first_name: clerkUser.firstName,
    last_name: clerkUser.lastName,
    avatar_url: clerkUser.imageUrl,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await serverClient
    .from("users")
    .upsert(userData, { 
      onConflict: "id", // 基于 Clerk ID 进行 upsert
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (error) {
    console.error("Error syncing user:", error)
    return null
  }

  return data
}

/**
 * 共享数据库表结构说明：
 *
 * users 表（现有表结构 + MorphID 扩展）：
 * - id (text, primary key) - Clerk用户ID
 * - email (text, unique, not null)
 * - first_name (text, nullable)
 * - last_name (text, nullable)
 * - avatar_url (text, nullable)
 * - projects (text[], default: '{}') - 用户可访问的项目列表
 * - plan (text, default: 'free') - 用户计划
 * - default_model (text, default: 'gpt-4o') - 默认AI模型
 * - created_at (timestamp)
 * - updated_at (timestamp)
 *
 * morphid_pages 表：
 * - id (uuid, primary key)
 * - user_id (text, foreign key to users.id)
 * - slug (text, unique)
 * - title (text)
 * - theme (text)
 * - layout (text)
 * - visibility (text, default: 'private')
 * - is_featured (boolean, default: false)
 * - created_at (timestamp)
 * - updated_at (timestamp)
 *
 * morphid_page_blocks 表：
 * - id (uuid, primary key)
 * - page_id (uuid, foreign key)
 * - type (text)
 * - data (jsonb)
 * - position (integer)
 * - is_visible (boolean, default: true)
 * - created_at (timestamp)
 * - updated_at (timestamp)
 *
 * 其他 MorphID 表：
 * - morphid_page_analytics (页面访问统计)
 * - morphid_templates (页面模板)
 * - morphid_user_assets (用户上传的资源)
 */

// 常用查询辅助函数（更新为使用共享数据库结构）
export const queries = {
  // 获取用户的所有 MorphID 页面
  getUserMorphIDPages: async (clerkUserId: string) => {
    return supabase
      .from("morphid_pages")
      .select(`
        *,
        morphid_page_blocks (*)
      `)
      .eq("user_id", clerkUserId)
      .order("created_at", { ascending: false })
  },

  // 获取公开的 MorphID 页面
  getPublicMorphIDPages: () =>
    supabase
      .from("morphid_pages")
      .select(`
        *,
        morphid_page_blocks (*),
        users!inner (first_name, last_name, avatar_url)
      `)
      .eq("visibility", "public")
      .eq("is_featured", true)
      .order("created_at", { ascending: false }),

  // 通过slug获取 MorphID 页面
  getMorphIDPageBySlug: (slug: string) =>
    supabase
      .from("morphid_pages")
      .select(`
        *,
        morphid_page_blocks (*),
        users!inner (email, first_name, last_name, avatar_url)
      `)
      .eq("slug", slug)
      .single(),

  // 获取用户的项目权限
  getUserProjects: async (clerkUserId: string) => {
    return supabase
      .from("users")
      .select("projects")
      .eq("id", clerkUserId)
      .single()
  },

  // 检查用户是否有 MorphID 访问权限
  checkMorphIDAccess: async (clerkUserId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("projects")
      .eq("id", clerkUserId)
      .single()
    
    if (error || !data) return false
    
    const projects = data.projects || []
    return projects.includes("morphid")
  },
}

// TODO: 添加更多辅助函数
// - 批量操作函数
// - 缓存管理函数
// - 实时订阅管理
// - 错误处理包装器
