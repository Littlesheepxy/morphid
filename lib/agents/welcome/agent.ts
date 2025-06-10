import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import {
  IntentResponse,
  extractCollectedInfo,
  getConversationRound,
  getFieldDisplayName,
  getMissingFields,
  checkForCustomDescription,
  getCustomDescriptionPrompt,
  validateIntentResponse,
  updateSessionData,
  delay
} from './utils';
import { 
  INTENT_RECOGNITION_PROMPT, 
  RECOMMENDATION_GUIDE_PROMPT,
  INTENT_RECOGNITION_CONFIG,
  RECOMMENDATION_GUIDE_CONFIG
} from '@/lib/prompts/welcome';
import { generateWithModel } from '@/lib/ai-models';

/**
 * Welcome Agent - 简化版：专注大模型推荐
 * 仅使用双Prompt智能架构，移除所有本地算法推荐
 */

// 类型定义
interface WelcomeCollectedInfo {
  user_role: string | null;
  use_case: string | null;
  style: string | null;
  highlight_focus: string[];
}

interface IntentRecognitionResult {
  identified: WelcomeCollectedInfo;
  recognition_confidence: {
    user_role: number;
    use_case: number;
    style: number;
    highlight_focus: number;
  };
  missing_fields: string[];
  next_collection_priority: string | null;
  completion_status: 'collecting' | 'ready';
  user_input_type: 'specific' | 'ambiguous' | 'clarification' | 'complete';
  extraction_notes: string;
}

interface RecommendationGuideResult {
  guide_response: {
    prompt_text: string;
    recommendations: {
      options: string[];
      reasoning: string;
      personalization_notes: string;
    };
  };
  conversation_context: {
    current_field: string;
    progress_percentage: number;
    next_steps: string;
  };
  smart_suggestions: {
    why_these_options: string;
    user_benefits: string;
  };
}

interface WelcomeAgentResponse {
  identified: WelcomeCollectedInfo;
  follow_up: {
    missing_fields: string[];
    suggestions: {
      [key: string]: {
        prompt_text: string;
        options: string[];
        reasoning: string;
      };
    };
  };
  completion_status: 'collecting' | 'ready';
  direction_suggestions: string[];
  smart_defaults: Record<string, any>;
  // 调试信息
  debug_info?: {
    intent_recognition: IntentRecognitionResult;
    recommendation_guide: RecommendationGuideResult;
    processing_notes: string;
  };
}

/**
 * 🎯 步骤1：意图识别 - 专注于理解用户输入
 */
async function recognizeUserIntent(
  userInput: string,
  collectedInfo: WelcomeCollectedInfo,
  conversationRound: number = 1,
  provider: 'openai' | 'claude' = 'claude'
): Promise<IntentRecognitionResult> {
  try {
    // 构建prompt
    const prompt = INTENT_RECOGNITION_PROMPT
      .replace('{user_input}', userInput)
      .replace('{collected_info}', JSON.stringify(collectedInfo, null, 2))
      .replace('{conversation_round}', conversationRound.toString());

    // 使用统一的AI模型接口
    const result = await generateWithModel(
      provider,
      provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
      prompt,
      {
        maxTokens: INTENT_RECOGNITION_CONFIG.max_tokens,
      }
    );

    // 检查返回类型并提取文本
    const response = 'text' in result ? result.text : 
                    'object' in result ? JSON.stringify(result.object) : '';

    // 解析JSON响应
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('意图识别响应格式不正确，未找到JSON块');
    }

    const intentResult = JSON.parse(jsonMatch[1]) as IntentRecognitionResult;
    
    // 验证结果结构
    if (!intentResult.identified || !intentResult.completion_status) {
      throw new Error('意图识别结果缺少必要字段');
    }

    return intentResult;

  } catch (error) {
    console.error('意图识别失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 降级处理：返回基本结构
    return {
      identified: collectedInfo,
      recognition_confidence: {
        user_role: 0.1,
        use_case: 0.1,
        style: 0.1,
        highlight_focus: 0.1
      },
      missing_fields: ['user_role', 'use_case', 'style', 'highlight_focus'].filter(
        field => !collectedInfo[field as keyof WelcomeCollectedInfo] || 
        (Array.isArray(collectedInfo[field as keyof WelcomeCollectedInfo]) && 
         (collectedInfo[field as keyof WelcomeCollectedInfo] as any[]).length === 0)
      ),
      next_collection_priority: 'user_role',
      completion_status: 'collecting',
      user_input_type: 'ambiguous',
      extraction_notes: `意图识别出错: ${errorMessage}, 使用降级处理`
    };
  }
}

