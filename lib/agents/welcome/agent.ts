import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { WELCOME_AGENT_PROMPT, formatPrompt } from '@/lib/prompts';
import {
  IntentResponse,
  extractCollectedInfo,
  getConversationRound,
  getFieldDisplayName,
  getMissingFields,
  generateSuggestions,
  checkForCustomDescription,
  getCustomDescriptionPrompt,
  validateIntentResponse,
  updateSessionData,
  delay
} from './utils';

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
      // 检查是否是自定义描述后的用户输入
      const metadata = sessionData.metadata as any;
      if (metadata?.waitingForCustomDescription) {
        console.log(`✏️ [自定义描述处理] 用户已提供自定义描述`);
        yield* this.handleCustomDescriptionInput(input.user_input, sessionData);
        return;
      }

      // 对话历史模式处理
      const sessionId = sessionData.id;
      const isFirstCall = !this.systemPromptSent.get(sessionId);
      
      console.log(`💬 [对话模式] ${isFirstCall ? '首次调用' : '继续对话'}`);
      console.log(`📊 [已收集信息] ${JSON.stringify(extractCollectedInfo(sessionData))}`);
      console.log(`🔢 [对话轮次] ${getConversationRound(sessionData)}`);
      
      let promptToSend;
      if (isFirstCall) {
        promptToSend = formatPrompt(WELCOME_AGENT_PROMPT, {
          user_input: input.user_input,
          collected_info: JSON.stringify(extractCollectedInfo(sessionData)),
          conversation_round: getConversationRound(sessionData)
        });
        console.log(`📄 [Prompt构建] 首次调用，使用完整模板 (长度: ${promptToSend.length})`);
      } else {
        promptToSend = `用户输入: ${input.user_input}\n已收集信息: ${JSON.stringify(extractCollectedInfo(sessionData))}\n对话轮次: ${getConversationRound(sessionData)}`;
        console.log(`📄 [Prompt构建] 继续对话，使用简化格式 (长度: ${promptToSend.length})`);
      }

      // 调用LLM API进行意图识别  
      console.log(`🔗 [LLM调用] 准备调用AI API...`);
      const llmResponse = await this.callLLM(promptToSend, {
        schema_type: 'intentResponse',
        max_tokens: 1500,
        sessionId: sessionId
      });

      console.log(`✅ [LLM响应] 收到AI响应 (长度: ${llmResponse.length})`);
      const response: IntentResponse = validateIntentResponse(JSON.parse(llmResponse));
      
      console.log(`📋 [意图识别结果]`, {
        user_role: response.identified.user_role,
        use_case: response.identified.use_case,
        style: response.identified.style,
        highlight_focus: response.identified.highlight_focus,
        completion_status: response.completion_status,
        missing_fields: response.follow_up.missing_fields
      });
      
      // 更新会话数据
      updateSessionData(response, sessionData);
      console.log(`💾 [会话更新] 数据已更新到会话中`);

      // 根据 completion_status 决定 intent
      if (response.completion_status === 'ready') {
        console.log(`🎉 [收集完成] 信息收集完整，准备推进到下一阶段`);
        yield this.createReadyToAdvanceResponse(response, sessionData);
      } else {
        console.log(`🔄 [继续收集] 信息不完整，继续收集 (状态: ${response.completion_status})`);
        yield this.createCollectionResponse(response, sessionData);
      }

    } catch (error) {
      console.error(`❌ [Welcome Agent错误] 处理失败:`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 处理自定义描述的用户输入 - 支持流式输出
   */
  private async* handleCustomDescriptionInput(
    userDescription: string,
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`✏️ [自定义描述处理] 开始处理用户的自定义描述`);

    const metadata = sessionData.metadata as any;
    const customField = metadata.waitingForCustomDescription;
    
    // 清除等待状态
    delete metadata.waitingForCustomDescription;

    // 更新对应字段的信息
    const currentInfo = extractCollectedInfo(sessionData);
    const updatedInfo = { ...currentInfo };
    updatedInfo[customField] = userDescription;

    // 保存到会话数据
    metadata.intentData = updatedInfo;
    metadata.conversationRound = (metadata.conversationRound || 0) + 1;

    // 流式输出确认消息
    const confirmationMessage = `太好了！我已经记录了您的${getFieldDisplayName(customField)}：\n\n"${userDescription}"\n\n现在让我检查一下还需要什么信息...`;
    
    yield* this.streamResponse(confirmationMessage, sessionData);

    // 检查是否还需要其他信息
    const missingFields = getMissingFields(updatedInfo);
    
    if (missingFields.length === 0) {
      // 信息收集完成
      metadata.completionStatus = 'ready';
      
      const completeMessage = `\n完美！现在我已经收集到了完整的信息：\n\n• 身份：${updatedInfo.user_role}\n• 目的：${updatedInfo.use_case}\n${updatedInfo.style ? `• 风格：${updatedInfo.style}` : ''}\n\n开始为您创建专属页面！`;
      
      yield* this.streamResponse(completeMessage, sessionData, 'advance', true);
    } else {
      // 还需要继续收集
      const continueMessage = `\n还需要了解一下您的${getFieldDisplayName(missingFields[0])}。请告诉我：`;
      
      yield* this.streamResponse(continueMessage, sessionData);
      
      // 继续收集剩余信息
      yield this.createCollectionResponse({
        identified: updatedInfo,
        follow_up: {
          missing_fields: missingFields,
          suggestions: generateSuggestions(missingFields[0])
        },
        completion_status: 'collecting',
        direction_suggestions: [],
        smart_defaults: {}
      }, sessionData);
    }
  }

  /**
   * 流式输出响应消息
   */
  private async* streamResponse(
    message: string, 
    sessionData: SessionData, 
    intent: string = 'processing',
    done: boolean = false
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    const characters = message.split('');
    let accumulatedText = '';
    
    for (let i = 0; i < characters.length; i++) {
      accumulatedText += characters[i];
      
      yield this.createResponse({
        immediate_display: {
          reply: accumulatedText,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent,
          done: false,
          progress: Math.round((i + 1) / characters.length * 100),
          current_stage: '输出中...',
          metadata: {
            streaming: true,
            character_index: i + 1,
            total_characters: characters.length
          }
        }
      });
      
      await delay(30);
    }
    
    // 发送最终完成状态
    yield this.createResponse({
      immediate_display: {
        reply: accumulatedText,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent,
        done,
        progress: 100,
        current_stage: done ? '完成' : '等待用户输入',
        metadata: {
          streaming: false,
          stream_complete: true
        }
      }
    });
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
        const options = suggestion.options.map((option: string) => ({
          value: option,
          label: option
        }));

        elements.push({
          id: field,
          type: 'select' as const,
          label: suggestion.prompt_text,
          options,
          required: false
        });
      }
    }

    // 始终提供开放式输入选项
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
   * 调用真实的LLM API进行意图识别
   */
  protected async callLLM(prompt: string, options: any): Promise<string> {
    console.log(`🤖 [Welcome Agent LLM] 开始调用`);

    const sessionId = options.sessionId || 'default';
    
    // 调用基类的 AI API 方法，使用对话历史
    const result = await super.callLLM(prompt, {
      schemaType: 'intentResponse',
      maxTokens: options.max_tokens || 1500,
              system: WELCOME_AGENT_PROMPT,
      sessionId: sessionId,
      useHistory: true
    });

    if ('object' in result) {
      console.log(`✅ [LLM成功] Welcome Agent LLM 调用成功`);
      const resultString = JSON.stringify(result.object);
      return resultString;
    } else {
      console.error(`❌ [LLM错误] 返回格式不正确:`, result);
      throw new Error('LLM返回格式不正确: ' + JSON.stringify(result));
    }
  }

  /**
   * 处理用户交互
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    console.log(`🎯 [Welcome Agent交互] 处理用户交互`);
    console.log(`📝 [交互类型] ${interactionType}`);
    
    if (interactionType === 'interaction') {
      // 检测"让我自己描述"选择
      const hasCustomDescription = checkForCustomDescription(data);
      if (hasCustomDescription.needsDescription) {
        console.log(`✏️ [自定义描述] 检测到用户选择自定义描述: ${hasCustomDescription.field}`);
        
        // 更新部分信息到会话
        const currentInfo = extractCollectedInfo(sessionData);
        const partialInfo = { ...currentInfo };
        
        // 保存非自定义的选择
        if (data.user_role && data.user_role !== 'custom') partialInfo.user_role = data.user_role;
        if (data.use_case && data.use_case !== 'custom') partialInfo.use_case = data.use_case;
        if (data.style && data.style !== 'custom') partialInfo.style = data.style;
        
        // 更新会话数据
        const metadata = sessionData.metadata as any;
        metadata.intentData = partialInfo;
        metadata.conversationRound = (metadata.conversationRound || 0) + 1;
        
        return {
          action: 'request_custom_description',
          field: hasCustomDescription.field,
          current_info: partialInfo,
          description_prompt: getCustomDescriptionPrompt(hasCustomDescription.field || 'user_role'),
          summary: `用户选择自定义描述 ${hasCustomDescription.field}，等待详细说明`
        };
      }
      
      // 处理表单提交，更新已收集的信息
      const currentInfo = extractCollectedInfo(sessionData);
      
      // 从表单数据中提取新信息
      const newInfo = {
        user_role: data.user_role || currentInfo.user_role,
        use_case: data.use_case || currentInfo.use_case, 
        style: data.style || currentInfo.style,
        highlight_focus: data.highlight_focus || currentInfo.highlight_focus
      };
      
      // 更新会话数据中的意图信息
      const metadata = sessionData.metadata as any;
      metadata.intentData = newInfo;
      metadata.conversationRound = (metadata.conversationRound || 0) + 1;
      
      // 检查信息完整性
      const isComplete = newInfo.user_role && newInfo.use_case && 
                        newInfo.user_role !== 'custom' && newInfo.use_case !== 'custom';
      
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
          summary: `已更新部分信息，还需要：${!newInfo.user_role || newInfo.user_role === 'custom' ? '身份类型' : ''}${!newInfo.use_case || newInfo.use_case === 'custom' ? '使用目的' : ''}`
        };
      }
    }

    return data;
  }
} 