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
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
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

    // 使用agent-templates中的专业prompt
    const prompt = formatPrompt(AGENT_PROMPTS.OPTIMIZED_INFO_COLLECTION_AGENT, {
      user_role: welcomeData.userRole || '用户',
      use_case: welcomeData.useCase || '创建个人页面',
      urgency: welcomeData.urgency || '正常',
      collection_priority: JSON.stringify(this.getCollectionPriority(welcomeData.userRole)),
      current_collected_data: JSON.stringify(currentData),
      available_tools: Array.from(this.tools.map(t => t.name)).join(', '),
      user_input: userInput
    });

    console.log(`📤 [Claude调用] 使用专业prompt，长度: ${prompt.length}`);
    console.log(`📋 [用户画像] ${welcomeData.userRole} | ${welcomeData.useCase} | ${welcomeData.urgency}`);

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
      analysis_text: textContent,
      detected_resources: detectedResources,
      tool_calls: toolUses.map((tool: any) => ({
        name: tool.name,
        params: tool.input,
        id: tool.id
      })),
      needs_tool_execution: toolUses.length > 0,
      confidence: 0.9
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

    if (successfulResults.length === 0 && toolResults.length > 0) {
      // 所有工具都失败了
      yield this.createFailureResponse(failedResults, analysisResult);
    } else if (this.shouldAdvanceToNextStage(sessionData)) {
      // 材料足够，推进到下一阶段
      yield this.createAdvanceResponse(successfulResults, sessionData);
    } else {
      // 继续收集更多材料
      yield this.createContinueResponse(successfulResults, failedResults, sessionData);
    }
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
    return metadata?.intentData || {};
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

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 