/**
 * 🎨 步骤2：推荐引导 - 专注于生成个性化推荐
 */
async function generateRecommendationGuide(
  recognitionResult: IntentRecognitionResult,
  conversationHistory: string = '',
  provider: 'openai' | 'claude' = 'claude'
): Promise<RecommendationGuideResult> {
  try {
    // 确定当前收集阶段
    const currentStage = recognitionResult.next_collection_priority || 'complete';
    
    // 构建prompt
    const prompt = RECOMMENDATION_GUIDE_PROMPT
      .replace('{recognition_result}', JSON.stringify(recognitionResult, null, 2))
      .replace('{conversation_history}', conversationHistory)
      .replace('{current_stage}', currentStage);

    // 使用统一的AI模型接口
    const result = await generateWithModel(
      provider,
      provider === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022',
      prompt,
      {
        maxTokens: RECOMMENDATION_GUIDE_CONFIG.max_tokens,
      }
    );

    // 检查返回类型并提取文本
    const response = 'text' in result ? result.text : 
                    'object' in result ? JSON.stringify(result.object) : '';

    // 解析JSON响应
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('推荐引导响应格式不正确，未找到JSON块');
    }

    const guideResult = JSON.parse(jsonMatch[1]) as RecommendationGuideResult;
    
    // 验证结果结构
    if (!guideResult.guide_response || !guideResult.conversation_context) {
      throw new Error('推荐引导结果缺少必要字段');
    }

    return guideResult;

  } catch (error) {
    console.error('推荐引导生成失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 降级处理：生成基本推荐
    const defaultOptions = getBasicDefaultOptions(recognitionResult.next_collection_priority);
    
    return {
      guide_response: {
        prompt_text: "让我来为您推荐一些选项，请选择最适合的：",
        recommendations: {
          options: defaultOptions,
          reasoning: `推荐引导出错: ${errorMessage}, 使用默认选项`,
          personalization_notes: "由于技术问题，暂时使用通用选项"
        }
      },
      conversation_context: {
        current_field: recognitionResult.next_collection_priority || 'user_role',
        progress_percentage: calculateProgress(recognitionResult.identified),
        next_steps: "请选择一个选项继续"
      },
      smart_suggestions: {
        why_these_options: "基于通用场景的标准选项",
        user_benefits: "帮助您快速开始配置"
      }
    };
  }
}

/**
 * 🔧 辅助函数：获取基本默认选项
 */
function getBasicDefaultOptions(fieldName: string | null): string[] {
  const defaultOptionsMap: Record<string, string[]> = {
    user_role: ["前端开发者", "设计师", "产品经理", "学生", "✍️ 自己描述我的身份"],
    use_case: ["求职展示", "作品展示", "项目展示", "个人品牌", "✍️ 我有其他目的"],
    style: ["简洁专业", "创意时尚", "现代商务", "个性独特", "✍️ 我有其他风格想法"],
    highlight_focus: ["技能能力", "项目经验", "个人特色", "成长经历", "✍️ 我有其他想突出的亮点"]
  };
  
  return defaultOptionsMap[fieldName || 'user_role'] || defaultOptionsMap.user_role;
}

/**
 * 🧮 辅助函数：计算进度百分比
 */
function calculateProgress(collectedInfo: WelcomeCollectedInfo): number {
  const totalFields = 4;
  let completedFields = 0;
  
  if (collectedInfo.user_role) completedFields++;
  if (collectedInfo.use_case) completedFields++;
  if (collectedInfo.style) completedFields++;
  if (collectedInfo.highlight_focus && collectedInfo.highlight_focus.length > 0) completedFields++;
  
  return Math.round((completedFields / totalFields) * 100);
}

/**
 * 🔄 主要函数：Welcome Agent 双Prompt处理流程
 */
