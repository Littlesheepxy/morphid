import { BaseAgent } from '../base-agent';
import { StreamableAgentResponse, AgentCapabilities } from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { generateWithModel, generateStreamWithModel } from '@/lib/ai-models';
import { 
  CollectedInfo,
  WelcomeAIResponse,
  WelcomeSummaryResult,
  getSystemPrompt,
  getFirstRoundPrompt,
  getContinuationPrompt,
  parseAIResponse,
  tryParseStreamingResponse,
  calculateCollectionProgress,
  buildConversationHistoryText,
  generateCollectionSummary,
  StreamContentProcessor
} from './utils';

/**
 * 对话式Welcome Agent - 纯对话收集用户信息
 * 不使用按钮交互，完全通过自然对话收集所需信息
 */
export class ConversationalWelcomeAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false, // 不需要按钮交互
      outputFormats: ['json'],
      maxRetries: 2,
      timeout: 15000
    };
    
    super('ConversationalWelcomeAgent', capabilities);
  }

  /**
   * 主处理流程 - 纯对话式信息收集
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`\n🤖 [对话式Welcome Agent] 开始处理用户输入`);
    console.log(`📝 [用户输入] "${input.user_input}"`);
    
    try {
      // 检查是否是首轮对话
      const metadata = sessionData.metadata as any;
      const conversationHistory = metadata.welcomeHistory || [];
      const currentInfo = metadata.collectedInfo || {};
      const isFirstRound = conversationHistory.length === 0;

      console.log(`🔄 [对话轮次] ${isFirstRound ? '首轮' : '第' + (conversationHistory.length + 1) + '轮'}`);

      // 构建prompt
      let userPrompt: string;
      if (isFirstRound) {
        userPrompt = getFirstRoundPrompt(input.user_input);
      } else {
        const historyText = buildConversationHistoryText(conversationHistory);
        userPrompt = getContinuationPrompt(input.user_input, historyText, currentInfo);
      }

      console.log(`🎯 [大模型调用] 发送流式对话请求`);
      
      // 🆕 修复流式响应处理逻辑 - 使用内容分离处理器
      const contentProcessor = new StreamContentProcessor();
      let finalAiResponse: WelcomeAIResponse | null = null;
      let isFirstChunk = true;
      let messageId = `welcome-${Date.now()}`;
      let chunkCount = 0;
      
      console.log(`🌊 [流式处理] 开始接收AI响应流`);
      
      for await (const chunk of this.callAIModelStreaming(userPrompt)) {
        chunkCount++;
        
        // 🆕 使用内容分离处理器处理每个chunk
        const processResult = contentProcessor.processChunk(chunk);
        
        // 如果有新的可见内容，发送给前端
        if (processResult.newVisibleContent) {
          console.log(`📤 [流式可见内容] 第${chunkCount}个块，新增内容长度: ${processResult.newVisibleContent.length}`);
          
          yield this.createResponse({
            immediate_display: {
              reply: contentProcessor.getCurrentVisibleContent(), // 发送完整的当前可见内容
              agent_name: this.name,
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'collecting',
              done: false,
              progress: Math.min(90, 10 + Math.floor(contentProcessor.getCurrentVisibleContent().length / 50)),
              current_stage: '正在对话...',
              metadata: {
                streaming: true,
                message_id: messageId,
                stream_type: isFirstChunk ? 'start' : 'delta',
                is_update: !isFirstChunk
              }
            }
          });
          
          isFirstChunk = false;
        }
        
        // 如果检测到完整的隐藏控制信息，处理完成逻辑
        if (processResult.isComplete && processResult.hiddenControl) {
          console.log(`🎉 [隐藏控制信息] 检测到完整的控制信息`);
          finalAiResponse = processResult.hiddenControl;
          break;
        }
      }
      
      // 🏁 流式完成：解析最终响应并发送完成状态
      console.log(`🔍 [流式完成] 解析最终AI响应`);
      console.log(`📝 [累积响应] 长度: ${contentProcessor.getCurrentVisibleContent().length}, 内容前100字: ${contentProcessor.getCurrentVisibleContent().substring(0, 100)}`);
      
      // 更新对话历史
      conversationHistory.push(
        { role: 'user', content: input.user_input },
        { role: 'assistant', content: finalAiResponse?.reply || '' }
      );
      
      // 更新会话数据
      metadata.welcomeHistory = conversationHistory;
      metadata.collectedInfo = { ...currentInfo, ...finalAiResponse?.collected_info || {} };
      
      console.log(`💾 [信息更新] 当前收集状态:`, metadata.collectedInfo);

      // 🔧 修复：根据完成状态发送最终响应，避免重复
      if (finalAiResponse?.completion_status === 'ready') {
        console.log(`🎉 [收集完成] 信息收集完整，开始汇总处理`);
        
        // 🆕 使用系统汇总，不再调用AI
        const summaryResult = this.generateSystemSummary(metadata.collectedInfo);
        
        // 保存汇总结果到会话数据，供下一个Agent使用
        metadata.welcomeSummary = summaryResult;
        
        yield this.createAdvanceResponse(finalAiResponse, summaryResult, sessionData);
      } else {
        console.log(`🔄 [继续收集] 继续对话收集信息`);
        
        // 🔧 直接发送最终的继续收集响应，不再重复发送中间状态
        yield this.createResponse({
          immediate_display: {
            reply: finalAiResponse?.reply || '',
            agent_name: this.name,
            timestamp: new Date().toISOString()
          },
          system_state: {
            intent: 'collecting',
            done: false,
            progress: calculateCollectionProgress(metadata.collectedInfo),
            current_stage: '信息收集中',
            metadata: {
              streaming: false,
              message_id: messageId,
              stream_type: 'complete',
              is_final: true, // 🔑 标记为最终响应
              completion_status: finalAiResponse?.completion_status,
              collected_info: metadata.collectedInfo,
              next_question: finalAiResponse?.next_question
            }
          }
        });
      }

    } catch (error) {
      console.error(`❌ [对话式Welcome Agent错误] 处理失败:`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 🆕 流式调用AI模型进行对话
   */
  private async* callAIModelStreaming(userPrompt: string): AsyncGenerator<string, void, unknown> {
    try {
      yield* generateStreamWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 1000 }
      );
      
    } catch (error) {
      console.error('❌ [AI流式调用失败]:', error);
      throw new Error('AI对话调用失败');
    }
  }

  /**
   * 调用AI模型进行对话（保留非流式版本作为备用）
   */
  private async callAIModel(userPrompt: string): Promise<WelcomeAIResponse> {
    try {
      const result = await generateWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: userPrompt }
        ],
        { maxTokens: 1000 }
      );

      // 解析AI响应
      const resultText = 'text' in result ? result.text : JSON.stringify(result);
      const aiResponse = parseAIResponse(resultText);
      return aiResponse;
      
    } catch (error) {
      console.error('❌ [AI调用失败]:', error);
      throw new Error('AI对话调用失败');
    }
  }

  /**
   * 创建推进到下一阶段的响应
   */
  private createAdvanceResponse(
    aiResponse: WelcomeAIResponse, 
    summaryResult: WelcomeSummaryResult,
    sessionData: SessionData
  ): StreamableAgentResponse {
    const collectedInfo = aiResponse.collected_info;
    const summary = generateCollectionSummary(collectedInfo);
    
    return this.createResponse({
      immediate_display: {
        reply: `${aiResponse.reply}\n\n🎉 太棒了！我已经收集到您的基本信息：\n${summary}\n\n🚀 现在开始为您创建专属的页面！`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 100,
        current_stage: '信息收集完成',
        metadata: {
          completion_status: 'ready',
          collected_info: collectedInfo,
          welcomeSummary: this.generateSystemSummary(collectedInfo),
          action: 'advance',
          next_step: 'info_collection',
          next_agent_context: this.generateContextForNextAgent(collectedInfo)
        }
      }
    });
  }

  /**
   * 🆕 系统生成汇总结果（替代AI汇总）
   */
  private generateSystemSummary(collectedInfo: CollectedInfo): WelcomeSummaryResult {
    const completionProgress = calculateCollectionProgress(collectedInfo);
    const hasDetailedInfo = completionProgress >= 75;
    
    const commitmentLevel = hasDetailedInfo ? '认真制作' : '试一试';
    
    return {
      summary: {
        user_role: collectedInfo.user_role || '新用户',
        use_case: collectedInfo.use_case || '个人展示',
        style: collectedInfo.style || '简约风格',
        highlight_focus: collectedInfo.highlight_focus || ['个人信息', '技能展示']
      },
      user_intent: {
        commitment_level: commitmentLevel,
        reasoning: `基于收集信息完整度${completionProgress}%进行判断`
      },
      context_for_next_agent: this.generateContextForNextAgent(collectedInfo),
      sample_suggestions: {
        should_use_samples: commitmentLevel === '试一试',
        reason: commitmentLevel === '试一试' 
          ? '信息收集不够完整，建议使用示例数据快速体验' 
          : '用户提供了详细信息，可以进行个性化定制'
      }
    };
  }

  /**
   * 🆕 为下一个Agent生成上下文
   */
  private generateContextForNextAgent(collectedInfo: CollectedInfo): string {
    const completionProgress = calculateCollectionProgress(collectedInfo);
    
    if (completionProgress >= 75) {
      return `用户信息收集完整，可以基于以下信息进行个性化定制：${JSON.stringify(collectedInfo)}`;
    } else {
      return `用户信息收集不完整（${completionProgress}%），建议使用示例数据进行快速体验`;
    }
  }

  /**
   * 处理用户交互 - 对话式Agent不需要特殊交互处理
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    // 对话式Agent不需要处理按钮交互
    // 所有交互都通过process方法的对话处理
    return {
      action: 'continue',
      summary: '继续对话'
    };
  }
} 