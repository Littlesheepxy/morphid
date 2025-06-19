/**
 * 认证助手 - 兼容不同环境的认证状态检查
 */

import { auth } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';

export interface AuthResult {
  userId: string | null;
  isAuthenticated: boolean;
  user?: any;
}

/**
 * 通用认证状态检查
 * 兼容App Router和Pages Router环境
 */
export async function checkAuthStatus(): Promise<AuthResult> {
  try {
    // 优先尝试使用 auth() - App Router
    const { userId } = await auth();
    
    if (userId) {
      return { 
        userId, 
        isAuthenticated: true 
      };
    }
    
    return { 
      userId: null, 
      isAuthenticated: false 
    };
    
  } catch (error) {
    console.warn('⚠️ [认证助手] auth()调用失败，尝试备选方案:', error);
    
    try {
      // 备选方案：使用 currentUser() 
      const user = await currentUser();
      
      if (user?.id) {
        return {
          userId: user.id,
          isAuthenticated: true,
          user
        };
      }
      
      return { 
        userId: null, 
        isAuthenticated: false 
      };
      
    } catch (fallbackError) {
      console.warn('⚠️ [认证助手] 备选认证方案也失败:', fallbackError);
      
      // 最终降级：返回未认证状态
      return { 
        userId: null, 
        isAuthenticated: false 
      };
    }
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const result = await checkAuthStatus();
    return result.user || null;
  } catch (error) {
    console.warn('⚠️ [认证助手] 获取用户信息失败:', error);
    return null;
  }
}

/**
 * 检查是否为认证环境
 */
export function isAuthEnvironment(): boolean {
  try {
    // 检查环境变量是否配置
    return !!(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
      process.env.CLERK_SECRET_KEY
    );
  } catch {
    return false;
  }
} 