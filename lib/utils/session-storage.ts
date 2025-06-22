/**
 * 会话存储管理 - Supabase版本
 * 
 * 负责会话数据的Supabase数据库存储
 */

import { SessionData } from '@/lib/types/session';
import { createServerClient } from '@/lib/supabase-server';
import { checkAuthStatus } from './auth-helper';

/**
 * Supabase会话存储管理器
 * 
 * 提供基于Supabase数据库的存储接口
 */
export class SessionStorageManager {
  private supabase = createServerClient();

  /**
   * 确保值是Date对象，如果不是则转换为Date
   */
  private ensureDate(value: any): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return new Date(); // 默认返回当前时间
  }

  /**
   * 从Supabase加载所有会话数据
   * @returns 会话数据Map
   */
  async loadAllSessions(): Promise<Map<string, SessionData>> {
    const sessions = new Map<string, SessionData>();
    
    try {
      const { userId, isAuthenticated } = await checkAuthStatus();
      if (!isAuthenticated) {
        console.warn('⚠️ [存储] 用户未登录，无法加载会话');
        return sessions;
      }

      const { data: chatSessions, error } = await this.supabase
        .from('chat_sessions')
        .select(`
          *,
          conversation_entries(*),
          agent_flows(*)
        `)
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) {
        throw error;
      }

      if (chatSessions) {
        for (const session of chatSessions) {
          const sessionData = this.convertFromSupabase(session);
          sessions.set(sessionData.id, sessionData);
        }
        
        console.log(`✅ [存储-Supabase] 加载了 ${sessions.size} 个会话`);
      }
    } catch (error) {
      console.warn('⚠️ [存储] 从Supabase加载会话失败:', error);
    }

    return sessions;
  }

  /**
   * 保存所有会话数据到Supabase
   * @param sessions 会话数据Map
   */
  async saveAllSessions(sessions: Map<string, SessionData>): Promise<void> {
    try {
      const { userId, isAuthenticated } = await checkAuthStatus();
      if (!isAuthenticated) {
        console.warn('⚠️ [存储] 用户未登录，无法保存会话');
        return;
      }

      const sessionEntries = Array.from(sessions.entries());
      
      for (const [sessionId, sessionData] of sessionEntries) {
        await this.saveSession(sessionData, userId || undefined);
      }
      
      console.log(`✅ [存储-Supabase] 保存了 ${sessions.size} 个会话`);
    } catch (error) {
      console.warn('⚠️ [存储] 保存会话到Supabase失败:', error);
    }
  }

  /**
   * 保存单个会话到Supabase
   * @param sessionData 会话数据
   * @param userId 用户ID
   */
  async saveSession(sessionData: SessionData, userId?: string): Promise<void> {
    try {
      // 🔧 环境变量检查，如果Supabase未配置则跳过
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log('⚠️ [存储] Supabase未配置，跳过保存');
        return;
      }

      if (!userId) {
        const { userId: currentUserId, isAuthenticated } = await checkAuthStatus();
        if (!isAuthenticated || !currentUserId) {
          console.log('⚠️ [存储] 用户未登录，跳过保存');
          return; // 改为return而不是throw，避免阻塞
        }
        userId = currentUserId;
      }

      // 保存会话主记录
      const { error: sessionError } = await this.supabase
        .from('chat_sessions')
        .upsert({
          id: sessionData.id,
          user_id: userId,
          status: sessionData.status,
          user_intent: sessionData.userIntent,
          personalization: sessionData.personalization,
          collected_data: sessionData.collectedData,
          metadata: sessionData.metadata,
          created_at: this.ensureDate(sessionData.metadata.createdAt).toISOString(),
          updated_at: this.ensureDate(sessionData.metadata.updatedAt).toISOString(),
          last_active: this.ensureDate(sessionData.metadata.lastActive).toISOString(),
        });

      if (sessionError) {
        throw sessionError;
      }

      // 保存对话历史记录
      if (sessionData.conversationHistory.length > 0) {
        const conversationEntries = sessionData.conversationHistory.map(entry => ({
          id: entry.id,
          session_id: sessionData.id,
          timestamp: this.ensureDate(entry.timestamp).toISOString(),
          type: entry.type,
          agent: entry.agent,
          content: entry.content,
          metadata: entry.metadata || {},
          user_interaction: entry.userInteraction || null,
        }));

        const { error: conversationError } = await this.supabase
          .from('conversation_entries')
          .upsert(conversationEntries);

        if (conversationError) {
          throw conversationError;
        }
      }

      // 保存代理流程记录
      if (sessionData.agentFlow.length > 0) {
        const agentFlows = sessionData.agentFlow.map(flow => ({
          session_id: sessionData.id,
          agent_name: flow.agent,
          stage: flow.agent, // 使用 agent 作为 stage
          status: flow.status,
          data: flow.input || {},
          start_time: this.ensureDate(flow.startTime).toISOString(),
          end_time: flow.endTime ? this.ensureDate(flow.endTime).toISOString() : null,
        }));

        const { error: flowError } = await this.supabase
          .from('agent_flows')
          .upsert(agentFlows);

        if (flowError) {
          throw flowError;
        }
      }

    } catch (error) {
      console.warn(`⚠️ [存储] 保存会话失败 ${sessionData.id}:`, error);
      
      // 🔧 网络错误时不抛出异常，避免阻塞系统运行
      if (error instanceof Error && error.message.includes('fetch failed')) {
        console.warn('⚠️ [存储] 网络连接失败，会话仅保存在内存中');
        return;
      }
      
      throw error;
    }
  }

  /**
   * 删除单个会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        throw error;
      }
      
      console.log(`🗑️ [存储-Supabase] 删除会话: ${sessionId}`);
    } catch (error) {
      console.warn(`⚠️ [存储] 删除会话失败 ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * 清理过期的会话
   * @param expiredThreshold 过期时间阈值（毫秒）
   */
  async cleanupExpiredSessions(expiredThreshold: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const { userId, isAuthenticated } = await checkAuthStatus();
      if (!isAuthenticated) {
        return 0;
      }

      const expiredDate = new Date(Date.now() - expiredThreshold);
      
      const { data, error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'archived')
        .lt('last_active', expiredDate.toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      const cleanedCount = data?.length || 0;
      if (cleanedCount > 0) {
        console.log(`🧹 [存储-Supabase] 清理了 ${cleanedCount} 个过期会话`);
      }

      return cleanedCount;
    } catch (error) {
      console.warn('⚠️ [存储] 清理过期会话失败:', error);
      return 0;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    environment: 'supabase';
    storageLocation: string;
    totalSessions?: number;
    activeSessions?: number;
  }> {
    try {
      const { userId, isAuthenticated } = await checkAuthStatus();
      if (!isAuthenticated) {
        return {
          environment: 'supabase',
          storageLocation: 'Supabase Database',
          totalSessions: 0,
          activeSessions: 0,
        };
      }

      const { count: totalSessions } = await this.supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: activeSessions } = await this.supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      return {
        environment: 'supabase',
        storageLocation: 'Supabase Database',
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
      };
    } catch (error) {
      console.warn('⚠️ [存储] 获取存储统计失败:', error);
      return {
        environment: 'supabase',
        storageLocation: 'Supabase Database',
        totalSessions: 0,
        activeSessions: 0,
      };
    }
  }

  /**
   * 将Supabase数据转换为SessionData格式
   */
  private convertFromSupabase(supabaseSession: any): SessionData {
    return {
      id: supabaseSession.id,
      status: supabaseSession.status,
      userIntent: supabaseSession.user_intent || {},
      personalization: supabaseSession.personalization || {},
      collectedData: supabaseSession.collected_data || {},
      conversationHistory: (supabaseSession.conversation_entries || []).map((entry: any) => ({
        id: entry.id,
        timestamp: new Date(entry.timestamp),
        type: entry.type,
        agent: entry.agent,
        content: entry.content,
        metadata: entry.metadata || {},
        userInteraction: entry.user_interaction || undefined,
      })),
      agentFlow: (supabaseSession.agent_flows || []).map((flow: any) => ({
        id: flow.id,
        agentName: flow.agent_name,
        stage: flow.stage,
        status: flow.status,
        data: flow.data || {},
        startTime: new Date(flow.start_time),
        endTime: flow.end_time ? new Date(flow.end_time) : undefined,
      })),
      metadata: {
        ...supabaseSession.metadata,
        createdAt: new Date(supabaseSession.created_at),
        updatedAt: new Date(supabaseSession.updated_at),
        lastActive: new Date(supabaseSession.last_active),
      },
    };
  }
}

// 导出单例实例
export const sessionStorage = new SessionStorageManager(); 