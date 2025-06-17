/**
 * 分享短链接 API
 * 
 * 功能：
 * - POST: 生成短链接
 * - GET: 短链接重定向
 * 
 * 链接格式: https://yourdomain.com/r/abc123
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { z } from "zod";

// 生成短链接的请求schema
const generateShortLinkSchema = z.object({
  pageId: z.string().uuid("无效的页面ID"),
  userId: z.string().uuid("无效的用户ID"),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  allowedViewers: z.array(z.string().email()).optional(),
  analytics: z.boolean().default(true),
});

/**
 * POST /api/share
 * 生成分享短链接
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 数据验证
    const validationResult = generateShortLinkSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "数据验证失败",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { pageId, userId, password, expiresAt, allowedViewers, analytics } = validationResult.data;
    const supabase = createServerClient();

    // 验证页面是否存在且用户有权限
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, user_id, title, slug")
      .eq("id", pageId)
      .eq("user_id", userId)
      .single();

    if (pageError || !page) {
      return NextResponse.json(
        { success: false, error: "页面不存在或无权限" },
        { status: 404 }
      );
    }

    // 生成短链接码 (6位随机字符)
    const shortCode = generateShortCode();
    
    // 检查短链接是否已存在
    const { data: existingShare } = await supabase
      .from("page_shares")
      .select("short_code")
      .eq("short_code", shortCode)
      .single();

    if (existingShare) {
      // 如果存在，递归重新生成
      return POST(request);
    }

    // 创建分享记录
    const { data: shareData, error: shareError } = await supabase
      .from("page_shares")
      .insert({
        page_id: pageId,
        user_id: userId,
        short_code: shortCode,
        password: password || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowed_viewers: allowedViewers || null,
        enable_analytics: analytics,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shareError) {
      console.error("创建分享记录失败:", shareError);
      throw shareError;
    }

    // 构建完整的分享链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';
    const shareUrl = `${baseUrl}/r/${shortCode}`;

    return NextResponse.json({
      success: true,
      data: {
        shareUrl,
        shortCode,
        pageTitle: page.title,
        pageSlug: page.slug,
        expiresAt: shareData.expires_at,
        hasPassword: !!password,
        analytics: analytics,
        createdAt: shareData.created_at,
      },
    });

  } catch (error) {
    console.error("生成分享链接失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "生成分享链接失败",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share?code=abc123
 * 获取短链接信息（重定向前验证）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const password = searchParams.get("password");

    if (!code) {
      return NextResponse.json(
        { success: false, error: "缺少短链接码" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    
    // 查找分享记录
    const { data: share, error: shareError } = await supabase
      .from("page_shares")
      .select(`
        *,
        pages (
          id,
          slug,
          title,
          theme,
          layout,
          user_id,
          users (
            username,
            full_name
          )
        )
      `)
      .eq("short_code", code)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { success: false, error: "分享链接不存在或已失效" },
        { status: 404 }
      );
    }

    // 检查是否过期
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "分享链接已过期" },
        { status: 410 }
      );
    }

    // 检查密码
    if (share.password && share.password !== password) {
      return NextResponse.json(
        { 
          success: false, 
          error: "需要密码",
          requiresPassword: true 
        },
        { status: 401 }
      );
    }

    // 记录访问
    if (share.enable_analytics) {
      await supabase
        .from("page_share_analytics")
        .insert({
          share_id: share.id,
          visitor_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
          referer: request.headers.get("referer"),
          visited_at: new Date().toISOString(),
        });

      // 更新访问次数
      await supabase
        .from("page_shares")
        .update({ 
          view_count: (share.view_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq("id", share.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        pageId: share.pages.id,
        pageSlug: share.pages.slug,
        pageTitle: share.pages.title,
        pageTheme: share.pages.theme,
        pageLayout: share.pages.layout,
        authorName: share.pages.users?.full_name || share.pages.users?.username,
        redirectUrl: `/p/${share.pages.slug}`,
        shareInfo: {
          createdAt: share.created_at,
          viewCount: share.view_count || 0,
          hasPassword: !!share.password,
        }
      },
    });

  } catch (error) {
    console.error("获取分享信息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取分享信息失败",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 生成6位随机短链接码
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 