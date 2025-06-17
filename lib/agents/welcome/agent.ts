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
  getSummaryPrompt,
  parseSummaryResponse
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
      
      // 🆕 流式调用大模型，使用Claude官方API的流式模式
      let accumulatedResponse = '';
      let finalAiResponse: WelcomeAIResponse | null = null;
      let isFirstChunk = true;
      let messageId = `welcome-${Date.now()}`;
      
      for await (const chunk of this.callAIModelStreaming(userPrompt)) {
        accumulatedResponse += chunk;
        
        if (isFirstChunk) {
          // 🎯 第一个块：创建新消息气泡并开始流式输出
          yield this.createResponse({
            immediate_display: {
              reply: chunk,
              agent_name: this.name,
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'collecting',
              done: false,
              progress: 10,
              current_stage: '信息收集中...',
              metadata: {
                streaming: true,
                message_id: messageId,
                stream_type: 'start'
              }
            }
          });
          isFirstChunk = false;
        } else {
          // 🔄 后续块：更新现有消息气泡
          yield this.createResponse({
            immediate_display: {
              reply: accumulatedResponse,
              agent_name: this.name,
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'collecting',
              done: false,
              progress: Math.min(90, 10 + (accumulatedResponse.length / 10)),
              current_stage: '信息收集中...',
              metadata: {
                streaming: true,
                message_id: messageId,
                stream_type: 'delta', // 🔑 关键：标记为增量更新
                is_update: true // 🔑 告诉前端这是更新，不是新消息
              }
            }
          });
        }
      }
      
      // 🏁 流式完成：解析最终响应并发送完成状态
      console.log(`🔍 [流式完成] 解析最终AI响应`);
      finalAiResponse = parseAIResponse(accumulatedResponse);
      
      // 发送流式完成的最终状态
      yield this.createResponse({
        immediate_display: {
          reply: finalAiResponse.reply,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'collecting',
          done: false,
          progress: calculateCollectionProgress(finalAiResponse.collected_info),
          current_stage: '信息收集中',
          metadata: {
            streaming: false,
            message_id: messageId,
            stream_type: 'complete',
            is_update: true,
            completion_status: finalAiResponse.completion_status,
            collected_info: finalAiResponse.collected_info
          }
        }
      });
      
      // 更新对话历史
      conversationHistory.push(
        { role: 'user', content: input.user_input },
        { role: 'assistant', content: finalAiResponse.reply }
      );
      
      // 更新会话数据
      metadata.welcomeHistory = conversationHistory;
      metadata.collectedInfo = { ...currentInfo, ...finalAiResponse.collected_info };
      
      console.log(`💾 [信息更新] 当前收集状态:`, metadata.collectedInfo);

      // 根据完成状态决定最终响应
      if (finalAiResponse.completion_status === 'ready') {
        console.log(`🎉 [收集完成] 信息收集完整，开始汇总处理`);
        
        // 🆕 调用汇总功能
        const summaryResult = await this.generateSummary(conversationHistory);
        
        // 保存汇总结果到会话数据，供下一个Agent使用
        metadata.welcomeSummary = summaryResult;
        
        yield this.createAdvanceResponse(finalAiResponse, summaryResult, sessionData);
      } else {
        console.log(`🔄 [继续收集] 继续对话收集信息`);
        yield this.createContinueResponse(finalAiResponse, sessionData);
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
   * 创建继续收集的响应
   */
  private createContinueResponse(aiResponse: WelcomeAIResponse, sessionData: SessionData): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: aiResponse.reply,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'collecting',
        done: false,
        progress: calculateCollectionProgress(aiResponse.collected_info),
        current_stage: '信息收集中',
        metadata: {
          completion_status: 'collecting',
          collected_info: aiResponse.collected_info,
          next_question: aiResponse.next_question
        }
      }
    });
  }

  /**
   * 生成信息汇总
   */
  private async generateSummary(conversationHistory: any[]): Promise<WelcomeSummaryResult> {
    try {
      console.log(`📊 [汇总处理] 开始生成信息汇总...`);
      
      const summaryPrompt = getSummaryPrompt(conversationHistory);
      
      const result = await generateWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [
          { role: 'user', content: summaryPrompt }
        ],
        { maxTokens: 1000 }
      );

      const resultText = 'text' in result ? result.text : JSON.stringify(result);
      const summaryResult = parseSummaryResponse(resultText);
      
      console.log(`✅ [汇总完成] 生成成功:`, summaryResult.summary);
      return summaryResult;
      
    } catch (error) {
      console.error('❌ [汇总失败]:', error);
      
      // 降级处理 - 返回基础汇总
      return parseSummaryResponse('{}');
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
        intent: 'advance_to_next',
        done: true,
        progress: 100,
        current_stage: '信息收集完成',
        metadata: {
          completion_status: 'ready',
          collected_info: collectedInfo,
          // 🆕 添加汇总结果（保持与process中一致的字段名）
          welcomeSummary: summaryResult,
          action: 'advance',
          next_step: 'info_collection',
          // 🆕 传递给下一个Agent的上下文
          next_agent_context: summaryResult.context_for_next_agent
        }
      }
    });
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