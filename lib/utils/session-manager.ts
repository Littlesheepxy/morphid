/**
 * 会话管理器 - Supabase版本
 * 
 * 负责会话的生命周期管理，包括创建、更新、删除和查询会话
 */

import { SessionData, CollectedResumeData } from '@/lib/types/session';
import { UserIntent, PersonalizationProfile } from '@/lib/types/streaming';
import { SessionStats, SessionHealth, RecoveryRecommendation, AgentFlowRecord } from './types/orchestrator';
import { sessionStorage } from './session-storage';
import { agentMappings } from './agent-mappings';

/**
 * 会话管理器类
 * 
 * 提供会话的CRUD操作和状态管理功能
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private readonly EXPIRED_THRESHOLD = 24 * 60 * 60 * 1000; // 24小时
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // 异步初始化，避免阻塞构造函数
    this.initializationPromise = this.initializeSessions();
  }

  /**
   * 确保会话管理器已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
  }

  /**
   * 初始化会话数据（从Supabase恢复）
   */
  private async initializeSessions(): Promise<void> {
    try {
      const loadedSessions = await sessionStorage.loadAllSessions();
      this.sessions = loadedSessions;
      
      if (this.sessions.size > 0) {
        console.log(`✅ [会话管理器] 初始化完成，从Supabase恢复了 ${this.sessions.size} 个会话`);
      }
    } catch (error) {
      console.warn('⚠️ [会话管理器] 初始化失败:', error);
    }
  }

  /**
   * 创建新会话
   * @param initialData 初始化数据
   * @returns 会话ID
   */
  async createSession(initialData?: Partial<SessionData>): Promise<string> {
    await this.ensureInitialized();
    
    const sessionId = this.generateSessionId();
    const session = this.createSessionData(sessionId, initialData);
    
    this.sessions.set(sessionId, session);
    await this.saveSessionsToStorage();
    
    console.log(`✅ [会话管理器] 创建新会话: ${sessionId}`);
    return sessionId;
  }

  /**
   * 获取会话数据
   * @param sessionId 会话ID
   * @returns 会话数据，不存在则返回null
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    await this.ensureInitialized();
    
    let session = this.sessions.get(sessionId);
    
    // 如果内存中没有找到，尝试重新加载
    if (!session) {
      console.log(`🔍 [会话管理器] 内存中未找到会话 ${sessionId}，尝试重新加载`);
      await this.initializeSessions();
      session = this.sessions.get(sessionId);
      
      if (session) {
        console.log(`✅ [会话管理器] 成功恢复会话 ${sessionId}`);
      } else {
        console.log(`❌ [会话管理器] 会话未找到 ${sessionId}`);
        this.logDebugInfo(sessionId);
      }
    }
    
    return session || null;
  }

  /**
   * 同步版本的获取会话数据（为了兼容性）
   * @param sessionId 会话ID
   * @returns 会话数据，不存在则返回null
   */
  getSessionSync(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 更新会话数据
   * @param sessionId 会话ID
   * @param session 会话数据
   */
  async updateSession(sessionId: string, session: SessionData): Promise<void> {
    await this.ensureInitialized();
    
    session.metadata.lastActive = new Date();
    session.metadata.updatedAt = new Date();
    
    this.sessions.set(sessionId, session);
    await this.saveSessionsToStorage();
  }

  /**
   * 删除会话
   * @param sessionId 会话ID
   * @returns 是否删除成功
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const deleted = this.sessions.delete(sessionId);
    
    if (deleted) {
      await sessionStorage.deleteSession(sessionId);
      console.log(`🗑️  [会话管理器] 删除会话: ${sessionId}`);
    }
    
    return deleted;
  }

  /**
   * 获取所有活跃会话
   * @returns 活跃会话列表
   */
  async getAllActiveSessions(): Promise<SessionData[]> {
    await this.ensureInitialized();
    
    const now = new Date();
    const activeSessions: SessionData[] = [];
    
    const sessionValues = Array.from(this.sessions.values());
    for (const session of sessionValues) {
      if (now.getTime() - session.metadata.lastActive.getTime() <= this.EXPIRED_THRESHOLD) {
        activeSessions.push(session);
      }
    }
    
    return activeSessions;
  }

  /**
   * 获取会话统计信息
   * @returns 统计信息
   */
  async getSessionStats(): Promise<SessionStats> {
    await this.ensureInitialized();
    
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;

    const sessionValues = Array.from(this.sessions.values());
    for (const session of sessionValues) {
      if (now.getTime() - session.metadata.lastActive.getTime() > this.EXPIRED_THRESHOLD) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions
    };
  }

  /**
   * 清理过期会话
   * @returns 清理的会话数量
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.ensureInitialized();
    
    const now = new Date();
    let cleanedCount = 0;
    const sessionEntries = Array.from(this.sessions.entries());

    for (const [sessionId, session] of sessionEntries) {
      if (now.getTime() - session.metadata.lastActive.getTime() > this.EXPIRED_THRESHOLD) {
        await this.deleteSession(sessionId);
        cleanedCount++;
      }
    }

    // 清理Supabase中的过期会话
    const storageCleanedCount = await sessionStorage.cleanupExpiredSessions(this.EXPIRED_THRESHOLD);
    cleanedCount += storageCleanedCount;

    if (cleanedCount > 0) {
      console.log(`🧹 [会话管理器] 清理了 ${cleanedCount} 个过期会话`);
    }

    return cleanedCount;
  }

  /**
   * 获取会话健康状态
   * @param sessionData 会话数据
   * @returns 健康状态评估
   */
  getSessionHealth(sessionData: SessionData): SessionHealth {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const metrics = sessionData.metadata.metrics;
    
    // 检查错误率
    if (metrics.errorsEncountered > 5) {
      issues.push('错误次数过多');
      suggestions.push('建议重新开始对话');
    } else if (metrics.errorsEncountered > 2) {
      issues.push('出现了一些错误');
      suggestions.push('如果问题持续，考虑重置到上一阶段');
    }
    
    // 检查会话时长
    const sessionDuration = Date.now() - sessionData.metadata.createdAt.getTime();
    if (sessionDuration > 30 * 60 * 1000) { // 超过30分钟
      issues.push('会话时长过长');
      suggestions.push('考虑保存当前进度并重新开始');
    }
    
    // 检查Agent流程状态
    const failedAgents = sessionData.agentFlow.filter(flow => flow.status === 'failed');
    if (failedAgents.length > 0) {
      issues.push(`${failedAgents.length}个Agent执行失败`);
      suggestions.push('尝试重试或重置到失败前的阶段');
    }
    
    // 检查用户交互频率
    if (metrics.userInteractions > 20) {
      issues.push('交互次数较多');
      suggestions.push('可能需要简化操作流程');
    }
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length >= 3 || metrics.errorsEncountered > 5) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }
    
    return { status, issues, suggestions };
  }

  /**
   * 获取错误恢复建议
   * @param sessionData 会话数据
   * @param error 错误对象
   * @returns 恢复建议
   */
  getRecoveryRecommendation(sessionData: SessionData, error: Error): RecoveryRecommendation {
    const health = this.getSessionHealth(sessionData);
    const errorMessage = error.message.toLowerCase();
    
    // 网络或API错误 - 建议重试
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        action: 'retry',
        reason: '网络或API错误，建议重试'
      };
    }
    
    // Agent处理错误 - 建议重置到当前阶段
    if (errorMessage.includes('agent') || errorMessage.includes('processing')) {
      return {
        action: 'reset',
        targetStage: sessionData.metadata.progress.currentStage,
        reason: 'Agent处理错误，建议重置当前阶段'
      };
    }
    
    // 会话状态错误或多次错误 - 建议重新开始
    if (health.status === 'critical' || sessionData.metadata.metrics.errorsEncountered > 3) {
      return {
        action: 'restart',
        reason: '会话状态不稳定，建议重新开始'
      };
    }
    
    // 默认建议重试
    return {
      action: 'retry',
      reason: '尝试重新执行当前操作'
    };
  }

  /**
   * 记录Agent执行完成
   * @param sessionData 会话数据
   * @param agentName Agent名称
   * @param startTime 开始时间
   * @param response 响应数据
   */
  recordAgentCompletion(
    sessionData: SessionData,
    agentName: string,
    startTime: Date,
    response: any
  ): void {
    const endTime = new Date();
    const processingTime = endTime.getTime() - startTime.getTime();
    const standardizedAgentName = agentMappings.standardizeAgentName(agentName);

    const flowRecord = {
      id: `${standardizedAgentName}_${Date.now()}`,
      agent: standardizedAgentName,
      startTime,
      endTime,
      status: 'completed' as const,
      output: response,
      metrics: {
        processingTime,
        tokensUsed: 0, // 需要从实际LLM调用中获取
        apiCalls: 1
      }
    };

    sessionData.agentFlow.push(flowRecord);

    // 更新进度
    const stageName = agentMappings.getStageFromAgent(agentName);
    if (!sessionData.metadata.progress.completedStages.includes(stageName)) {
      sessionData.metadata.progress.completedStages.push(stageName);
    }

    console.log(`✅ [会话管理器] Agent完成记录: ${agentName} -> ${standardizedAgentName}, 阶段: ${stageName}`);
  }

  /**
   * 保存会话到存储
   */
  private async saveSessionsToStorage(): Promise<void> {
    try {
      await sessionStorage.saveAllSessions(this.sessions);
    } catch (error) {
      console.warn('⚠️ [会话管理器] 保存会话失败:', error);
    }
  }

  /**
   * 同步到存储
   */
  async syncToStorage(): Promise<void> {
    await this.saveSessionsToStorage();
  }

  // ============== 私有方法 ==============

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 创建会话数据
   */
  private createSessionData(sessionId: string, initialData?: Partial<SessionData>): SessionData {
    return {
      id: sessionId,
      status: 'active',
      userIntent: initialData?.userIntent || this.getDefaultUserIntent(),
      personalization: initialData?.personalization || this.getDefaultPersonalization(),
      collectedData: initialData?.collectedData || this.getDefaultCollectedData(),
      conversationHistory: [],
      agentFlow: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
        version: '1.0.0',
        progress: {
          currentStage: 'welcome',
          completedStages: [],
          totalStages: 4,
          percentage: 0
        },
        metrics: {
          totalTime: 0,
          userInteractions: 0,
          agentTransitions: 0,
          errorsEncountered: 0
        },
        settings: {
          autoSave: true,
          reminderEnabled: false,
          privacyLevel: 'private'
        }
      }
    };
  }

  /**
   * 获取默认用户意图
   */
  private getDefaultUserIntent(): UserIntent {
    return {
      type: 'formal_resume',
      urgency: 'this_week',
      target_audience: 'recruiters',
      primary_goal: '创建专业简历以求职'
    };
  }

  /**
   * 获取默认个性化配置
   */
  private getDefaultPersonalization(): PersonalizationProfile {
    return {
      identity: {
        profession: 'other',
        experience_level: 'mid'
      },
      preferences: {
        style: 'modern',
        tone: 'professional',
        detail_level: 'detailed'
      },
      context: {
        current_situation: '准备求职或更新简历',
        career_goals: '获得更好的职业机会'
      }
    };
  }

  /**
   * 获取默认收集数据
   */
  private getDefaultCollectedData(): CollectedResumeData {
    return {
      personal: {},
      professional: {
        skills: []
      },
      experience: [],
      education: [],
      projects: [],
      achievements: [],
      certifications: []
    };
  }

  /**
   * 打印调试信息
   */
  private logDebugInfo(sessionId: string): void {
    const currentSessionIds = Array.from(this.sessions.keys());
    console.log(`🔍 [调试信息] 当前内存中的会话:`, currentSessionIds);
    console.log(`🔍 [调试信息] 查找的会话ID: ${sessionId}`);
    console.log(`🔍 [调试信息] 总会话数: ${this.sessions.size}`);
  }
}

// 导出单例实例
export const sessionManager = new SessionManager(); 