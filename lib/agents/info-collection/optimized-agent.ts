/**
 * 优化版信息收集Agent - 基于Claude官方工具调用最佳实践
 * 固定流程：分析输入 → 并行工具调用 → 结果整合 → 响应生成
 */

import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities
} from '@/lib/types/streaming';
import { SessionData, CollectedResumeData } from '@/lib/types/session';
import { OPTIMIZED_INFO_COLLECTION_PROMPT, formatPrompt } from '@/lib/prompts';
import { 
  CLAUDE_INFO_COLLECTION_TOOLS, 
  TOOL_EXECUTORS,
  formatToolResult,
  executeToolsInParallel,
  selectToolsForInput
} from './claude-tools';

/**
 * 工具调用响应接口
 */
interface ToolUseResponse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * 工具结果响应接口
 */
interface ToolResultResponse {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * 优化版信息收集Agent
 * 专注于Claude工具调用的最佳实践实现
 */
export class OptimizedInfoCollectionAgent extends BaseAgent {
  private readonly tools = CLAUDE_INFO_COLLECTION_TOOLS;
  private sessionData!: SessionData;

  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json', 'text'],
      maxRetries: 3,
      timeout: 30000
    };
    
    super('OptimizedInfoCollectionAgent', capabilities);
  }

  /**
   * 主处理流程 - 固定的4步流程
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    this.sessionData = sessionData;
    const userInput = input.user_input;

    try {
      console.log(`🎯 [优化版收集Agent] 开始处理: "${userInput}"`);

      // 🆕 检查是否为"试一试"用户，优先使用示例数据
      const welcomeData = this.extractWelcomeData(sessionData);
      const welcomeSummary = (sessionData.metadata as any)?.welcomeSummary;
      
      if (welcomeSummary?.user_intent?.commitment_level === '试一试' && 
          welcomeSummary?.sample_suggestions?.should_use_samples) {
        console.log(`🎲 [试一试模式] 检测到体验用户，准备使用示例数据`);
        yield* this.handleTrialUserWithSamples(welcomeSummary, sessionData);
        return;
      }

      // 检查轮次限制 - 系统控制
      const currentTurn = this.getTurnCount(sessionData);
      const maxTurns = this.getMaxTurns(sessionData);
      
      if (currentTurn >= maxTurns) {
        console.log(`⏰ [轮次限制] 已达到最大轮次 ${maxTurns}，强制推进到下一阶段`);
        yield this.createForceAdvanceResponse(sessionData);
        return;
      }

      // 增加轮次计数
      this.incrementTurnCount(sessionData);

      // 第1步：分析用户输入并准备Claude调用
      yield this.createThinkingResponse('🔍 正在分析您提供的信息...', 20);
      await this.delay(800);

      const analysisResult = await this.analyzeInputWithClaude(userInput, sessionData);
      console.log(`🧠 [Claude分析结果]`, analysisResult);

      // 第2步：执行Claude建议的工具调用（如果有）
      let toolResults: any[] = [];
      if (analysisResult.tool_calls && analysisResult.tool_calls.length > 0) {
        yield this.createThinkingResponse(
          `🛠️ 发现${analysisResult.detected_resources.join('、')}，正在深度分析...`, 
          50
        );
        
        toolResults = await this.executeClaudeTools(analysisResult.tool_calls);
        
        yield this.createThinkingResponse('📊 分析完成，正在整理收集到的信息...', 80);
        await this.delay(1000);
      }

      // 第3步：更新会话数据
      this.updateSessionWithResults(sessionData, toolResults, analysisResult);

      // 第4步：生成最终响应
      yield* this.generateFinalResponse(analysisResult, toolResults, sessionData);

    } catch (error) {
      console.error(`❌ [优化版收集Agent错误]`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 使用Claude分析用户输入（带工具调用）
   */
  private async analyzeInputWithClaude(userInput: string, sessionData: SessionData): Promise<any> {
    const welcomeData = this.extractWelcomeData(sessionData);
    const currentData = this.getCurrentCollectedData(sessionData);
    const welcomeSummary = welcomeData.welcomeSummary;

    // 🆕 构建与新prompt格式匹配的变量
    const promptVariables = {
      // 基础信息汇总 (welcomeSummary.summary)
      user_role: welcomeData.userRole || '用户',
      use_case: welcomeData.useCase || '创建个人页面',
      style: welcomeData.style || '简约',
      highlight_focus: Array.isArray(welcomeData.highlight_focus) 
        ? welcomeData.highlight_focus.join('、') 
        : (welcomeData.highlight_focus || '个人展示'),
      
      // 用户意图分析 (welcomeSummary.user_intent)
      commitment_level: welcomeSummary?.user_intent?.commitment_level || '认真制作',
      reasoning: welcomeSummary?.user_intent?.reasoning || '基于用户表达分析',
      
      // 处理建议 (welcomeSummary.sample_suggestions)
      should_use_samples: welcomeSummary?.sample_suggestions?.should_use_samples || false,
      sample_reason: welcomeSummary?.sample_suggestions?.reason || '正常处理流程',
      
      // 技术信息
      collection_priority: JSON.stringify(this.getCollectionPriority(welcomeData.userRole)),
      current_collected_data: JSON.stringify(currentData),
      available_tools: Array.from(this.tools.map(t => t.name)).join(', '),
      context_for_next_agent: welcomeSummary?.context_for_next_agent || '继续信息收集',
      
      // 用户输入
      user_input: userInput
    };

    // 使用专业prompt
    const prompt = formatPrompt(OPTIMIZED_INFO_COLLECTION_PROMPT, promptVariables);

    console.log(`📤 [Claude调用] 使用专业prompt，长度: ${prompt.length}`);
    console.log(`📋 [用户画像] ${welcomeData.userRole} | ${welcomeData.useCase} | ${promptVariables.commitment_level}`);
    console.log(`🎯 [用户意图] ${promptVariables.commitment_level} | 示例数据: ${promptVariables.should_use_samples}`);

    try {
      // 调用Claude API并启用工具调用
      const response = await this.callClaudeWithTools(prompt, userInput);
      return this.parseClaudeResponse(response);
    } catch (error) {
      console.error('Claude API调用失败:', error);
      // 降级到本地分析
      return this.fallbackAnalysis(userInput);
    }
  }

  /**
   * 获取收集优先级（基于用户身份）
   */
  private getCollectionPriority(userRole: string): string[] {
    const priorities: Record<string, string[]> = {
      '开发者': ['GitHub', '技术博客', '简历', '开源项目'],
      '软件工程师': ['GitHub', '技术博客', '简历', '项目文档'],
      'AI工程师': ['GitHub', 'Hugging Face', '研究论文', '简历'],
      '设计师': ['作品集', 'Behance', 'Dribbble', '简历'],
      'UI设计师': ['作品集', 'Figma', '设计案例', '简历'],
      'UX设计师': ['用户研究案例', '作品集', 'Medium文章', '简历'],
      '产品经理': ['LinkedIn', '产品案例', '简历', '博客文章'],
      '创业者': ['公司官网', 'LinkedIn', '媒体报道', '简历'],
      '学生': ['GitHub', '课程项目', '实习经历', '学术作品'],
      '研究员': ['学术论文', 'Google Scholar', 'ResearchGate', '简历'],
      'default': ['简历', 'LinkedIn', '作品集', '项目链接']
    };
    
    return priorities[userRole] || priorities.default;
  }

  /**
   * 调用Claude API（启用工具调用）
   */
  private async callClaudeWithTools(prompt: string, userInput: string): Promise<any> {
    // 这里应该是实际的Claude API调用
    // 由于这是优化演示，我们模拟Claude的响应结构
    
    // 智能识别用户输入中的资源
    const toolCalls = selectToolsForInput(userInput);
    
    return {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `我分析了您的输入，发现了${toolCalls.length}个可以处理的资源。让我为您调用相应的工具。`
        },
        ...toolCalls.map((call, index) => ({
          type: 'tool_use',
          id: `tool_${Date.now()}_${index}`,
          name: call.name,
          input: call.params
        }))
      ]
    };
  }

  /**
   * 解析Claude响应
   */
  private parseClaudeResponse(response: any): any {
    const textContent = response.content.find((c: any) => c.type === 'text')?.text || '';
    const toolUses = response.content.filter((c: any) => c.type === 'tool_use');

    // 从文本中提取detected_resources
    const detectedResources: string[] = [];
    if (textContent.includes('GitHub')) detectedResources.push('GitHub');
    if (textContent.includes('网页') || textContent.includes('URL')) detectedResources.push('网页');
    if (textContent.includes('LinkedIn')) detectedResources.push('LinkedIn');
    if (textContent.includes('文档')) detectedResources.push('文档');

    return {
      llm_response: textContent, // 保存LLM的完整响应文本用于状态解析
      detected_resources: detectedResources,
      tool_calls: toolUses.map((use: any) => ({
        id: use.id,
        name: use.name,
        params: use.input
      })),
      has_tools: toolUses.length > 0
    };
  }

  /**
   * 降级分析（Claude调用失败时）
   */
  private fallbackAnalysis(userInput: string): any {
    const toolCalls = selectToolsForInput(userInput);
    
    return {
      analysis_text: `检测到用户输入中包含${toolCalls.length}个可分析的资源。`,
      detected_resources: toolCalls.map(call => call.name),
      tool_calls: toolCalls.map((call, index) => ({
        name: call.name,
        params: call.params,
        id: `fallback_${Date.now()}_${index}`
      })),
      needs_tool_execution: toolCalls.length > 0,
      confidence: 0.7,
      is_fallback: true
    };
  }

  /**
   * 执行Claude建议的工具调用
   */
  private async executeClaudeTools(toolCalls: any[]): Promise<any[]> {
    const executionPlans = toolCalls.map(call => ({
      name: call.name,
      params: call.params
    }));

    console.log(`🛠️ [工具执行] 并行调用${executionPlans.length}个工具`);
    return await executeToolsInParallel(executionPlans);
  }

  /**
   * 更新会话数据
   */
  private updateSessionWithResults(
    sessionData: SessionData, 
    toolResults: any[], 
    analysisResult: any
  ): void {
    if (!sessionData.collectedData) {
      sessionData.collectedData = {
        personal: {},
        professional: {
          skills: [] // 确保skills字段存在且为数组
        },
        experience: [],
        education: [],
        projects: [],
        achievements: [],
        certifications: []
      };
    }

    // 整合工具结果到会话数据
    toolResults.forEach(result => {
      if (result.success) {
        this.mergeToolResultToSession(sessionData.collectedData, result);
      }
    });

    // 更新元数据
    const metadata = sessionData.metadata as any;
    metadata.lastToolResults = toolResults;
    metadata.lastAnalysis = analysisResult;
    metadata.collectionProgress = this.calculateCollectionProgress(sessionData.collectedData);
  }

  /**
   * 合并工具结果到会话数据
   */
  private mergeToolResultToSession(collectedData: any, result: any): void {
    const { tool_name, data } = result;

    switch (tool_name) {
      case 'analyze_github':
        collectedData.professional.github = data;
        if (data.languages) {
          collectedData.skills = [...(collectedData.skills || []), ...data.languages];
        }
        if (data.top_repositories) {
          collectedData.projects = [...(collectedData.projects || []), ...data.top_repositories];
        }
        break;

      case 'scrape_webpage':
        collectedData.links.push({
          url: data.url,
          type: data.type,
          title: data.title,
          analysis: data.content_analysis,
          extracted_content: data.extracted_content
        });
        break;

      case 'extract_linkedin':
        collectedData.professional.linkedin = data;
        if (data.experience) {
          collectedData.experience = [...(collectedData.experience || []), ...data.experience];
        }
        if (data.skills) {
          collectedData.skills = [...(collectedData.skills || []), ...data.skills];
        }
        break;

      case 'parse_document':
        collectedData.documents.push(data);
        if (data.extracted_data) {
          Object.assign(collectedData, data.extracted_data);
        }
        break;
    }
  }

  /**
   * 生成最终响应
   */
  private async* generateFinalResponse(
    analysisResult: any,
    toolResults: any[],
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    const successfulResults = toolResults.filter(r => r.success);
    const failedResults = toolResults.filter(r => !r.success);

    // 检查是否有LLM返回的状态决策
    if (analysisResult.llm_response) {
      const status = this.parseCollectionStatus(analysisResult.llm_response);
      
      if (status.action === 'READY_TO_ADVANCE') {
        yield this.createAdvanceResponseFromLLM(status, successfulResults, sessionData);
        return;
      } else if (status.action === 'NEED_CLARIFICATION') {
        yield this.createClarificationResponseFromLLM(status);
        return;
      } else if (status.action === 'CONTINUE') {
        yield this.createContinueResponseFromLLM(status, successfulResults, failedResults);
        return;
      }
    }

    // 回退到原有的系统判断逻辑
    if (successfulResults.length === 0 && toolResults.length > 0) {
      yield this.createFailureResponse(failedResults, analysisResult);
    } else if (this.shouldAdvanceToNextStage(sessionData)) {
      yield this.createAdvanceResponse(successfulResults, sessionData);
    } else {
      yield this.createContinueResponse(successfulResults, failedResults, sessionData);
    }
  }

  /**
   * 🧠 解析LLM返回的收集状态标识 - 优化版
   * 基于Claude官方最佳实践，增强状态理解能力
   */
  private parseCollectionStatus(llmResponse: string): {
    action: 'CONTINUE' | 'READY_TO_ADVANCE' | 'NEED_CLARIFICATION' | 'UNKNOWN';
    summary?: string;
    nextFocus?: string;
    clarificationFocus?: string;
    confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning?: string;
    missingInfo?: string[];
    priority?: 'high' | 'medium' | 'low';
  } {
    const response = llmResponse || '';
    
    console.log(`🧠 [状态解析] 开始解析LLM状态判断...`);
    console.log(`📄 [LLM响应] ${response.substring(0, 300)}...`);
    
    // 🎯 解析READY_TO_ADVANCE状态
    if (response.includes('COLLECTION_STATUS: READY_TO_ADVANCE')) {
      const summaryMatch = response.match(/COLLECTION_SUMMARY:\s*(.+?)(?=\n|$)/);
      const confidenceMatch = response.match(/CONFIDENCE_LEVEL:\s*(HIGH|MEDIUM|LOW)/);
      const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=\n|$)/);
      
      const result = {
        action: 'READY_TO_ADVANCE' as const,
        summary: summaryMatch?.[1]?.trim(),
        confidenceLevel: (confidenceMatch?.[1] as any) || 'MEDIUM',
        reasoning: reasoningMatch?.[1]?.trim(),
        priority: 'high' as const
      };
      
      console.log(`🚀 [推进决策] LLM建议进入下一阶段:`, result);
      return result;
    }
    
    // 🎯 解析NEED_CLARIFICATION状态
    if (response.includes('COLLECTION_STATUS: NEED_CLARIFICATION')) {
      const focusMatch = response.match(/CLARIFICATION_FOCUS:\s*(.+?)(?=\n|$)/);
      const missingMatch = response.match(/MISSING_INFO:\s*(.+?)(?=\n|$)/);
      const priorityMatch = response.match(/PRIORITY:\s*(high|medium|low)/i);
      
      let missingInfo: string[] = [];
      if (missingMatch) {
        missingInfo = missingMatch[1].split(',').map(item => item.trim());
      }
      
      const result = {
        action: 'NEED_CLARIFICATION' as const,
        clarificationFocus: focusMatch?.[1]?.trim(),
        missingInfo,
        priority: (priorityMatch?.[1]?.toLowerCase() as any) || 'medium'
      };
      
      console.log(`❓ [澄清需求] LLM识别需要澄清的信息:`, result);
      return result;
    }
    
    // 🎯 解析CONTINUE状态
    if (response.includes('COLLECTION_STATUS: CONTINUE')) {
      const focusMatch = response.match(/NEXT_FOCUS:\s*(.+?)(?=\n|$)/);
      const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=\n|$)/);
      const priorityMatch = response.match(/PRIORITY:\s*(high|medium|low)/i);
      
      const result = {
        action: 'CONTINUE' as const,
        nextFocus: focusMatch?.[1]?.trim(),
        reasoning: reasoningMatch?.[1]?.trim(),
        priority: (priorityMatch?.[1]?.toLowerCase() as any) || 'medium'
      };
      
      console.log(`🔄 [继续收集] LLM建议继续收集信息:`, result);
      return result;
    }
    
    // 🎯 智能推理：如果没有明确标识，基于内容推断
    console.log(`🤔 [智能推理] 未发现明确状态标识，开始内容分析...`);
    
    // 推理信息是否充足
    const completionKeywords = ['足够', '完成', '准备好', '可以开始', '进入下一步', '设计', '开始制作'];
    const continuationKeywords = ['还需要', '更多信息', '补充', '详细说明', '继续提供'];
    const clarificationKeywords = ['不清楚', '需要确认', '请问', '能否说明', '希望了解'];
    
    const hasCompletion = completionKeywords.some(keyword => response.includes(keyword));
    const hasContinuation = continuationKeywords.some(keyword => response.includes(keyword));
    const hasClarification = clarificationKeywords.some(keyword => response.includes(keyword));
    
    if (hasCompletion && !hasContinuation) {
      console.log(`✨ [智能推理] 基于关键词推断：准备推进`);
      return {
        action: 'READY_TO_ADVANCE',
        summary: '基于内容分析，信息收集已基本完成',
        confidenceLevel: 'MEDIUM',
        reasoning: '智能推理：LLM表达了完成信号'
      };
    }
    
    if (hasClarification) {
      console.log(`✨ [智能推理] 基于关键词推断：需要澄清`);
      return {
        action: 'NEED_CLARIFICATION',
        clarificationFocus: '基于内容分析识别的澄清需求',
        reasoning: '智能推理：LLM提出了问题或澄清需求'
      };
    }
    
    if (hasContinuation) {
      console.log(`✨ [智能推理] 基于关键词推断：继续收集`);
      return {
        action: 'CONTINUE',
        nextFocus: '基于内容分析的建议收集方向',
        reasoning: '智能推理：LLM建议继续收集更多信息'
      };
    }
    
    console.warn(`⚠️ [状态未知] 无法解析LLM的意图，使用默认CONTINUE策略`);
    return { 
      action: 'UNKNOWN',
      reasoning: '无法明确解析LLM的状态判断'
    };
  }

  /**
   * 基于LLM决策创建推进响应
   */
  private createAdvanceResponseFromLLM(
    status: any, 
    successfulResults: any[], 
    sessionData: SessionData
  ): StreamableAgentResponse {
    const progress = this.calculateCollectionProgress(sessionData.collectedData);
    
    return this.createResponse({
      immediate_display: {
        reply: `✅ 信息收集完成！\n\n${status.summary || '已成功收集到足够的信息'}\n\n可信度：${status.confidenceLevel}\n收集完整度：${Math.round(progress * 100)}%\n\n现在开始为您设计页面结构... 🎨`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 90,
        current_stage: '信息收集完成',
        metadata: {
          llm_decision: true,
          confidence_level: status.confidenceLevel,
          collection_progress: progress,
          ready_for_design: true
        }
      }
    });
  }

  /**
   * 基于LLM决策创建澄清响应
   */
  private createClarificationResponseFromLLM(status: any): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: `🤔 为了更好地帮助您，我需要确认一些信息：\n\n${status.clarificationFocus || '请提供更多详细信息'}\n\n您可以详细说明一下吗？`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'continue_collection',
        done: false,
        progress: 50,
        current_stage: '需要澄清信息',
        metadata: {
          llm_decision: true,
          clarification_needed: status.clarificationFocus
        }
      }
    });
  }

  /**
   * 基于LLM决策创建继续收集响应
   */
  private createContinueResponseFromLLM(
    status: any,
    successfulResults: any[],
    failedResults: any[]
  ): StreamableAgentResponse {
    const progress = 60; // LLM认为还需要继续，给一个中等进度
    
    let message = `📊 ${status.nextFocus ? `接下来我们重点关注：${status.nextFocus}` : '让我们继续收集更多信息'}`;
    
    if (successfulResults.length > 0) {
      message += `\n\n已收集：${this.generateCollectionSummary(successfulResults)}`;
    }
    
    if (failedResults.length > 0) {
      message += `\n\n⚠️ 部分信息暂时无法获取，您可以提供其他材料或直接告诉我相关信息。`;
    }
    
    return this.createResponse({
      immediate_display: {
        reply: message,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'continue_collection',
        done: false,
        progress: progress,
        current_stage: '继续信息收集',
        metadata: {
          llm_decision: true,
          next_focus: status.nextFocus,
          collection_suggestions: ['继续提供材料', '补充信息', '直接描述']
        }
      }
    });
  }

  /**
   * 判断是否应该推进到下一阶段
   */
  private shouldAdvanceToNextStage(sessionData: SessionData): boolean {
    const progress = this.calculateCollectionProgress(sessionData.collectedData);
    const welcomeData = this.extractWelcomeData(sessionData);
    
    // 根据紧急程度调整推进阈值
    const thresholds = {
      '快速体验': 0.3,
      '正常': 0.6,
      '详细准备': 0.8
    };
    
    const threshold = thresholds[welcomeData.urgency as keyof typeof thresholds] || 0.6;
    return progress >= threshold;
  }

  /**
   * 计算收集进度
   */
  private calculateCollectionProgress(collectedData: any): number {
    if (!collectedData) return 0;
    
    const weights = {
      personal: 0.1,
      professional: 0.3,
      projects: 0.25,
      experience: 0.2,
      skills: 0.1,
      documents: 0.05
    };
    
    let totalScore = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      const data = collectedData[key];
      const hasData = data && (
        Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0
      );
      if (hasData) totalScore += weight;
    });
    
    return Math.min(totalScore, 1.0);
  }

  /**
   * 创建失败响应
   */
  private createFailureResponse(failedResults: any[], analysisResult: any): StreamableAgentResponse {
    const errorMessages = failedResults.map(r => `• ${r.error}`).join('\n');
    
    return this.createResponse({
      immediate_display: {
        reply: `❌ 抱歉，我在分析您提供的信息时遇到了一些问题：\n\n${errorMessages}\n\n请检查链接是否正确，或者您可以：\n• 提供其他格式的材料\n• 直接告诉我相关信息\n• 选择跳过继续下一步`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'retry_collection',
        done: false,
        progress: 30,
        current_stage: '信息收集失败',
        metadata: {
          failed_tools: failedResults.map(r => r.tool_name),
          suggestions: ['检查链接有效性', '尝试其他材料', '跳过此步骤']
        }
      }
    });
  }

  /**
   * 创建推进响应
   */
  private createAdvanceResponse(successfulResults: any[], sessionData: SessionData): StreamableAgentResponse {
    const summary = this.generateCollectionSummary(successfulResults);
    const progress = this.calculateCollectionProgress(sessionData.collectedData);
    
    return this.createResponse({
      immediate_display: {
        reply: `✅ 信息收集完成！我已经成功分析了您提供的材料：\n\n${summary}\n\n收集完整度：${Math.round(progress * 100)}%\n\n现在开始为您设计页面结构... 🎨`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 90,
        current_stage: '信息收集完成',
        metadata: {
          collection_progress: progress,
          successful_tools: successfulResults.map(r => r.tool_name),
          ready_for_design: true
        }
      }
    });
  }

  /**
   * 创建继续收集响应
   */
  private createContinueResponse(
    successfulResults: any[], 
    failedResults: any[], 
    sessionData: SessionData
  ): StreamableAgentResponse {
    const summary = this.generateCollectionSummary(successfulResults);
    const progress = this.calculateCollectionProgress(sessionData.collectedData);
    
    let message = `📊 已成功分析您提供的信息：\n\n${summary}\n\n当前完整度：${Math.round(progress * 100)}%`;
    
    if (failedResults.length > 0) {
      message += `\n\n⚠️ 部分信息无法获取：\n${failedResults.map(r => `• ${r.error}`).join('\n')}`;
    }
    
    message += '\n\n您可以：\n• 继续提供更多材料（GitHub、作品链接、简历等）\n• 补充无法获取的信息\n• 或者选择"开始设计"继续下一步';
    
    return this.createResponse({
      immediate_display: {
        reply: message,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'continue_collection',
        done: false,
        progress: Math.round(progress * 100),
        current_stage: '继续收集材料',
        metadata: {
          collection_progress: progress,
          successful_tools: successfulResults.map(r => r.tool_name),
          failed_tools: failedResults.map(r => r.tool_name),
          suggestions: ['提供更多链接', '上传文档', '开始设计']
        }
      }
    });
  }

  /**
   * 生成收集摘要
   */
  private generateCollectionSummary(results: any[]): string {
    if (results.length === 0) return '暂无成功收集的信息';
    
    const summaries: string[] = [];
    
    results.forEach(result => {
      switch (result.tool_name) {
        case 'analyze_github':
          const github = result.data;
          summaries.push(`🐙 GitHub: ${github.profile?.name || github.username} (${github.top_repositories?.length || 0}个仓库)`);
          break;
        case 'scrape_webpage':
          const webpage = result.data;
          summaries.push(`🌐 网页: ${webpage.title} (${webpage.type}类型)`);
          break;
        case 'extract_linkedin':
          const linkedin = result.data;
          summaries.push(`💼 LinkedIn: ${linkedin.profile?.name} (${linkedin.profile?.title})`);
          break;
        case 'parse_document':
          const doc = result.data;
          summaries.push(`📄 文档: ${doc.type} (${doc.file_type}格式)`);
          break;
      }
    });
    
    return summaries.join('\n');
  }

  // ============== 辅助方法 ==============

  private extractWelcomeData(sessionData: SessionData): any {
    const metadata = sessionData.metadata as any;
    
    // 🆕 优先读取新的welcomeSummary数据
    const welcomeSummary = metadata?.welcomeSummary;
    if (welcomeSummary?.summary) {
      console.log(`📋 [数据读取] 从welcomeSummary读取用户数据:`, welcomeSummary.summary);
      
      // 字段映射：新格式 → 旧格式兼容
      return {
        userRole: welcomeSummary.summary.user_role,
        useCase: welcomeSummary.summary.use_case,
        style: welcomeSummary.summary.style,
        urgency: this.mapUseCaseToUrgency(welcomeSummary.summary.use_case),
        highlight_focus: welcomeSummary.summary.highlight_focus,
        // 保留完整的welcomeSummary供其他地方使用
        welcomeSummary: welcomeSummary
      };
    }
    
    // 🔄 降级：尝试读取旧的intentData格式
    const intentData = metadata?.intentData;
    if (intentData) {
      console.log(`📋 [数据读取] 从intentData读取用户数据（降级模式）:`, intentData);
      return intentData;
    }
    
    // 🔄 降级：尝试读取collectedInfo
    const collectedInfo = metadata?.collectedInfo;
    if (collectedInfo) {
      console.log(`📋 [数据读取] 从collectedInfo读取用户数据（最终降级）:`, collectedInfo);
      return {
        userRole: collectedInfo.user_role || '用户',
        useCase: collectedInfo.use_case || '创建个人页面',
        style: collectedInfo.style || '简约',
        urgency: '正常'
      };
    }
    
    console.warn(`⚠️ [数据读取] 未找到Welcome Agent数据，使用默认值`);
    return {
      userRole: '新用户',
      useCase: '创建个人页面', 
      style: '简约',
      urgency: '正常'
    };
  }

  /**
   * 🔄 将使用目的映射为紧急程度（兼容性处理）
   */
  private mapUseCaseToUrgency(useCase: string): string {
    const urgencyMap: Record<string, string> = {
      '快速体验': '快速体验',
      '试试看': '快速体验',
      '求职展示': '详细准备',
      '作品集': '详细准备',
      '个人品牌': '正常',
      '创建个人页面': '正常'
    };
    
    return urgencyMap[useCase] || '正常';
  }

  private getCurrentCollectedData(sessionData: SessionData): any {
    return sessionData.collectedData || {};
  }

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

  // ============== 轮次管理方法 ==============

  /**
   * 获取当前轮次数
   */
  private getTurnCount(sessionData: SessionData): number {
    const metadata = sessionData.metadata as any;
    return metadata?.turnCount || 0;
  }

  /**
   * 获取最大轮次限制
   */
  private getMaxTurns(sessionData: SessionData): number {
    const welcomeData = this.extractWelcomeData(sessionData);
    
    // 根据紧急程度设置不同的轮次限制
    const maxTurns = {
      '快速体验': 3,
      '正常': 6,
      '详细准备': 8
    };
    
    return maxTurns[welcomeData.urgency as keyof typeof maxTurns] || 6;
  }

  /**
   * 增加轮次计数
   */
  private incrementTurnCount(sessionData: SessionData): void {
    if (!sessionData.metadata) {
      // 如果metadata不存在，使用any类型来绕过类型检查
      (sessionData as any).metadata = {};
    }
    ((sessionData as any).metadata).turnCount = this.getTurnCount(sessionData) + 1;
  }

  /**
   * 创建强制推进响应（轮次达到上限）
   */
  private createForceAdvanceResponse(sessionData: SessionData): StreamableAgentResponse {
    const progress = this.calculateCollectionProgress(sessionData.collectedData);
    const currentTurn = this.getTurnCount(sessionData);
    
    return this.createResponse({
      immediate_display: {
        reply: `⏰ 我们已经进行了 ${currentTurn} 轮信息收集，现在让我们基于已有信息开始设计您的页面！\n\n收集完整度：${Math.round(progress * 100)}%\n\n如果后续需要补充信息，我们可以在设计过程中随时调整。现在开始创建您的专属页面... 🎨`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: Math.max(progress * 100, 75), // 确保至少75%进度
        current_stage: '轮次限制推进',
        metadata: {
          force_advance: true,
          turn_limit_reached: true,
          final_turn: currentTurn,
          collection_progress: progress
        }
      }
    });
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============== 试一试用户处理方法 ==============

  /**
   * 🎲 处理"试一试"用户 - 使用示例数据快速体验
   */
  private async* handleTrialUserWithSamples(
    welcomeSummary: any,
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`🎲 [示例数据模式] 为用户生成适合的示例数据...`);
    
    yield this.createThinkingResponse('🎯 为您准备合适的示例数据...', 30);
    await this.delay(1200);
    
    // 根据用户身份生成对应的示例数据
    const sampleData = this.generateSampleDataByRole(welcomeSummary.summary.user_role);
    
    yield this.createThinkingResponse('✨ 示例数据准备完成，正在创建演示页面...', 70);
    await this.delay(800);
    
    // 将示例数据填充到会话中
    this.fillSessionWithSampleData(sessionData, sampleData);
    
    // 直接推进到下一阶段
    yield this.createTrialAdvanceResponse(sampleData, welcomeSummary, sessionData);
  }

  /**
   * 🎯 根据用户身份生成示例数据
   */
  private generateSampleDataByRole(userRole: string): any {
    const sampleTemplates = {
      '前端开发者': {
        personal: {
          name: 'Alex Chen',
          title: '前端开发工程师',
          bio: '专注于React和Vue.js开发，热爱创建优雅的用户界面'
        },
        professional: {
          skills: ['React', 'Vue.js', 'TypeScript', 'Node.js', 'Tailwind CSS'],
          github: {
            username: 'alexchen-dev',
            top_repositories: ['awesome-react-components', 'vue-dashboard-kit', 'typescript-utils'],
            total_stars: 1247
          }
        },
        projects: [
          {
            name: 'React Dashboard',
            description: '现代化管理面板，支持暗色模式和响应式设计',
            tech_stack: ['React', 'TypeScript', 'Tailwind CSS'],
            demo_url: 'https://demo.example.com'
          },
          {
            name: 'Vue组件库',
            description: '轻量级Vue3组件库，已发布到npm',
            tech_stack: ['Vue3', 'TypeScript', 'Vite']
          }
        ]
      },
      '设计师': {
        personal: {
          name: 'Sarah Liu',
          title: 'UI/UX设计师',
          bio: '专注于用户体验设计，善于将复杂的需求转化为简洁优雅的界面'
        },
        professional: {
          skills: ['Figma', 'Sketch', 'Adobe Creative Suite', '用户研究', '交互设计'],
          portfolio: {
            behance_url: 'https://behance.net/sarahdesign',
            dribbble_url: 'https://dribbble.com/sarahdesign'
          }
        },
        projects: [
          {
            name: '移动银行App重设计',
            description: '简化用户流程，提升转化率30%',
            category: 'Mobile App Design'
          },
          {
            name: '企业官网设计系统',
            description: '建立统一的设计语言和组件库',
            category: 'Web Design'
          }
        ]
      },
      '产品经理': {
        personal: {
          name: 'David Wang',
          title: '高级产品经理',
          bio: '5年产品经验，擅长B2B SaaS产品设计和数据驱动的产品决策'
        },
        professional: {
          skills: ['产品策略', '用户研究', '数据分析', 'Scrum', 'Figma'],
          linkedin: {
            profile: {
              name: 'David Wang',
              title: '高级产品经理 @ TechCorp'
            }
          }
        },
        experience: [
          {
            company: 'TechCorp',
            position: '高级产品经理',
            duration: '2022-至今',
            achievements: ['产品用户增长200%', '成功推出3个核心功能']
          }
        ]
      },
      'AI工程师': {
        personal: {
          name: 'Emily Zhang',
          title: 'AI工程师',
          bio: '专注于机器学习和深度学习应用，在计算机视觉领域有丰富经验'
        },
        professional: {
          skills: ['Python', 'TensorFlow', 'PyTorch', 'Computer Vision', 'NLP'],
          github: {
            username: 'emily-ai',
            top_repositories: ['cv-toolkit', 'nlp-models', 'ml-pipeline']
          }
        },
        projects: [
          {
            name: '智能图像识别系统',
            description: '基于深度学习的实时图像分类和目标检测',
            tech_stack: ['Python', 'TensorFlow', 'OpenCV']
          }
        ]
      }
    };

         // 匹配用户身份，如果没有完全匹配则使用默认模板
     return (sampleTemplates as any)[userRole] || sampleTemplates['前端开发者'];
  }

  /**
   * 📋 将示例数据填充到会话中
   */
  private fillSessionWithSampleData(sessionData: SessionData, sampleData: any): void {
    if (!sessionData.collectedData) {
      sessionData.collectedData = {
        personal: {},
        professional: { skills: [] },
        experience: [],
        education: [],
        projects: [],
        achievements: [],
        certifications: []
      };
    }

    // 填充示例数据
    Object.assign(sessionData.collectedData, sampleData);
    
    // 标记为示例数据
    const metadata = sessionData.metadata as any;
    metadata.isTrialMode = true;
    metadata.sampleDataSource = '系统生成';
    metadata.collectionProgress = 0.85; // 示例数据给较高完成度
  }

  /**
   * 🚀 创建试一试用户的推进响应
   */
  private createTrialAdvanceResponse(
    sampleData: any,
    welcomeSummary: any,
    sessionData: SessionData
  ): StreamableAgentResponse {
    const userName = sampleData.personal?.name || '示例用户';
    const userTitle = sampleData.personal?.title || '专业人士';
    
    return this.createResponse({
      immediate_display: {
        reply: `🎉 太棒了！我已经为您准备了一份示例页面：\n\n👤 **${userName}** - ${userTitle}\n${sampleData.personal?.bio || '专业简介示例'}\n\n🛠️ **技能展示**：${sampleData.professional?.skills?.slice(0, 3).join('、') || '专业技能'}等\n\n📋 **项目案例**：${sampleData.projects?.length || 2}个精选项目\n\n✨ 这个示例展示了根据您的身份（${welcomeSummary.summary.user_role}）定制的页面效果。\n\n现在开始为您生成实际的页面代码... 🎨`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 85,
        current_stage: '示例数据体验完成',
        metadata: {
          trial_mode: true,
          sample_data_used: true,
          user_role: welcomeSummary.summary.user_role,
          ready_for_design: true,
          collection_method: 'sample_data'
        }
      }
    });
  }
} 