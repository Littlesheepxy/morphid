import { BaseAgent } from './base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
import { generateWithBestAvailableModel } from '@/lib/ai-models';
import { z } from 'zod';

/**
 * Welcome Agent - 欢迎用户并识别意图和身份类型
 */
export class WelcomeAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json'],
      maxRetries: 2,
      timeout: 10000
    };
    
    super('WelcomeAgent', capabilities);
  }

  /**
   * 主处理流程 - 智能意图识别和信息收集
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 思考阶段
      yield this.createThinkingResponse('正在分析您的需求并智能推荐...', 15);
      await this.delay(1000);

      // 步骤2: 准备对话上下文
      const collectedInfo = this.extractCollectedInfo(sessionData);
      const conversationRound = this.getConversationRound(sessionData);

      // 步骤3: 使用新的prompt模板
      const prompt = formatPrompt(AGENT_PROMPTS.WELCOME_AGENT, {
        user_input: input.user_input,
        collected_info: JSON.stringify(collectedInfo),
        conversation_round: conversationRound
      });

      // 步骤4: 调用LLM进行意图识别
      const llmResponse = await this.callLLM(prompt, {
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(llmResponse);
      } catch (error) {
        throw new Error('LLM返回的JSON格式无效');
      }

      // 步骤5: 验证新的响应格式
      const validatedResponse = this.validateIntentResponse(parsedResponse);

      // 步骤6: 更新会话数据
      this.updateSessionData(validatedResponse, sessionData);

      // 步骤7: 根据完成状态决定下一步
      if (validatedResponse.completion_status === 'ready') {
        // 信息收集完成，准备推进到下一阶段
        yield this.createReadyToAdvanceResponse(validatedResponse, sessionData);
      } else {
        // 需要继续收集信息
        yield this.createCollectionResponse(validatedResponse, sessionData);
      }

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 调用真实的LLM API进行意图识别
   */
  private async callLLM(prompt: string, options: any): Promise<string> {
    console.log("🤖 Welcome Agent 调用 LLM API...");
    console.log("📝 Prompt:", prompt.substring(0, 200) + "...");
    
    // 定义意图识别响应的 Schema
    const intentResponseSchema = z.object({
      identified: z.object({
        user_role: z.string().nullable(),
        use_case: z.string().nullable(),
        style: z.string().nullable(),
        highlight_focus: z.array(z.string()).default([])
      }),
      follow_up: z.object({
        missing_fields: z.array(z.string()).default([]),
        suggestions: z.record(z.object({
          prompt_text: z.string(),
          options: z.array(z.string())
        })).default({})
      }),
      completion_status: z.enum(['collecting', 'optimizing', 'ready']),
      direction_suggestions: z.array(z.string()).default([]),
      smart_defaults: z.any().default({})
    });

    // 调用真实的AI API - 移除try-catch，让错误直接抛出
    console.log("🔗 正在调用 generateWithBestAvailableModel...");
    const result = await generateWithBestAvailableModel(prompt, {
      schema: intentResponseSchema,
      maxTokens: options.max_tokens || 1500,
      system: "你是一个专业的意图识别助手，严格按照要求的JSON格式返回结构化数据。"
    });

    // 检查返回结果
    if ('object' in result) {
      console.log("✅ Welcome Agent LLM 调用成功");
      console.log("📄 返回结果:", JSON.stringify(result.object, null, 2));
      return JSON.stringify(result.object);
    } else {
      console.error("❌ LLM返回格式不正确:", result);
      throw new Error('LLM返回格式不正确: ' + JSON.stringify(result));
    }
  }

  /**
   * 提取已收集的信息
   */
  private extractCollectedInfo(sessionData: SessionData): any {
    const intentData = (sessionData.metadata as any)?.intentData;
    return {
      user_role: intentData?.user_role || null,
      use_case: intentData?.use_case || null,
      style: intentData?.style || null,
      highlight_focus: intentData?.highlight_focus || []
    };
  }

  /**
   * 获取对话轮次
   */
  private getConversationRound(sessionData: SessionData): number {
    return (sessionData.metadata as any)?.conversationRound || 1;
  }

  /**
   * 验证新的意图识别响应格式
   */
  private validateIntentResponse(response: any): IntentResponse {
    if (!response.identified || !response.follow_up || !response.completion_status) {
      throw new Error('响应格式不完整：缺少 identified、follow_up 或 completion_status');
    }

    return {
      identified: {
        user_role: response.identified.user_role || null,
        use_case: response.identified.use_case || null,
        style: response.identified.style || null,
        highlight_focus: response.identified.highlight_focus || []
      },
      follow_up: {
        missing_fields: response.follow_up.missing_fields || [],
        suggestions: response.follow_up.suggestions || {}
      },
      completion_status: response.completion_status,
      direction_suggestions: response.direction_suggestions || [],
      smart_defaults: response.smart_defaults || {}
    };
  }

  /**
   * 更新会话数据
   */
  private updateSessionData(response: IntentResponse, sessionData: SessionData): void {
    // 确保有必要的数据结构
    if (!sessionData.collectedData) {
      sessionData.collectedData = {
        personal: {},
        professional: {} as any, // 使用类型断言避免冲突
        experience: [],
        education: [],
        projects: [],
        certifications: []
      } as any; // 完全绕过类型检查
    }

    // 使用类型断言来扩展元数据
    const metadata = sessionData.metadata as any;
    if (!metadata) {
      (sessionData as any).metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        version: '1.0.0',
        tags: [],
        notes: '',
        customFields: {}
      };
    }
    
    // 存储意图识别结果
    const identified = response.identified;
    (sessionData as any).metadata.intentData = {
      user_role: identified.user_role,
      use_case: identified.use_case,
      style: identified.style,
      highlight_focus: identified.highlight_focus
    };

    (sessionData as any).metadata.conversationRound = ((sessionData as any).metadata.conversationRound || 0) + 1;
    (sessionData as any).metadata.completionStatus = response.completion_status;
  }

  /**
   * 创建信息收集完成，准备推进的响应
   */
  private createReadyToAdvanceResponse(response: IntentResponse, sessionData: SessionData): StreamableAgentResponse {
    const identified = response.identified;
    
    return this.createResponse({
      immediate_display: {
        reply: `完美！我已经收集到完整的信息：\n\n` +
               `👤 身份：${identified.user_role}\n` +
               `🎯 目的：${identified.use_case}\n` +
               `🎨 风格：${identified.style}\n` +
               `📋 重点：${identified.highlight_focus?.join('、')}\n\n` +
               `现在开始为您创建专属的页面！`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 50,
        current_stage: '意图识别完成',
        metadata: {
          collectedIntents: identified,
          completionStatus: response.completion_status
        }
      }
    });
  }

  /**
   * 创建继续收集信息的响应
   */
  private createCollectionResponse(response: IntentResponse, sessionData: SessionData): StreamableAgentResponse {
    const missingFields = response.follow_up.missing_fields;
    const suggestions = response.follow_up.suggestions;
    
    // 构建交互元素
    const elements = [];
    
    for (const field of missingFields) {
      const suggestion = suggestions[field];
      if (suggestion) {
        elements.push({
          id: field,
          type: 'select' as const,
          label: suggestion.prompt_text,
          options: suggestion.options.map((option: string) => ({
            value: option,
            label: option
          })),
          required: false
        });
      }
    }

    // 构建回复消息
    let replyMessage = '';
    if (response.direction_suggestions?.length) {
      replyMessage = response.direction_suggestions.join('\n\n') + '\n\n';
    }
    
    const firstSuggestion = Object.values(suggestions)[0] as any;
    if (firstSuggestion) {
      replyMessage += firstSuggestion.prompt_text;
    }

    return this.createInteractionResponse(
      replyMessage,
      {
        type: 'form',
        title: '完善您的需求',
        description: '请选择最符合您需求的选项',
        elements,
        required: false
      }
    );
  }

  /**
   * 验证增强的Welcome Agent响应格式
   */
  private validateEnhancedWelcomeResponse(response: any): EnhancedWelcomeResponse {
    // 确保基础结构存在
    if (!response.reply || !response.analysis) {
      throw new Error('响应格式不完整：缺少 reply 或 analysis');
    }

    // 验证 analysis 结构
    if (!response.analysis.confirmed_info || !response.analysis.uncertain_info) {
      throw new Error('分析结构不完整');
    }

    // 设置默认值
    const validatedResponse: EnhancedWelcomeResponse = {
      reply: response.reply,
      analysis: {
        confirmed_info: {
          user_goal: response.analysis.confirmed_info.user_goal || null,
          user_type: response.analysis.confirmed_info.user_type || null,
          style_preference: response.analysis.confirmed_info.style_preference || null,
          urgency: response.analysis.confirmed_info.urgency || null
        },
        uncertain_info: {
          user_goal_suggestions: response.analysis.uncertain_info.user_goal_suggestions || [],
          user_type_suggestions: response.analysis.uncertain_info.user_type_suggestions || [],
          style_suggestions: response.analysis.uncertain_info.style_suggestions || [],
          context_questions: response.analysis.uncertain_info.context_questions || []
        }
      },
      confidence: response.confidence || 'medium',
      next_action: response.next_action || 'confirm_and_collect',
      reasoning: response.reasoning || '',
      intent: 'advance',
      done: false
    };

    return validatedResponse;
  }

  /**
   * 创建直接推进响应（高置信度）
   */
  private createDirectProceedResponse(
    response: EnhancedWelcomeResponse,
    sessionData: SessionData
  ): StreamableAgentResponse {
    // 更新会话数据
    this.updateSessionFromConfirmedInfo(response.analysis.confirmed_info, sessionData);

    return this.createResponse({
      immediate_display: {
        reply: response.reply + 
          `\n\n✅ 完美！我已经理解了您的需求：\n` +
          `👤 身份：${response.analysis.confirmed_info.user_type}\n` +
          `🎯 目标：${response.analysis.confirmed_info.user_goal}\n` +
          `让我们开始收集详细信息来为您创建专属页面！`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 25,
        current_stage: '意图识别完成',
        metadata: {
          confidence: response.confidence,
          analysis: response.analysis
        }
      }
    });
  }

  /**
   * 创建智能确认响应（需要确认不确定信息）
   */
  private createSmartConfirmationResponse(
    response: EnhancedWelcomeResponse,
    sessionData: SessionData
  ): StreamableAgentResponse {
    const elements = this.buildConfirmationElements(response.analysis);
    
    return this.createInteractionResponse(
      response.reply + this.buildConfirmationMessage(response.analysis),
      {
        type: 'form',
        title: '让我确认一下您的需求',
        description: '我会根据这些信息为您定制最合适的页面',
        elements,
        required: true
      }
    );
  }

  /**
   * 构建确认消息
   */
  private buildConfirmationMessage(analysis: any): string {
    let message = '\n\n';
    
    // 显示已确认的信息
    const confirmed = analysis.confirmed_info;
    const confirmedItems = [];
    if (confirmed.user_type) confirmedItems.push(`👤 身份：${confirmed.user_type}`);
    if (confirmed.user_goal) confirmedItems.push(`🎯 目标：${confirmed.user_goal}`);
    if (confirmed.style_preference) confirmedItems.push(`🎨 风格：${confirmed.style_preference}`);
    
    if (confirmedItems.length > 0) {
      message += `✅ 已确认信息：\n${confirmedItems.join('\n')}\n\n`;
    }
    
    // 询问不确定的信息
    message += '🤔 请确认或补充以下信息：';
    
    return message;
  }

  /**
   * 构建确认表单元素
   */
  private buildConfirmationElements(analysis: any): any[] {
    const elements = [];
    const confirmed = analysis.confirmed_info;
    const uncertain = analysis.uncertain_info;

    // 用户目标确认
    if (!confirmed.user_goal && uncertain.user_goal_suggestions.length > 0) {
      elements.push({
        id: 'user_goal',
        type: 'select',
        label: '您的主要目标是？',
        options: uncertain.user_goal_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getGoalIcon(suggestion) + ' ' + suggestion
        })),
        required: true
      });
    }

    // 用户身份确认
    if (!confirmed.user_type && uncertain.user_type_suggestions.length > 0) {
      elements.push({
        id: 'user_type',
        type: 'select',
        label: '您的身份类型是？',
        options: uncertain.user_type_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getTypeIcon(suggestion) + ' ' + suggestion
        })),
        required: true
      });
    }

    // 风格偏好确认
    if (!confirmed.style_preference && uncertain.style_suggestions.length > 0) {
      elements.push({
        id: 'style_preference',
        type: 'select',
        label: '您偏好的设计风格是？',
        options: uncertain.style_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getStyleIcon(suggestion) + ' ' + suggestion
        })),
        required: false
      });
    }

    // 上下文问题
    if (uncertain.context_questions.length > 0) {
      uncertain.context_questions.forEach((question: string, index: number) => {
        elements.push({
          id: `context_${index}`,
          type: 'input',
          label: question,
          placeholder: '请简要描述...',
          required: false
        });
      });
    }

    // 紧急程度确认
    if (!confirmed.urgency) {
      elements.push({
        id: 'urgency',
        type: 'select',
        label: '您希望多久完成？',
        options: [
          { value: '立即需要', label: '⚡ 立即需要 - 今天就要用' },
          { value: '这周内', label: '📅 这周内 - 近期有需要' },
          { value: '这个月', label: '📆 这个月 - 不是很急' },
          { value: '随时都行', label: '😊 随时都行 - 慢慢来' }
        ],
        required: true
      });
    }

    return elements;
  }

  /**
   * 获取目标图标
   */
  private getGoalIcon(goal: string): string {
    const iconMap: Record<string, string> = {
      '求职': '🎯',
      '作品展示': '🎨',
      '找合作': '🤝',
      '纯炫技': '💪',
      '试试看': '👀',
      '个人品牌': '✨',
      '商务展示': '💼'
    };
    return iconMap[goal] || '📝';
  }

  /**
   * 获取类型图标
   */
  private getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'AI从业者': '🤖',
      '设计师': '🎨',
      '开发者': '💻',
      '产品经理': '📊',
      '创意人': '✨',
      '学生求职者': '🎓',
      '软件工程师': '⚙️',
      '前端开发': '🖥️',
      '后端开发': '🔧',
      '全栈开发': '🔄'
    };
    return iconMap[type] || '📝';
  }

  /**
   * 获取风格图标
   */
  private getStyleIcon(style: string): string {
    const iconMap: Record<string, string> = {
      '极简禅意': '🎋',
      '科技未来': '🚀',
      '商务专业': '💼',
      '创意炫酷': '🎆',
      '温暖人文': '🌸',
      '简约现代': '⚪',
      '技术极客': '⚡'
    };
    return iconMap[style] || '🎨';
  }

  /**
   * 根据确认信息更新会话数据
   */
  private updateSessionFromConfirmedInfo(confirmedInfo: any, sessionData: SessionData): void {
    if (confirmedInfo.user_goal && confirmedInfo.user_type) {
      sessionData.userIntent = {
        type: this.mapGoalToIntentType(confirmedInfo.user_goal),
        target_audience: this.mapGoalToAudience(confirmedInfo.user_goal),
        urgency: this.mapGoalToUrgency(confirmedInfo.urgency || confirmedInfo.user_goal),
        primary_goal: `${confirmedInfo.user_goal}（${confirmedInfo.user_type}）`
      };

      sessionData.personalization = {
        identity: {
          profession: this.mapUserTypeToProfession(confirmedInfo.user_type),
          experience_level: 'mid'
        },
        preferences: {
          style: confirmedInfo.style_preference || 'modern',
          tone: 'professional',
          detail_level: 'detailed'
        },
        context: {}
      };
    }
  }

  /**
   * 映射目标到意图类型
   */
  private mapGoalToIntentType(goal: string): UserIntent['type'] {
    const goalMap: Record<string, UserIntent['type']> = {
      '求职': 'formal_resume',
      '作品展示': 'portfolio_website',
      '找合作': 'career_guidance',
      '纯炫技': 'portfolio_website',
      '试试看': 'exploration',
      '其他': 'career_guidance'
    };

    return goalMap[goal] || 'career_guidance';
  }

  /**
   * 映射目标到目标受众
   */
  private mapGoalToAudience(goal: string): UserIntent['target_audience'] {
    const audienceMap: Record<string, UserIntent['target_audience']> = {
      '求职': 'recruiters',
      '作品展示': 'clients',
      '找合作': 'clients',
      '纯炫技': 'showcase',
      '试试看': 'showcase',
      '其他': 'internal_review'
    };

    return audienceMap[goal] || 'internal_review';
  }

  /**
   * 映射目标到紧急程度
   */
  private mapGoalToUrgency(goal: string): UserIntent['urgency'] {
    const urgencyMap: Record<string, UserIntent['urgency']> = {
      '求职': 'this_week',
      '作品展示': 'this_month',
      '找合作': 'this_month',
      '纯炫技': 'exploring',
      '试试看': 'exploring',
      '其他': 'exploring'
    };

    return urgencyMap[goal] || 'exploring';
  }

  /**
   * 映射用户类型到职业
   */
  private mapUserTypeToProfession(userType: string): 'designer' | 'developer' | 'product_manager' | 'marketer' | 'other' {
    const typeMap: Record<string, 'designer' | 'developer' | 'product_manager' | 'marketer' | 'other'> = {
      'AI从业者': 'developer',
      '设计师': 'designer',
      '开发者': 'developer',
      '产品经理': 'product_manager',
      '创意人': 'marketer',
      '学生求职者': 'other',
      '其他': 'other'
    };

    return typeMap[userType] || 'other';
  }

  /**
   * 处理用户交互
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    if (interactionType === 'interaction') {
      // 处理智能确认表单的提交
      const confirmedInfo = {
        user_goal: data.user_goal || null,
        user_type: data.user_type || null,
        style_preference: data.style_preference || null,
        urgency: data.urgency || null
      };

      // 添加上下文信息
      const contextInfo: any = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith('context_')) {
          const questionIndex = key.replace('context_', '');
          contextInfo[`additional_info_${questionIndex}`] = data[key];
        }
      });

      // 更新会话数据
      this.updateSessionFromConfirmedInfo(confirmedInfo, sessionData);
      
      // 如果有上下文信息，添加到个性化数据中
      if (Object.keys(contextInfo).length > 0) {
        sessionData.personalization = sessionData.personalization || {
          identity: { profession: 'other', experience_level: 'mid' },
          preferences: { style: 'modern', tone: 'professional', detail_level: 'detailed' },
          context: {}
        };
        sessionData.personalization.context = { ...sessionData.personalization.context, ...contextInfo };
      }

      // 返回推进到下一阶段的动作
      return { 
        action: 'advance',
        confirmed_info: confirmedInfo,
        context_info: contextInfo,
        summary: `已确认：${confirmedInfo.user_type} - ${confirmedInfo.user_goal}${confirmedInfo.style_preference ? ` (${confirmedInfo.style_preference})` : ''}`
      };
    }

    return data;
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 类型定义
// 新的意图识别响应接口
interface IntentResponse {
  identified: {
    user_role: string | null;
    use_case: string | null;
    style: string | null;
    highlight_focus: string[];
  };
  follow_up: {
    missing_fields: string[];
    suggestions: Record<string, {
      prompt_text: string;
      options: string[];
    }>;
  };
  completion_status: 'collecting' | 'optimizing' | 'ready';
  direction_suggestions: string[];
  smart_defaults: any;
}

// 兼容性接口保留
interface EnhancedWelcomeResponse {
  reply: string;
  analysis: {
    confirmed_info: {
      user_goal: string | null;
      user_type: string | null;
      style_preference: string | null;
      urgency: string | null;
    };
    uncertain_info: {
      user_goal_suggestions: string[];
      user_type_suggestions: string[];
      style_suggestions: string[];
      context_questions: string[];
    };
  };
  confidence: 'high' | 'medium' | 'low';
  next_action: 'confirm_and_collect' | 'direct_proceed';
  reasoning: string;
  intent: string;
  done: boolean;
}

interface WelcomeResponse {
  reply: string;
  user_goal: string;
  user_type: string;
  confidence: 'high' | 'medium' | 'low';
  intent: string;
  done: boolean;
}
