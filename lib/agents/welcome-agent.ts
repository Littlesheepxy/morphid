import { BaseAgent } from './base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
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
    console.log(`\n🤖 [Welcome Agent] 开始处理用户输入`);
    console.log(`📝 [用户输入] "${input.user_input}"`);
    console.log(`🆔 [会话ID] ${sessionData.id}`);
    
    try {
      // 🔧 修复：对话历史模式处理
      const sessionId = sessionData.id;
      const isFirstCall = !this.systemPromptSent.get(sessionId);
      
      console.log(`💬 [对话模式] ${isFirstCall ? '首次调用' : '继续对话'}`);
      console.log(`📊 [已收集信息] ${JSON.stringify(this.extractCollectedInfo(sessionData))}`);
      console.log(`🔢 [对话轮次] ${this.getConversationRound(sessionData)}`);
      
      let promptToSend;
      if (isFirstCall) {
        // 首次调用，构建完整的 prompt
        promptToSend = formatPrompt(AGENT_PROMPTS.WELCOME_AGENT, {
          user_input: input.user_input,
          collected_info: JSON.stringify(this.extractCollectedInfo(sessionData)),
          conversation_round: this.getConversationRound(sessionData)
        });
        console.log(`📄 [Prompt构建] 首次调用，使用完整模板 (长度: ${promptToSend.length})`);
      } else {
        // 后续调用，只传递用户输入和当前状态
        promptToSend = `用户输入: ${input.user_input}\n已收集信息: ${JSON.stringify(this.extractCollectedInfo(sessionData))}\n对话轮次: ${this.getConversationRound(sessionData)}`;
        console.log(`📄 [Prompt构建] 继续对话，使用简化格式 (长度: ${promptToSend.length})`);
      }

      // 调用真实LLM API进行意图识别  
      console.log(`🔗 [LLM调用] 准备调用AI API...`);
      const llmResponse = await this.callLLM(promptToSend, {
        schema_type: 'intentResponse',
        max_tokens: 1500,
        sessionId: sessionId
      });

      console.log(`✅ [LLM响应] 收到AI响应 (长度: ${llmResponse.length})`);
      const response: IntentResponse = this.validateIntentResponse(JSON.parse(llmResponse));
      
      console.log(`📋 [意图识别结果]`, {
        user_role: response.identified.user_role,
        use_case: response.identified.use_case,
        style: response.identified.style,
        highlight_focus: response.identified.highlight_focus,
        completion_status: response.completion_status,
        missing_fields: response.follow_up.missing_fields
      });
      
      // 更新会话数据
      this.updateSessionData(response, sessionData);
      console.log(`💾 [会话更新] 数据已更新到会话中`);

      // 🔧 修复：根据 completion_status 决定 intent
      if (response.completion_status === 'ready') {
        console.log(`🎉 [收集完成] 信息收集完整，准备推进到下一阶段`);
        // 收集完成，准备推进
        yield this.createReadyToAdvanceResponse(response, sessionData);
      } else {
        console.log(`🔄 [继续收集] 信息不完整，继续收集 (状态: ${response.completion_status})`);
        // 继续收集信息，不推进
        yield this.createCollectionResponse(response, sessionData);
      }

    } catch (error) {
      console.error(`❌ [Welcome Agent错误] 处理失败:`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 调用真实的LLM API进行意图识别
   */
  protected async callLLM(prompt: string, options: any): Promise<string> {
    console.log(`\n🤖 [Welcome Agent LLM] 开始调用`);
    console.log(`📝 [Prompt预览] ${prompt.substring(0, 200)}...`);

    // 🔧 修复：使用对话历史模式，避免重复发送 system prompt
    const sessionId = options.sessionId || 'default';
    const isFirstCall = !this.systemPromptSent.get(sessionId);
    
    console.log(`💬 [对话历史] 会话ID: ${sessionId}, 首次调用: ${isFirstCall}`);
    
    // 检查对话历史状态
    const historyExists = this.conversationHistory.has(sessionId);
    const historyLength = historyExists ? this.conversationHistory.get(sessionId)!.length : 0;
    console.log(`📚 [历史状态] 历史存在: ${historyExists}, 历史长度: ${historyLength}`);

    // 调用基类的 AI API 方法，使用对话历史
    console.log(`🔗 [API调用] 调用父类 callLLM 方法，使用对话历史模式`);
    const result = await super.callLLM(prompt, {
      schemaType: 'intentResponse',
      maxTokens: options.max_tokens || 1500,
      system: AGENT_PROMPTS.WELCOME_AGENT, // system prompt 只在首次发送
      sessionId: sessionId,
      useHistory: true // 🆕 启用对话历史
    });

    // 检查返回结果
    if ('object' in result) {
      console.log(`✅ [LLM成功] Welcome Agent LLM 调用成功`);
      console.log(`📊 [结果统计] 返回对象类型, 字段数: ${Object.keys(result.object).length}`);
      const resultString = JSON.stringify(result.object);
      console.log(`📄 [结果内容] ${resultString.substring(0, 300)}...`);
      return resultString;
    } else {
      console.error(`❌ [LLM错误] 返回格式不正确:`, result);
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
   * 创建继续收集信息的响应 - 使用动态生成的选项
   */
  private createCollectionResponse(response: IntentResponse, sessionData: SessionData): StreamableAgentResponse {
    const missingFields = response.follow_up.missing_fields;
    const suggestions = response.follow_up.suggestions;
    
    // 构建交互元素
    const elements = [];
    
    for (const field of missingFields) {
      const suggestion = suggestions[field];
      if (suggestion) {
        // 🔧 为每个字段添加自定义选项
        const options = suggestion.options.map((option: string) => ({
          value: option,
          label: option
        }));
        
        // 添加自定义选项
        if (field === 'user_role') {
          options.push({ value: 'custom', label: '✏️ 让我自己描述我的身份' });
        } else if (field === 'use_case') {
          options.push({ value: 'custom', label: '✏️ 我有其他目的' });
        } else if (field === 'style') {
          options.push({ value: 'custom', label: '🎨 我有其他风格想法' });
        } else {
          options.push({ value: 'custom', label: '✏️ 其他选项' });
        }

        elements.push({
          id: field,
          type: 'select' as const,
          label: suggestion.prompt_text,
          options,
          required: false
        });
      }
    }

    // 🔧 始终提供开放式输入选项
    elements.push({
      id: 'free_form_input',
      type: 'input' as const,
      label: '💭 或者，请用您自己的话来描述',
      placeholder: '例如：我是一个刚入行的UI设计师，想要创建一个能吸引客户的作品展示页面...',
      required: false
    });

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
        description: '您可以选择推荐选项，也可以用自己的话来描述',
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
   * 构建确认表单元素 - 基于LLM动态生成的选项
   */
  private buildConfirmationElements(analysis: any): any[] {
    const elements = [];
    const confirmed = analysis.confirmed_info;
    const uncertain = analysis.uncertain_info;

    // 🔧 动态生成：用户目标确认
    if (!confirmed.user_goal && uncertain.user_goal_suggestions?.length > 0) {
      elements.push({
        id: 'user_goal',
        type: 'select',
        label: '您的主要目标是？',
        options: uncertain.user_goal_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getGoalIcon(suggestion) + ' ' + suggestion
        })).concat([
          { value: 'custom', label: '✏️ 让我自己描述' }
        ]),
        required: true
      });
    }

    // 🔧 动态生成：用户身份确认
    if (!confirmed.user_type && uncertain.user_type_suggestions?.length > 0) {
      elements.push({
        id: 'user_type',
        type: 'select',
        label: '您的身份类型是？',
        options: uncertain.user_type_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getTypeIcon(suggestion) + ' ' + suggestion
        })).concat([
          { value: 'custom', label: '✏️ 其他身份' }
        ]),
        required: true
      });
    }

    // 🔧 动态生成：风格偏好确认
    if (!confirmed.style_preference && uncertain.style_suggestions?.length > 0) {
      elements.push({
        id: 'style_preference',
        type: 'select',
        label: '您偏好的设计风格是？',
        options: uncertain.style_suggestions.map((suggestion: string) => ({
          value: suggestion,
          label: this.getStyleIcon(suggestion) + ' ' + suggestion
        })).concat([
          { value: 'custom', label: '🎨 我有其他想法' }
        ]),
        required: false
      });
    }

    // 🔧 动态生成：上下文问题
    if (uncertain.context_questions?.length > 0) {
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

    // 🔧 如果需要自定义输入，添加文本框
    elements.push({
      id: 'custom_description',
      type: 'input',
      label: '💬 或者，您可以用自己的话来描述',
      placeholder: '例如：我是一个热爱AI的独立研究者，想要展示我的研究成果...',
      required: false
    });

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
    console.log(`\n🎯 [Welcome Agent交互] 处理用户交互`);
    console.log(`📝 [交互类型] ${interactionType}`);
    console.log(`📄 [交互数据] ${JSON.stringify(data)}`);
    
    if (interactionType === 'interaction') {
      // 处理表单提交，更新已收集的信息
      const currentInfo = this.extractCollectedInfo(sessionData);
      console.log(`📊 [交互前状态] ${JSON.stringify(currentInfo)}`);
      
      // 从表单数据中提取新信息
      const newInfo = {
        user_role: data.user_role || currentInfo.user_role,
        use_case: data.use_case || currentInfo.use_case, 
        style: data.style || currentInfo.style,
        highlight_focus: data.highlight_focus || currentInfo.highlight_focus
      };
      
      console.log(`📊 [交互后状态] ${JSON.stringify(newInfo)}`);
      
      // 更新会话数据中的意图信息
      const metadata = sessionData.metadata as any;
      metadata.intentData = newInfo;
      metadata.conversationRound = (metadata.conversationRound || 0) + 1;
      
      // 检查信息完整性 - 必需字段：user_role, use_case
      const isComplete = newInfo.user_role && newInfo.use_case;
      console.log(`🔍 [完整性检查] user_role: ${newInfo.user_role}, use_case: ${newInfo.use_case}, 完整: ${isComplete}`);
      
      if (isComplete) {
        console.log(`✅ [交互结果] 信息收集完整，允许推进到下一阶段`);
        metadata.completionStatus = 'ready';
        
        return { 
          action: 'advance',
          confirmed_info: newInfo,
          summary: `已确认：${newInfo.user_role} - ${newInfo.use_case}${newInfo.style ? ` (${newInfo.style})` : ''}`
        };
      } else {
        console.log(`⏸️  [交互结果] 信息不完整，继续收集`);
        metadata.completionStatus = 'collecting';
        
        return {
          action: 'continue',
          updated_info: newInfo,
          summary: `已更新部分信息，还需要：${!newInfo.user_role ? '身份类型' : ''}${!newInfo.use_case ? '使用目的' : ''}`
        };
      }
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