export async function processWelcomeAgent(
  userInput: string,
  collectedInfo: WelcomeCollectedInfo = {
    user_role: null,
    use_case: null,
    style: null,
    highlight_focus: []
  },
  conversationRound: number = 1,
  options: {
    provider?: 'openai' | 'claude';
    includeDebugInfo?: boolean;
    conversationHistory?: string;
  } = {}
): Promise<WelcomeAgentResponse> {
  const { 
    provider = 'claude', 
    includeDebugInfo = false,
    conversationHistory = ''
  } = options;

  try {
    // 🎯 步骤1：意图识别
    console.log('🎯 开始意图识别...');
    const intentResult = await recognizeUserIntent(
      userInput, 
      collectedInfo, 
      conversationRound, 
      provider
    );

    // 🎨 步骤2：推荐引导生成（只有在需要继续收集时才调用）
    let guideResult: RecommendationGuideResult | null = null;
    
    if (intentResult.completion_status === 'collecting') {
      console.log('🎨 开始推荐引导生成...');
      guideResult = await generateRecommendationGuide(
        intentResult,
        conversationHistory,
        provider
      );
    }

    // 🔄 合并结果，转换为标准响应格式
    const response: WelcomeAgentResponse = {
      identified: intentResult.identified,
      follow_up: {
        missing_fields: intentResult.missing_fields,
        suggestions: guideResult ? {
          [intentResult.next_collection_priority || 'user_role']: {
            prompt_text: guideResult.guide_response.prompt_text,
            options: guideResult.guide_response.recommendations.options,
            reasoning: guideResult.guide_response.recommendations.reasoning
          }
        } : {}
      },
      completion_status: intentResult.completion_status,
      direction_suggestions: guideResult ? [
        guideResult.conversation_context.next_steps,
        guideResult.smart_suggestions.why_these_options
      ] : intentResult.completion_status === 'ready' ? [
        "信息收集完成！现在可以开始生成您的个性化页面了。"
      ] : [],
      smart_defaults: {}
    };

    // 添加调试信息（如果需要）
    if (includeDebugInfo && guideResult) {
      response.debug_info = {
        intent_recognition: intentResult,
        recommendation_guide: guideResult,
        processing_notes: `意图识别置信度: 平均${Object.values(intentResult.recognition_confidence).reduce((a, b) => a + b, 0) / 4}, 用户输入类型: ${intentResult.user_input_type}`
      };
    }

    console.log('✅ Welcome Agent 处理完成');
    return response;

  } catch (error) {
    console.error('❌ Welcome Agent 处理失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 完全降级处理
    return {
      identified: collectedInfo,
      follow_up: {
        missing_fields: ['user_role'],
        suggestions: {
          user_role: {
            prompt_text: "很抱歉，系统遇到了一些问题。不过我们仍然可以开始！请告诉我您的身份背景：",
            options: getBasicDefaultOptions('user_role'),
            reasoning: `系统错误降级处理: ${errorMessage}`
          }
        }
      },
      completion_status: 'collecting',
      direction_suggestions: ["遇到技术问题，使用简化流程继续"],
      smart_defaults: {}
    };
  }
}

// 导出主要函数和类型
export type { 
  WelcomeCollectedInfo, 
  IntentRecognitionResult, 
  RecommendationGuideResult,
  WelcomeAgentResponse 
};

// 向后兼容的导出
export { processWelcomeAgent as default };

/**
 * 简化的Welcome Agent类 - 仅保留基本功能
 */
export class WelcomeAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: true,
      outputFormats: ['json'],
      maxRetries: 2,
      timeout: 15000
    };
    
    super('WelcomeAgent', capabilities);
  }

  /**
   * 主处理流程 - 直接使用大模型双Prompt架构
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`\n🤖 [Welcome Agent] 开始处理用户输入`);
    console.log(`📝 [用户输入] "${input.user_input}"`);
    
    try {
      // 检查是否是自定义描述后的用户输入
      const metadata = sessionData.metadata as any;
      if (metadata?.waitingForCustomDescription) {
        console.log(`✏️ [自定义描述处理] 用户已提供自定义描述`);
        yield* this.handleCustomDescriptionInput(input.user_input, sessionData);
        return;
      }

      // 🚀 直接使用双Prompt大模型架构
      const collectedInfo = extractCollectedInfo(sessionData);
      const conversationRound = getConversationRound(sessionData);
      
      console.log(`🎯 [大模型处理] 调用双Prompt架构`);
      const result = await processWelcomeAgent(
        input.user_input,
        collectedInfo,
        conversationRound,
        {
          provider: 'claude',
          includeDebugInfo: false,
          conversationHistory: this.buildConversationHistory(sessionData)
        }
      );
      
      // 更新会话数据
      const intentResponse: IntentResponse = {
        identified: result.identified,
        follow_up: result.follow_up,
        completion_status: result.completion_status,
        direction_suggestions: result.direction_suggestions,
        smart_defaults: result.smart_defaults
      };
      
      updateSessionData(intentResponse, sessionData);
      console.log(`💾 [会话更新] 数据已更新到会话中`);

      // 根据完成状态决定响应
      if (result.completion_status === 'ready') {
        console.log(`🎉 [收集完成] 信息收集完整，准备推进到下一阶段`);
        yield this.createReadyToAdvanceResponse(result, sessionData);
      } else {
        console.log(`🔄 [继续收集] 信息不完整，继续收集`);
        yield this.createCollectionResponse(result, sessionData);
      }

    } catch (error) {
      console.error(`❌ [Welcome Agent错误] 处理失败:`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 构建对话历史（用于AI上下文）
   */
  private buildConversationHistory(sessionData: SessionData): string {
    const metadata = sessionData.metadata as any;
    const round = metadata?.conversationRound || 1;
    const collectedInfo = extractCollectedInfo(sessionData);
    
    return `对话轮次: ${round}, 已收集信息: ${JSON.stringify(collectedInfo)}`;
  }

  /**
   * 创建信息收集完成，准备推进的响应
   */
  private createReadyToAdvanceResponse(result: WelcomeAgentResponse, sessionData: SessionData): StreamableAgentResponse {
    const identified = result.identified;
    
    return this.createResponse({
      immediate_display: {
        reply: `🎉 完美！AI已收集到您的完整信息：\n\n` +
               `👤 身份：${identified.user_role}\n` +
               `🎯 目的：${identified.use_case}\n` +
               `🎨 风格：${identified.style}\n` +
               `📋 重点：${identified.highlight_focus?.join('、')}\n\n` +
               `🚀 现在开始为您创建专属的页面！正在跳转到页面构建器...`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance_to_next',
        done: true,
        progress: 100,
        current_stage: '信息收集完成',
        metadata: {
          collected_info: identified,
          completion_status: 'ready',
          action: 'redirect_to_builder',
          next_step: 'page_builder'
        }
      }
    });
  }

  /**
   * 创建信息收集响应 - 使用AI推荐
   */
  private createCollectionResponse(result: WelcomeAgentResponse, sessionData: SessionData): StreamableAgentResponse {
    const missingFields = result.follow_up.missing_fields;
    
    if (missingFields.length === 0) {
      return this.createReadyToAdvanceResponse(result, sessionData);
    }

    // 获取当前需要收集的字段
    const currentField = missingFields[0];
    const fieldDisplayName = getFieldDisplayName(currentField);
    const fieldSuggestion = result.follow_up.suggestions[currentField];
    
    if (!fieldSuggestion) {
      throw new Error(`AI未能为字段 ${currentField} 生成推荐选项`);
    }

    // 构建AI推荐的回复消息
    const progressInfo = this.buildProgressInfo(result.identified);
    let replyMessage = progressInfo ? `${progressInfo}\n\n` : '';
    
    replyMessage += `🤖 ${fieldSuggestion.prompt_text}`;
    
    if (fieldSuggestion.reasoning) {
      replyMessage += `\n\n💭 AI推荐理由：${fieldSuggestion.reasoning}`;
    }

    // 构建选项数据，确保包含自定义选项
    const options = fieldSuggestion.options.map(option => ({
      value: option,
      label: option
    }));

    return this.createInteractionResponse(
      replyMessage,
      {
        type: 'form',
        title: fieldSuggestion.prompt_text,
        description: `选择最符合您的${fieldDisplayName}，或选择自定义选项`,
        elements: [{
          id: currentField,
          type: 'select',
          label: fieldSuggestion.prompt_text,
          options: options,
          required: true
        }],
        required: false
      }
    );
  }

  /**
   * 构建进度信息显示
   */
  private buildProgressInfo(collectedInfo: WelcomeCollectedInfo): string {
    const progressItems = [];
    
    if (collectedInfo.user_role) {
      progressItems.push(`✅ 身份：${collectedInfo.user_role}`);
    }
    if (collectedInfo.use_case) {
      progressItems.push(`✅ 目的：${collectedInfo.use_case}`);
    }
    if (collectedInfo.style) {
      progressItems.push(`✅ 风格：${collectedInfo.style}`);
    }
    if (collectedInfo.highlight_focus && collectedInfo.highlight_focus.length > 0) {
      progressItems.push(`✅ 重点：${collectedInfo.highlight_focus.join('、')}`);
    }
    
    if (progressItems.length === 0) return '';
    
    const totalFields = 4;
    const progress = Math.round((progressItems.length / totalFields) * 100);
    
    return `📈 收集进度 ${progress}%\n${progressItems.join('\n')}`;
  }

  /**
   * 处理自定义描述的用户输入
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
    
    // 🎯 特殊处理highlight_focus字段，支持多行输入
    if (customField === 'highlight_focus') {
      const highlights = userDescription.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('•') ? line : line.substring(1).trim())
        .filter(line => line);
      updatedInfo[customField] = highlights;
    } else {
      updatedInfo[customField] = userDescription.trim();
    }

    // 保存到会话数据
    metadata.intentData = updatedInfo;
    metadata.conversationRound = (metadata.conversationRound || 0) + 1;

    // 流式输出确认消息
    const fieldDisplayName = getFieldDisplayName(customField);
    let confirmationMessage = `✅ 太好了！我已经记录了您的${fieldDisplayName}：\n\n`;
    
    if (customField === 'highlight_focus' && Array.isArray(updatedInfo[customField])) {
      confirmationMessage += updatedInfo[customField].map((item: string, index: number) => 
        `${index + 1}. ${item}`
      ).join('\n');
    } else {
      confirmationMessage += `"${updatedInfo[customField]}"`;
    }
    
    confirmationMessage += '\n\n🤖 让我检查还需要什么信息...';
    
    yield* this.streamResponse(confirmationMessage, sessionData);

    // 检查是否还需要其他信息
    const missingFields = getMissingFields(updatedInfo);
    
    if (missingFields.length === 0) {
      // 信息收集完成
      metadata.completionStatus = 'ready';
      
      const completeMessage = `\n\n🎉 完美！所有信息已收集完成：\n\n` +
        `👤 身份：${updatedInfo.user_role}\n` +
        `🎯 目的：${updatedInfo.use_case}\n` +
        `🎨 风格：${updatedInfo.style || 'AI推荐'}\n` +
        `📋 重点：${Array.isArray(updatedInfo.highlight_focus) ? 
          updatedInfo.highlight_focus.join('、') : updatedInfo.highlight_focus}\n\n` +
        `🚀 现在开始为您创建专属页面！正在跳转到页面构建器...`;
      
      yield* this.streamResponse(completeMessage, sessionData, 'advance_to_next', true);
    } else {
      // 🎯 使用AI推荐下一个字段的选项
      const continueMessage = `\n\n📋 还需要了解一下您的${getFieldDisplayName(missingFields[0])}信息。`;
      yield* this.streamResponse(continueMessage, sessionData);
      
      // 调用AI生成下一个字段的推荐
      try {
        const aiResult = await processWelcomeAgent(
          `用户已提供${customField}信息，现在需要收集${missingFields[0]}`,
          updatedInfo,
          metadata.conversationRound,
          { provider: 'claude' }
        );
        
        // 继续收集剩余信息
        yield this.createCollectionResponse(aiResult, sessionData);
      } catch (error) {
        console.error('AI推荐生成失败:', error);
        // 降级处理
        yield this.createResponse({
          immediate_display: {
            reply: `请告诉我您的${getFieldDisplayName(missingFields[0])}：`,
            agent_name: this.name,
            timestamp: new Date().toISOString()
          },
          system_state: {
            intent: 'collecting',
            done: false,
            progress: Math.round(((4 - missingFields.length) / 4) * 100),
            current_stage: `收集${getFieldDisplayName(missingFields[0])}`,
            metadata: { field: missingFields[0] }
          }
        });
      }
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
   * 处理用户交互 - 简化版
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    console.log(`🔄 [简化交互处理] 类型: ${interactionType}, 数据:`, data);

    try {
      if (interactionType === 'form_submit' && data) {
        // 检查是否选择了自定义选项
        const customCheck = checkForCustomDescription(data);
        
        if (customCheck.needsDescription && customCheck.field) {
          console.log(`✏️ [自定义选项] 用户选择了${customCheck.field}的自定义描述`);
          
          // 设置等待自定义描述状态
          const metadata = sessionData.metadata as any;
          metadata.waitingForCustomDescription = customCheck.field;
          
          // 返回自定义描述引导
          const prompt = getCustomDescriptionPrompt(customCheck.field);
          return {
            reply: prompt,
            continue_conversation: true,
            intent: 'custom_description',
            field: customCheck.field
          };
        }

        // 正常处理选择的数据 - 直接更新并使用AI推荐下一步
        console.log(`📝 [选项选择] 用户选择了选项:`, data);
        
        const metadata = sessionData.metadata as any;
        if (!metadata.intentData) {
          metadata.intentData = {};
        }
        
        // 合并用户选择的数据
        Object.assign(metadata.intentData, data);
        metadata.conversationRound = (metadata.conversationRound || 0) + 1;
        
        // 🎯 使用AI分析和推荐下一步
        const currentInfo = extractCollectedInfo(sessionData);
        const missingFields = getMissingFields(currentInfo);
        
        if (missingFields.length === 0) {
          // 信息收集完成
          console.log(`🎉 [收集完成] 所有信息已收集完毕`);
          metadata.completionStatus = 'ready';
          
          return {
            reply: `🎉 完美！AI已收集到您的完整信息：\n\n` +
                   `👤 身份：${currentInfo.user_role}\n` +
                   `🎯 目的：${currentInfo.use_case}\n` +
                   `🎨 风格：${currentInfo.style || 'AI推荐'}\n` +
                   `📋 重点：${Array.isArray(currentInfo.highlight_focus) ? currentInfo.highlight_focus.join('、') : currentInfo.highlight_focus || '待定'}\n\n` +
                   `🚀 现在开始为您创建专属的页面！正在跳转到页面构建器...`,
            continue_conversation: false,
            intent: 'advance_to_next',
            action: 'redirect_to_builder',
            collected_info: currentInfo,
            next_step: 'page_builder'
          };
        } else {
          // 🎯 使用AI推荐下一个字段的选项
          try {
            const aiResult = await processWelcomeAgent(
              `用户已选择选项，现在需要收集${missingFields[0]}`,
              currentInfo,
              metadata.conversationRound,
              { provider: 'claude' }
            );
            
            const nextField = missingFields[0];
            const fieldSuggestion = aiResult.follow_up.suggestions[nextField];
            
            if (fieldSuggestion) {
              return {
                reply: `🤖 ${fieldSuggestion.prompt_text}`,
                continue_conversation: true,
                intent: 'collecting_ai',
                field: nextField,
                suggestions: fieldSuggestion,
                progress: Math.round(((4 - missingFields.length) / 4) * 100),
                ai_reasoning: fieldSuggestion.reasoning
              };
            }
          } catch (error) {
            console.error('AI推荐失败，使用简化处理:', error);
          }
          
          // 降级处理
          const nextField = missingFields[0];
          return {
            reply: `请继续提供您的${getFieldDisplayName(nextField)}信息：`,
            continue_conversation: true,
            intent: 'collecting',
            field: nextField,
            progress: Math.round(((4 - missingFields.length) / 4) * 100)
          };
        }
      }
      
      return {
        reply: '抱歉，我无法理解您的选择。请重新选择或提供更多信息。',
        continue_conversation: true,
        intent: 'error'
      };
      
    } catch (error) {
      console.error('❌ [简化交互处理错误]:', error);
      return {
        reply: '处理您的选择时遇到了问题，请重试。',
        continue_conversation: true,
        intent: 'error'
      };
    }
  }
} 