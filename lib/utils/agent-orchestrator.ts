import { WelcomeAgent } from '@/lib/agents/welcome-agent';
import { InfoCollectionAgent } from '@/lib/agents/info-collection-agent';
import { PromptOutputAgent } from '@/lib/agents/prompt-output-agent';
import { CodingAgent } from '@/lib/agents/coding-agent';
import { BaseAgent } from '@/lib/agents/base-agent';
import { 
  SessionData, 
  CollectedResumeData, 
  ConversationEntry,
  SessionMetadata 
} from '@/lib/types/session';
import { 
  StreamableAgentResponse, 
  UserIntent, 
  PersonalizationProfile 
} from '@/lib/types/streaming';

/**
 * Agent编排器 - 协调多个Agent的工作流程
 */
export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;
  private currentAgent: string = '';
  private sessionManager: SessionManager; // 添加会话管理器

  constructor() {
    this.agents = new Map();
    this.sessionManager = new SessionManager();
    this.initializeAgents();
  }

  /**
   * 初始化所有Agents
   */
  private initializeAgents(): void {
    this.agents.set('welcome', new WelcomeAgent());
    this.agents.set('info_collection', new InfoCollectionAgent());
    this.agents.set('prompt_output', new PromptOutputAgent());
    this.agents.set('coding', new CodingAgent());
  }

  /**
   * 处理用户输入的流式响应
   */
  async* processUserInputStreaming(
    sessionId: string,
    userInput: string,
    sessionData?: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 获取或创建会话数据
      let session = sessionData || this.createNewSession(sessionId);
      
      // 确定当前应该使用的Agent
      const agentName = this.determineCurrentAgent(session, userInput);
      const agent = this.agents.get(agentName);
      
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      this.currentAgent = agentName;

      // 流式执行Agent处理
      const agentStartTime = new Date();
      
      for await (const response of agent.process({ user_input: userInput }, session)) {
        yield response;

        // 如果Agent完成，检查是否需要推进到下一个Agent
        if (response.system_state?.done) {
          const nextAgent = this.getNextAgent(agentName, response);
          
          if (nextAgent) {
            // 记录当前Agent完成
            this.recordAgentCompletion(session, agentName, agentStartTime, response);
            
            // 启动下一个Agent
            yield* this.transitionToNextAgent(nextAgent, session);
          } else {
            // 流程完成
            this.recordAgentCompletion(session, agentName, agentStartTime, response);
            session.status = 'completed';
          }
          break;
        }
      }

    } catch (error) {
      yield this.createErrorResponse(error as Error, sessionData);
    }
  }

  /**
   * 处理用户交互
   */
  async handleUserInteraction(
    sessionId: string,
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    const currentAgentName = this.getCurrentAgentFromSession(sessionData);
    const agent = this.agents.get(currentAgentName);
    
    if (!agent) {
      throw new Error(`Current agent ${currentAgentName} not found`);
    }

    // 委托给当前Agent处理交互
    const result = await agent.handleInteraction?.(interactionType, data, sessionData);
    
    // 根据交互结果决定下一步
    if (result?.action === 'advance') {
      const nextAgent = this.getNextAgentName(currentAgentName);
      if (nextAgent) {
        sessionData.metadata.progress.currentStage = nextAgent;
        return { ...result, nextAgent };
      }
    }
    
    return result;
  }

  /**
   * 推进到下一阶段
   */
  async advanceStage(sessionData: SessionData): Promise<string | null> {
    const currentStage = sessionData.metadata.progress.currentStage;
    const nextAgent = this.getNextAgentName(currentStage);
    
    if (nextAgent) {
      sessionData.metadata.progress.currentStage = nextAgent;
      sessionData.metadata.progress.completedStages.push(currentStage);
      sessionData.metadata.progress.percentage = this.calculateProgress(nextAgent);
    }
    
    return nextAgent;
  }

  /**
   * 继续当前阶段的信息收集
   */
  async continueCollection(sessionData: SessionData): Promise<void> {
    // 保持在当前阶段，但更新状态
    sessionData.metadata.updatedAt = new Date();
    sessionData.metadata.metrics.userInteractions++;
  }

  /**
   * 创建新会话
   */
  private createNewSession(sessionId: string): SessionData {
    return {
      id: sessionId,
      status: 'active',
      userIntent: {
        type: 'career_guidance',
        target_audience: 'internal_review',
        urgency: 'exploring',
        primary_goal: '了解需求'
      },
      personalization: {
        identity: {
          profession: 'other',
          experience_level: 'mid'
        },
        preferences: {
          style: 'modern',
          tone: 'professional',
          detail_level: 'detailed'
        },
        context: {}
      },
      collectedData: {
        personal: {},
        professional: { skills: [] },
        experience: [],
        education: [],
        projects: [],
        achievements: [],
        certifications: []
      },
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
   * 确定当前应该使用的Agent
   */
  private determineCurrentAgent(session: SessionData, userInput: string): string {
    const currentStage = session.metadata.progress.currentStage;
    
    // 基于当前阶段返回对应的Agent - 修复映射关系
    const stageAgentMap: Record<string, string> = {
      'welcome': 'welcome',
      'info_collection': 'info_collection',
      'page_design': 'prompt_output',
      'code_generation': 'coding'
    };
    
    return stageAgentMap[currentStage] || 'welcome';
  }

  /**
   * 获取下一个Agent
   */
  private getNextAgent(currentAgent: string, response: StreamableAgentResponse): string | null {
    if (response.system_state?.intent === 'advance') {
      return this.getNextAgentName(currentAgent);
    }
    return null;
  }

  /**
   * 获取下一个Agent名称
   */
  private getNextAgentName(currentAgent: string): string | null {
    const agentSequence = ['welcome', 'info_collection', 'prompt_output', 'coding'];
    const currentIndex = agentSequence.indexOf(currentAgent);
    
    if (currentIndex >= 0 && currentIndex < agentSequence.length - 1) {
      return agentSequence[currentIndex + 1];
    }
    
    return null;
  }

  /**
   * 转换到下一个Agent
   */
  private async* transitionToNextAgent(
    nextAgentName: string,
    session: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    const nextAgent = this.agents.get(nextAgentName);
    
    if (!nextAgent) {
      throw new Error(`Next agent ${nextAgentName} not found`);
    }

    // 更新会话状态
    session.metadata.progress.currentStage = nextAgentName;
    session.metadata.progress.percentage = this.calculateProgress(nextAgentName);
    session.metadata.metrics.agentTransitions++;

    this.currentAgent = nextAgentName;

    // 开始执行下一个Agent
    const agentStartTime = new Date();
    
    for await (const response of nextAgent.process({}, session)) {
      yield response;

      if (response.system_state?.done) {
        this.recordAgentCompletion(session, nextAgentName, agentStartTime, response);
        
        const subsequentAgent = this.getNextAgent(nextAgentName, response);
        if (subsequentAgent) {
          yield* this.transitionToNextAgent(subsequentAgent, session);
        }
        break;
      }
    }
  }

  /**
   * 记录Agent完成情况
   */
  private recordAgentCompletion(
    session: SessionData,
    agentName: string,
    startTime: Date,
    response: StreamableAgentResponse
  ): void {
    const endTime = new Date();
    const processingTime = endTime.getTime() - startTime.getTime();

    session.agentFlow.push({
      id: `${agentName}_${Date.now()}`,
      agent: agentName,
      startTime,
      endTime,
      status: 'completed',
      output: response,
      metrics: {
        processingTime,
        tokensUsed: 0, // 需要从实际LLM调用中获取
        apiCalls: 1
      }
    });

    // 更新进度
    if (!session.metadata.progress.completedStages.includes(agentName)) {
      session.metadata.progress.completedStages.push(agentName);
    }
  }

  /**
   * 计算进度百分比
   */
  private calculateProgress(currentStage: string): number {
    const stageProgress: Record<string, number> = {
      'welcome': 10,
      'info_collection': 40,
      'prompt_output': 70,
      'coding': 90
    };
    
    return stageProgress[currentStage] || 0;
  }

  /**
   * 从会话中获取当前Agent
   */
  private getCurrentAgentFromSession(session: SessionData): string {
    const currentStage = session.metadata.progress.currentStage;
    
    // 确保映射一致性
    const stageAgentMap: Record<string, string> = {
      'welcome': 'welcome',
      'info_collection': 'info_collection', 
      'prompt_output': 'prompt_output',  // 修复：统一使用 prompt_output
      'coding': 'coding'
    };
    
    return stageAgentMap[currentStage] || 'welcome';
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: Error, sessionData?: SessionData): StreamableAgentResponse {
    return {
      immediate_display: {
        reply: `抱歉，处理过程中出现了错误：${error.message}`,
        agent_name: 'system',
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'error',
        done: false,
        progress: sessionData?.metadata.progress.percentage || 0,
        current_stage: 'error_handling',
        metadata: {
          error: error.message,
          stack: error.stack
        }
      }
    };
  }

  /**
   * 获取会话数据
   */
  getSessionData(sessionId: string): SessionData | null {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(sessionData: SessionData): any {
    return {
      totalAgents: this.agents.size,
      completedAgents: sessionData.metadata.progress.completedStages.length,
      currentAgent: this.getCurrentAgentFromSession(sessionData),
      progress: sessionData.metadata.progress.percentage,
      totalTime: sessionData.metadata.metrics.totalTime,
      userInteractions: sessionData.metadata.metrics.userInteractions
    };
  }

  /**
   * 重置会话到指定阶段
   */
  resetToStage(sessionData: SessionData, stageName: string): void {
    const stageIndex = ['welcome', 'info_collection', 'prompt_output', 'coding'].indexOf(stageName);
    
    if (stageIndex >= 0) {
      sessionData.metadata.progress.currentStage = stageName;
      sessionData.metadata.progress.completedStages = sessionData.metadata.progress.completedStages.slice(0, stageIndex);
      sessionData.metadata.progress.percentage = this.calculateProgress(stageName);
      sessionData.metadata.updatedAt = new Date();
    }
  }
}

/**
 * 会话管理器
 */
class SessionManager {
  private sessions: Map<string, SessionData> = new Map();

  createSession(initialData?: Partial<SessionData>): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: SessionData = {
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

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  private getDefaultUserIntent(): UserIntent {
    return {
      type: 'formal_resume',
      urgency: 'this_week',
      target_audience: 'recruiters',
      primary_goal: '创建专业简历以求职'
    };
  }

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

  getSession(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId: string, session: SessionData): void {
    session.metadata.lastActive = new Date();
    session.metadata.updatedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // 清理过期会话（24小时未活动）
  cleanupExpiredSessions(): number {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24小时
    let cleanedCount = 0;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (now.getTime() - session.metadata.lastActive.getTime() > expiredThreshold) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  getAllActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values());
  }
}

// 导出单例实例
export const agentOrchestrator = new AgentOrchestrator();
