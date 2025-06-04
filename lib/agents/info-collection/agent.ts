import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent,
  PersonalizationProfile
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
import {
  MaterialCollectionState,
  extractUserGoal,
  extractUserType,
  extractUrgency,
  determineCollectionMode,
  assessMaterialCollectionState,
  shouldAdvanceToDesign,
  getMaterialGuide,
  generateMaterialRequestMessage,
  buildMaterialCollectionElements,
  generateMaterialSummary,
  processMaterialSubmission,
  delay
} from './utils';

/**
 * Info Collection Agent - 材料和链接收集
 */
export class InfoCollectionAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: true,
      outputFormats: ['json', 'html'],
      maxRetries: 3,
      timeout: 15000
    };
    
    super('InfoCollectionAgent', capabilities);
  }

  /**
   * 主处理流程 - 收集用户已有材料和链接
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 分析用户画像和收集策略
      yield this.createThinkingResponse('正在准备材料收集清单...', 25);
      await delay(1000);

      const userGoal = extractUserGoal(sessionData);
      const userType = extractUserType(sessionData);
      const urgency = extractUrgency(sessionData);
      
      // 判断收集模式
      const collectionMode = determineCollectionMode(userGoal, urgency);

      // 检查当前收集状态
      const currentState = assessMaterialCollectionState(sessionData);
      
      if (shouldAdvanceToDesign(currentState, collectionMode)) {
        // 材料足够或用户选择跳过，推进到下一阶段
        yield this.createAdvanceResponse(currentState, sessionData);
        return;
      }

      // 生成材料收集请求
      const materialRequest = this.generateMaterialRequest(userType, userGoal, currentState, collectionMode);
      yield materialRequest;

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 生成材料收集请求
   */
  private generateMaterialRequest(
    userType: string,
    userGoal: string,
    currentState: MaterialCollectionState,
    mode: string
  ): StreamableAgentResponse {
    const materialGuide = getMaterialGuide(userType);
    
    return this.createResponse({
      immediate_display: {
        reply: generateMaterialRequestMessage(userType, userGoal, mode),
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      interaction: {
        type: 'form',
        title: '材料收集',
        description: '请提供您已有的材料和链接，或选择跳过使用默认数据',
        elements: buildMaterialCollectionElements(materialGuide, currentState)
      },
      system_state: {
        intent: 'collecting_materials',
        done: false,
        progress: 40,
        current_stage: '材料收集',
        metadata: {
          collectionMode: mode,
          userType,
          userGoal
        }
      }
    });
  }

  /**
   * 创建思考响应
   */
  protected createThinkingResponse(message: string, progress: number): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: message,
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
   * 创建推进响应
   */
  private createAdvanceResponse(state: MaterialCollectionState, sessionData: SessionData): StreamableAgentResponse {
    const materials = sessionData.collectedData as any; // 使用类型断言
    const summary = generateMaterialSummary(materials);

    return this.createResponse({
      immediate_display: {
        reply: `✅ 材料收集完成！\n\n${summary}\n\n现在开始设计您的页面结构...`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 60,
        current_stage: '材料收集完成',
        metadata: {
          collectionState: state,
          materialsCount: {
            documents: materials?.documents?.length || 0,
            links: materials?.links?.length || 0
          }
        }
      }
    });
  }

  /**
   * 处理用户交互
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    console.log(`📝 [Info Collection Agent交互] 处理用户交互`);
    console.log(`📝 [交互类型] ${interactionType}`);
    console.log(`📄 [交互数据] ${JSON.stringify(data)}`);

    if (interactionType === 'interaction') {
      // 处理材料提交
      const processedMaterials = processMaterialSubmission(data);
      
      // 更新会话数据
      if (!sessionData.collectedData) {
        sessionData.collectedData = {
          personal: {},
          professional: {} as any,
          experience: [],
          education: [],
          projects: [],
          certifications: []
        } as any;
      }

      // 将材料数据合并到会话中
      Object.assign(sessionData.collectedData, processedMaterials);

      // 重新评估收集状态
      const newState = assessMaterialCollectionState(sessionData);
      const userGoal = extractUserGoal(sessionData);
      const urgency = extractUrgency(sessionData);
      const collectionMode = determineCollectionMode(userGoal, urgency);

      if (shouldAdvanceToDesign(newState, collectionMode)) {
        return {
          action: 'advance',
          materials: processedMaterials,
          state: newState,
          summary: `材料收集完成：${processedMaterials.documents.length}个文档，${processedMaterials.links.length}个链接`
        };
      } else {
        return {
          action: 'continue',
          materials: processedMaterials,
          state: newState,
          summary: `材料已更新，完整度: ${Math.round(newState.completeness)}%`
        };
      }
    }

    return data;
  }

  /**
   * AI增强的意图理解
   */
  private async enhanceUserIntentUnderstanding(
    userInput: string, 
    sessionData: SessionData
  ): Promise<{
    intent: 'skip' | 'provide_materials' | 'ask_question' | 'continue_collection';
    confidence: number;
    suggestedAction: string;
    naturalResponse: string;
  }> {
    // 这里可以调用LLM进行意图分析
    // 简化版本：基于关键词判断
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('跳过') || lowerInput.includes('没有') || lowerInput.includes('先不')) {
      return {
        intent: 'skip',
        confidence: 0.9,
        suggestedAction: 'proceed_with_defaults',
        naturalResponse: '好的，我理解您暂时没有这些材料。我们可以使用默认数据先创建一个基础版本！'
      };
    }
    
    if (lowerInput.includes('有') && (lowerInput.includes('链接') || lowerInput.includes('简历'))) {
      return {
        intent: 'provide_materials',
        confidence: 0.8,
        suggestedAction: 'show_upload_form',
        naturalResponse: '太好了！请上传您的材料或提供相关链接，这样能让页面更加精准。'
      };
    }
    
    return {
      intent: 'continue_collection',
      confidence: 0.5,
      suggestedAction: 'clarify_needs',
      naturalResponse: '让我为您提供更详细的材料收集指南。'
    };
  }

  /**
   * AI增强的处理流程
   */
  async* processWithAIEnhancement(
    input: { user_input: string },
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 智能意图理解
      const intentAnalysis = await this.enhanceUserIntentUnderstanding(input.user_input, sessionData);
      
      // 流式输出AI理解结果
      yield this.createResponse({
        immediate_display: {
          reply: intentAnalysis.naturalResponse,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'understanding',
          done: false,
          progress: 20,
          current_stage: '理解需求中...'
        }
      });

      await delay(1500);

      // 根据意图执行相应动作
      if (intentAnalysis.intent === 'skip') {
        // 用户选择跳过，直接推进
        const currentState = assessMaterialCollectionState(sessionData);
        yield this.createAdvanceResponse(currentState, sessionData);
      } else {
        // 显示增强的材料收集表单
        yield this.createEnhancedMaterialRequest(intentAnalysis, sessionData);
      }

    } catch (error) {
      yield await this.handleError(error as Error, sessionData);
    }
  }

  /**
   * 创建增强的材料请求
   */
  private createEnhancedMaterialRequest(
    intentAnalysis: any, 
    sessionData: SessionData
  ): StreamableAgentResponse {
    const userType = extractUserType(sessionData);
    const userGoal = extractUserGoal(sessionData);
    const materialGuide = getMaterialGuide(userType);
    const currentState = assessMaterialCollectionState(sessionData);

    return this.createResponse({
      immediate_display: {
        reply: `${intentAnalysis.naturalResponse}\n\n${generateMaterialRequestMessage(userType, userGoal, 'standard')}`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      interaction: {
        type: 'form',
        title: '智能材料收集',
        description: '基于您的需求，这些材料将最大化提升您的页面效果',
        elements: buildMaterialCollectionElements(materialGuide, currentState)
      },
      system_state: {
        intent: 'collecting_materials_enhanced',
        done: false,
        progress: 45,
        current_stage: '智能材料收集',
        metadata: {
          intentAnalysis,
          userType,
          userGoal
        }
      }
    });
  }
} 