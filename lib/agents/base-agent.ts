import { 
  StreamableAgentResponse, 
  AgentCapabilities, 
  RoutingDecision,
  UserIntent,
  PersonalizationProfile
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';

/**
 * 基础Agent抽象类
 * 提供流式输出、交互处理和会话管理的基础功能
 */
export abstract class BaseAgent {
  protected name: string;
  protected capabilities: AgentCapabilities;
  protected retryCount: number = 0;

  constructor(name: string, capabilities: AgentCapabilities) {
    this.name = name;
    this.capabilities = capabilities;
  }

  /**
   * 获取Agent名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取Agent能力
   */
  getCapabilities(): AgentCapabilities {
    return this.capabilities;
  }

  /**
   * 主要处理方法 - 支持流式输出
   * 子类必须实现此方法
   */
  abstract process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown>;

  /**
   * 验证输入数据
   * 子类可以重写此方法来实现自定义验证
   */
  protected validateInput(input: any): { valid: boolean; errors?: string[] } {
    return { valid: true };
  }

  /**
   * 处理用户交互响应
   * 子类可以重写此方法来处理特定的交互类型
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    return data;
  }

  /**
   * 决定下一个Agent
   * 子类可以重写此方法来实现智能路由
   */
  protected determineNextAgent(
    sessionData: SessionData,
    currentOutput?: StreamableAgentResponse
  ): RoutingDecision | null {
    return null;
  }

  /**
   * 生成基础响应结构
   */
  protected createResponse(partial: Partial<StreamableAgentResponse> = {}): StreamableAgentResponse {
    const timestamp = new Date().toISOString();
    
    return {
      immediate_display: {
        reply: '',
        agent_name: this.name,
        timestamp,
        ...partial.immediate_display
      },
      system_state: {
        intent: 'processing',
        done: false,
        ...partial.system_state
      },
      session_context: {
        session_id: '',
        ...partial.session_context
      },
      ...partial
    };
  }

  /**
   * 创建思考中的响应
   */
  protected createThinkingResponse(thinking: string, progress?: number): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: '',
        thinking,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'thinking',
        done: false,
        progress,
        current_stage: '分析中...'
      }
    });
  }

  /**
   * 创建交互请求响应
   */
  protected createInteractionResponse(
    reply: string,
    interaction: StreamableAgentResponse['interaction']
  ): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      interaction,
      system_state: {
        intent: 'awaiting_interaction',
        done: false
      }
    });
  }

  /**
   * 创建完成响应
   */
  protected createCompletionResponse(
    reply: string,
    nextAgent?: string,
    metadata?: Record<string, any>
  ): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'completed',
        done: true,
        next_agent: nextAgent,
        metadata,
        progress: 100
      }
    });
  }

  /**
   * 错误处理
   */
  protected async handleError(
    error: Error,
    sessionData: SessionData,
    context?: Record<string, any>
  ): Promise<StreamableAgentResponse> {
    console.error(`Error in ${this.name}:`, error);
    
    this.retryCount++;
    
    if (this.retryCount >= this.capabilities.maxRetries) {
      return this.createResponse({
        immediate_display: {
          reply: `抱歉，处理过程中遇到了问题。错误信息：${error.message}`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'error',
          done: true,
          metadata: { error: error.message, retryCount: this.retryCount }
        }
      });
    }

    return this.createResponse({
      immediate_display: {
        reply: `遇到临时问题，正在重试... (${this.retryCount}/${this.capabilities.maxRetries})`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'retrying',
        done: false,
        metadata: { error: error.message, retryCount: this.retryCount }
      }
    });
  }

  /**
   * 延迟工具函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 模拟流式输出 - 将长文本分块输出
   */
  protected async* streamText(
    text: string,
    chunkSize: number = 10,
    delayMs: number = 50
  ): AsyncGenerator<string, void, unknown> {
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      yield chunk;
      if (delayMs > 0) {
        await this.delay(delayMs);
      }
    }
  }

  /**
   * 生成个性化回复
   */
  protected generatePersonalizedReply(
    baseReply: string,
    personalization?: PersonalizationProfile
  ): string {
    if (!personalization) return baseReply;

    const { identity, preferences } = personalization;
    
    // 根据身份调整语调
    if (identity.profession === 'designer') {
      return baseReply.replace(/技术/g, '设计').replace(/开发/g, '创作');
    } else if (identity.profession === 'developer') {
      return baseReply.replace(/设计/g, '技术实现').replace(/创意/g, '解决方案');
    }

    // 根据偏好调整详细程度
    if (preferences.detail_level === 'concise') {
      return this.makeConcise(baseReply);
    } else if (preferences.detail_level === 'detailed') {
      return this.makeDetailed(baseReply);
    }

    return baseReply;
  }

  /**
   * 简化文本
   */
  private makeConcise(text: string): string {
    return text
      .replace(/另外，/g, '')
      .replace(/此外，/g, '')
      .replace(/需要注意的是，/g, '')
      .split('。')
      .slice(0, 3)
      .join('。') + '。';
  }

  /**
   * 详化文本
   */
  private makeDetailed(text: string): string {
    return text + '\n\n💡 我会根据您的具体情况提供更详细的建议和指导。';
  }

  /**
   * 获取进度百分比
   */
  protected calculateProgress(currentStep: number, totalSteps: number): number {
    return Math.round((currentStep / totalSteps) * 100);
  }

  /**
   * 检查会话超时
   */
  protected isSessionExpired(sessionData: SessionData): boolean {
    const now = new Date();
    const lastActivity = sessionData.metadata.lastActive;
    const timeoutMs = this.capabilities.timeout;
    
    return now.getTime() - lastActivity.getTime() > timeoutMs;
  }

  /**
   * 更新会话元数据
   */
  protected updateSessionMetadata(sessionData: SessionData): void {
    sessionData.metadata.lastActive = new Date();
    sessionData.metadata.metrics.userInteractions++;
  }
}

/**
 * 工厂方法创建Agent实例
 */
export interface AgentFactory {
  createAgent(type: string, config?: any): BaseAgent;
  getAvailableAgents(): string[];
}

/**
 * Agent注册表
 */
export class AgentRegistry {
  private agents: Map<string, typeof BaseAgent> = new Map();
  private instances: Map<string, BaseAgent> = new Map();

  /**
   * 注册Agent类
   */
  register(name: string, agentClass: typeof BaseAgent): void {
    this.agents.set(name, agentClass);
  }

  /**
   * 创建Agent实例
   */
  create(name: string, ...args: any[]): BaseAgent | null {
    const AgentClass = this.agents.get(name);
    if (!AgentClass) {
      return null;
    }

    // 检查是否已有实例（单例模式）
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const instance = new (AgentClass as any)(...args);
    this.instances.set(name, instance);
    return instance;
  }

  /**
   * 获取可用的Agent列表
   */
  getAvailable(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 清理实例缓存
   */
  clearInstances(): void {
    this.instances.clear();
  }
}

// 全局Agent注册表实例
export const agentRegistry = new AgentRegistry();
