import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
import { toolService } from '@/lib/services/tool-service';
import { enhancedLinkAnalyzer, LinkAnalysisResult } from '@/lib/services/enhanced-link-analyzer';
import { intelligentLinkProcessor, ProcessedLinkResult } from '@/lib/services/intelligent-link-processor';

/**
 * 工具定义接口
 */
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

/**
 * 工具调用结果
 */
interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 升级版Info Collection Agent - 对话式+工具调用
 */
export class ConversationalInfoCollectionAgent extends BaseAgent {
  name = '对话式信息收集助手';
  private tools: Map<string, Tool> = new Map();
  private sessionData!: SessionData; // 使用断言操作符，因为在process方法中会设置

  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false, // 不再需要表单交互
      outputFormats: ['json', 'text'],
      maxRetries: 3,
      timeout: 30000
    };
    
    super('ConversationalInfoCollectionAgent', capabilities);
    this.initializeTools();
  }

  /**
   * 初始化工具集
   */
  private initializeTools(): void {
    // 链接分析工具
    this.tools.set('analyze_link', {
      name: 'analyze_link',
      description: '分析用户提供的链接，判断类型并提取信息',
      parameters: {
        url: 'string',
        expected_type: 'string' // github, linkedin, portfolio, blog等
      },
      execute: this.analyzeLinkTool.bind(this)
    });

    // 文档解析工具
    this.tools.set('parse_document', {
      name: 'parse_document',
      description: '解析上传的文档内容',
      parameters: {
        file_data: 'string', // base64或文件路径
        file_type: 'string'  // pdf, docx, txt等
      },
      execute: this.parseDocumentTool.bind(this)
    });

    // 网页内容抓取工具
    this.tools.set('scrape_webpage', {
      name: 'scrape_webpage',
      description: '抓取网页内容并提取结构化信息',
      parameters: {
        url: 'string',
        target_sections: 'array' // ['about', 'experience', 'projects']
      },
      execute: this.scrapeWebpageTool.bind(this)
    });

    // GitHub分析工具
    this.tools.set('analyze_github', {
      name: 'analyze_github',
      description: '深度分析GitHub仓库和用户信息',
      parameters: {
        username_or_url: 'string',
        include_repos: 'boolean'
      },
      execute: this.analyzeGithubTool.bind(this)
    });

    // LinkedIn信息提取工具
    this.tools.set('extract_linkedin', {
      name: 'extract_linkedin',
      description: '从LinkedIn链接提取职业信息',
      parameters: {
        profile_url: 'string'
      },
      execute: this.extractLinkedinTool.bind(this)
    });

    console.log(`✅ [工具初始化] 已注册 ${this.tools.size} 个工具`);
  }

  /**
   * 主处理流程 - 智能对话+工具调用
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`🎯 [对话式收集] 开始处理用户输入: "${input.user_input}"`);
    
    // 保存sessionData到实例属性
    this.sessionData = sessionData;

    try {
      // 提取Welcome Agent传递的信息
      const welcomeData = this.extractWelcomeAgentData(sessionData);
      console.log(`📋 [Welcome信息]`, welcomeData);

      // 第一步：思考中...
      yield this.createThinkingResponse('正在分析您的输入，看看需要什么工具来帮您...', 20);
      await this.delay(1000);

      // 第二步：智能分析用户输入
      const analysisResult = await this.analyzeUserInput(input.user_input, welcomeData, sessionData);
      console.log(`🧠 [分析结果]`, analysisResult);

      // 第三步：执行工具调用（如果需要）
      if (analysisResult.needsToolCalling) {
        yield this.createThinkingResponse(`我发现您提到了${analysisResult.detectedAssets.join('、')}，让我来分析一下...`, 40);
        
        const toolResults = await this.executeTools(analysisResult.toolCalls);
        yield this.createThinkingResponse('分析完成！正在整理收集到的信息...', 70);
        
        // 更新会话数据
        this.updateSessionWithToolResults(sessionData, toolResults);
      }

      // 第四步：生成智能响应
      yield* this.generateIntelligentResponse(analysisResult, sessionData, welcomeData);

    } catch (error) {
      console.error(`❌ [对话式收集Agent错误]`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 提取Welcome Agent传递的信息
   */
  private extractWelcomeAgentData(sessionData: SessionData) {
    const metadata = sessionData.metadata as any;
    const intentData = metadata?.intentData || {};
    
    return {
      userRole: intentData.user_role || '未知身份',
      useCase: intentData.use_case || '未知目的',
      style: intentData.style || '现代简约',
      highlightFocus: intentData.highlight_focus || [],
      urgency: this.determineUrgency(intentData.use_case),
      collectionPriority: this.getCollectionPriority(intentData.user_role)
    };
  }

  /**
   * 智能分析用户输入
   */
  private async analyzeUserInput(
    userInput: string, 
    welcomeData: any, 
    sessionData: SessionData
  ): Promise<any> {
    const prompt = formatPrompt(AGENT_PROMPTS.CONVERSATIONAL_INFO_COLLECTION_AGENT, {
      user_input: userInput,
      user_role: welcomeData.userRole,
      use_case: welcomeData.useCase,
      urgency: welcomeData.urgency,
      collection_priority: JSON.stringify(welcomeData.collectionPriority),
      current_collected_data: JSON.stringify(this.getCurrentCollectedData(sessionData)),
      available_tools: Array.from(this.tools.keys()).join(', ')
    });

    const response = await this.callLLM(prompt, {
      schemaType: 'conversationalAnalysis',
      maxTokens: 2000,
      sessionId: sessionData.id
    });

    return JSON.parse(response);
  }

  /**
   * 执行工具调用
   */
  private async executeTools(toolCalls: any[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        const tool = this.tools.get(toolCall.tool_name);
        if (!tool) {
          results.push({
            success: false,
            error: `工具 ${toolCall.tool_name} 不存在`
          });
          continue;
        }

        console.log(`🔧 [工具调用] 执行 ${toolCall.tool_name}`, toolCall.parameters);
        const result = await tool.execute(toolCall.parameters);
        
        results.push({
          success: true,
          data: result,
          metadata: { tool: toolCall.tool_name, parameters: toolCall.parameters }
        });

      } catch (error) {
        console.error(`❌ [工具执行失败] ${toolCall.tool_name}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : '工具执行失败',
          metadata: { tool: toolCall.tool_name }
        });
      }
    }

    return results;
  }

  /**
   * 生成智能响应
   */
  private async* generateIntelligentResponse(
    analysisResult: any,
    sessionData: SessionData,
    welcomeData: any
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    
    // 根据分析结果决定响应类型
    if (analysisResult.action === 'advance_to_next_stage') {
      // 信息收集完成，推进到下一阶段
      yield this.createAdvanceResponse(analysisResult, sessionData);
    } else if (analysisResult.action === 'continue_conversation') {
      // 继续对话收集
      yield this.createContinueConversationResponse(analysisResult, welcomeData);
    } else if (analysisResult.action === 'clarify_user_input') {
      // 需要澄清用户输入
      yield this.createClarificationResponse(analysisResult);
    } else if (analysisResult.action === 'provide_suggestions') {
      // 提供建议和指导
      yield this.createSuggestionResponse(analysisResult, welcomeData);
    }
  }

  // ============== 工具实现 ==============

  /**
   * 增强的智能链接分析工具 - 使用新的双层架构
   */
  private async analyzeLinkTool(params: { url: string; expected_type?: string }): Promise<any> {
    const { url, expected_type } = params;
    
    console.log(`🎯 [智能链接处理] 开始处理: ${url}`);
    
    try {
      // 获取用户上下文信息
      const userContext = this.buildUserContext();
      
      // 获取可用工具列表
      const availableTools = Array.from(this.tools.keys());
      
      // 使用智能链接处理器进行双层分析
      const processedResult: ProcessedLinkResult = await intelligentLinkProcessor.processLink(
        url, 
        userContext, 
        availableTools
      );
      
      console.log(`✅ [智能处理完成]`, {
        contentType: processedResult.analysis.content_type,
        integrationType: processedResult.integration.integration_type,
        priority: processedResult.integration.priority,
        confidence: processedResult.analysis.confidence
      });
      
      // 将处理结果转换为统一的返回格式
      return this.formatProcessedLinkResult(processedResult);
      
    } catch (error) {
      console.error(`❌ [智能链接处理失败]`, error);
      
      // 回退到增强链接分析器
      console.log(`🔄 [回退处理] 使用增强链接分析器`);
      return await this.fallbackToEnhancedAnalysis(url);
    }
  }

  /**
   * 构建用户上下文信息
   */
  private buildUserContext(): any {
    const welcomeData = this.extractWelcomeAgentData(this.sessionData);
    const collectedData = this.getCurrentCollectedData(this.sessionData);
    
    return {
      role: welcomeData.userRole,
      goals: [welcomeData.useCase],
      current_content: Object.keys(collectedData),
      style: welcomeData.style,
      urgency: welcomeData.urgency,
      priority_focus: welcomeData.highlightFocus
    };
  }

  /**
   * 格式化处理结果为统一格式
   */
  private formatProcessedLinkResult(processedResult: ProcessedLinkResult): any {
    const { analysis, integration, llm_reasoning } = processedResult;
    
    return {
      // 基础信息
      platform: analysis.platform,
      type: analysis.content_type,
      url: processedResult.url,
      
      // 提取的内容数据
      extracted_data: analysis.extracted_data,
      content_highlights: analysis.extracted_data.metadata?.highlights || [],
      technical_details: analysis.extracted_data.technical_details,
      
      // 展示集成建议
      integration_recommendation: {
        type: integration.integration_type,
        priority: integration.priority,
        section: integration.section_placement,
        display_config: integration.display_config,
        processed_content: integration.content_processing
      },
      
      // LLM分析和建议
      llm_analysis: {
        content_assessment: llm_reasoning.content_assessment,
        integration_rationale: llm_reasoning.integration_rationale,
        user_benefit: llm_reasoning.user_benefit,
        optimization_tips: llm_reasoning.optimization_tips || [],
        next_suggestions: llm_reasoning.next_suggestions || []
      },
      
      // 元数据
      metadata: {
        extraction_method: analysis.extraction_method,
        confidence: analysis.confidence,
        processing_timestamp: new Date().toISOString(),
        user_context: processedResult.user_context
      }
    };
  }

  /**
   * 回退到增强链接分析器
   */
  private async fallbackToEnhancedAnalysis(url: string): Promise<any> {
    try {
      const userContext = this.extractWelcomeAgentData(this.sessionData);
      const analysisResult: LinkAnalysisResult = await enhancedLinkAnalyzer.analyzeLink(url, userContext);
      
      // 执行基于分析结果的处理
      return await this.executeBasedOnAnalysis(analysisResult);
      
    } catch (error) {
      console.error(`❌ [增强分析也失败]`, error);
      
      // 最终回退到基础处理
      return await this.fallbackLinkAnalysis(url);
    }
  }

  /**
   * 根据分析结果执行相应的处理策略
   */
  private async executeBasedOnAnalysis(analysis: LinkAnalysisResult): Promise<any> {
    const { url, suggested_extraction, detected_type, platform, metadata } = analysis;
    
    console.log(`🎯 [执行策略] ${suggested_extraction.method} | ${detected_type}`);
    
    switch (suggested_extraction.method) {
      case 'api':
        // 使用API调用
        if (platform === 'github') {
          return await this.analyzeGithubTool({ username_or_url: url, include_repos: true });
        } else if (platform === 'linkedin') {
          return await this.extractLinkedinTool({ profile_url: url });
        } else {
          // 其他API调用
          return await this.handleApiExtraction(analysis);
        }
        
      case 'iframe':
        // 适合iframe展示的内容
        return await this.createIframeRecommendation(analysis);
        
      case 'scrape':
      case 'scrape_with_iframe_option':
        // 网页抓取
        return await this.scrapeWebpageTool({ 
          url, 
          target_sections: suggested_extraction.sections 
        });
        
      case 'manual':
        // 需要手动处理
        return await this.createManualProcessingRecommendation(analysis);
        
      default:
        // 默认处理
        console.log(`⚠️ [未知方法] ${suggested_extraction.method}，使用默认抓取`);
        return await this.scrapeWebpageTool({ url, target_sections: ['all'] });
    }
  }

  /**
   * 处理API提取
   */
  private async handleApiExtraction(analysis: LinkAnalysisResult): Promise<any> {
    const { platform, url, detected_type } = analysis;
    
    console.log(`🔌 [API提取] ${platform} | ${detected_type}`);
    
    // 根据平台类型选择API策略
    const apiStrategies: Record<string, () => Promise<any>> = {
      'huggingface': () => this.extractHuggingFaceData(url),
      'kaggle': () => this.extractKaggleData(url),
      'codepen': () => this.extractCodepenData(url),
      'youtube': () => this.extractYouTubeData(url),
      'notion': () => this.extractNotionData(url)
    };
    
    const apiHandler = apiStrategies[platform];
    if (apiHandler) {
      try {
        return await apiHandler();
      } catch (error) {
        console.error(`❌ [API提取失败] ${platform}:`, error);
        // 回退到抓取策略
        return await this.scrapeWebpageTool({ url, target_sections: ['all'] });
      }
    }
    
    // 没有专门的API处理器，使用通用抓取
    return await this.scrapeWebpageTool({ url, target_sections: analysis.suggested_extraction.sections });
  }

  /**
   * 创建iframe展示建议
   */
  private async createIframeRecommendation(analysis: LinkAnalysisResult): Promise<any> {
    const { url, detected_type, metadata, suggested_extraction } = analysis;
    
    console.log(`🖼️ [iframe建议] ${detected_type}`);
    
    return {
      platform: 'iframe_display',
      type: 'visual_showcase',
      url,
      detected_type,
      display_recommendation: {
        method: 'iframe',
        width: '100%',
        height: '600px',
        responsive: true,
        fallback_available: true
      },
      metadata: {
        title: metadata.title || '项目展示',
        description: metadata.description || '用户提供的项目链接',
        category: analysis.content_category,
        reasoning: suggested_extraction.reasoning,
        confidence: analysis.confidence
      },
      extracted_info: {
        type: 'iframe_content',
        url,
        preview_available: true,
        direct_link: true,
        technology_stack: metadata.technology_stack || []
      }
    };
  }

  /**
   * 创建手动处理建议
   */
  private async createManualProcessingRecommendation(analysis: LinkAnalysisResult): Promise<any> {
    const { url, detected_type, suggested_extraction } = analysis;
    
    console.log(`✋ [手动处理] ${detected_type}`);
    
    return {
      platform: 'manual_processing',
      type: 'requires_user_input',
      url,
      detected_type,
      manual_recommendation: {
        reason: suggested_extraction.reasoning,
        suggestions: [
          '请描述这个链接的主要内容',
          '这个项目/页面最重要的特点是什么？',
          '您希望在简历中如何展示这个内容？'
        ],
        alternative_actions: [
          '提供更多相关链接',
          '上传相关截图',
          '跳过这个链接'
        ]
      },
      metadata: {
        analysis_confidence: analysis.confidence,
        detected_issues: '链接内容无法自动分析',
        user_guidance: '需要用户提供更多信息来有效利用这个资源'
      }
    };
  }

  /**
   * 回退到基础链接分析（原有逻辑）
   */
  private async fallbackLinkAnalysis(url: string): Promise<any> {
    console.log(`🔄 [基础分析] ${url}`);
    
    // 使用原有的简单域名匹配逻辑
    const linkType = this.detectLinkType(url);
    
    switch (linkType) {
      case 'github':
        return this.analyzeGithubTool({ username_or_url: url, include_repos: true });
      case 'linkedin':
        return this.extractLinkedinTool({ profile_url: url });
      case 'portfolio':
        return this.scrapeWebpageTool({ url, target_sections: ['about', 'projects', 'skills'] });
      case 'blog':
        return this.scrapeWebpageTool({ url, target_sections: ['about', 'posts', 'bio'] });
      default:
        return this.scrapeWebpageTool({ url, target_sections: ['all'] });
    }
  }

  // ============== 新增的平台特定API提取方法 ==============

  private async extractHuggingFaceData(url: string): Promise<any> {
    console.log(`🤗 [Hugging Face提取] ${url}`);
    // 实现Hugging Face API调用
    return {
      platform: 'huggingface',
      type: 'ai_models',
      models: [],
      datasets: [],
      user_profile: {}
    };
  }

  private async extractKaggleData(url: string): Promise<any> {
    console.log(`📊 [Kaggle提取] ${url}`);
    // 实现Kaggle API调用
    return {
      platform: 'kaggle',
      type: 'data_science',
      competitions: [],
      datasets: [],
      notebooks: []
    };
  }

  private async extractCodepenData(url: string): Promise<any> {
    console.log(`🖊️ [CodePen提取] ${url}`);
    // 实现CodePen API调用
    return {
      platform: 'codepen',
      type: 'code_showcase',
      pens: [],
      collections: []
    };
  }

  private async extractYouTubeData(url: string): Promise<any> {
    console.log(`📺 [YouTube提取] ${url}`);
    // 实现YouTube API调用
    return {
      platform: 'youtube',
      type: 'video_content',
      videos: [],
      channel_info: {}
    };
  }

  private async extractNotionData(url: string): Promise<any> {
    console.log(`📝 [Notion提取] ${url}`);
    // 实现Notion API调用  
    return {
      platform: 'notion',
      type: 'documentation',
      pages: [],
      databases: []
    };
  }

  // ============== 辅助方法 ==============

  private detectLinkType(url: string): string {
    if (url.includes('github.com')) return 'github';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('behance.net') || url.includes('dribbble.com')) return 'portfolio';
    if (url.includes('blog') || url.includes('medium.com')) return 'blog';
    return 'general';
  }

  private determineUrgency(useCase: string): string {
    if (useCase?.includes('面试') || useCase?.includes('求职')) return 'high';
    if (useCase?.includes('展示') || useCase?.includes('客户')) return 'medium';
    return 'low';
  }

  private getCollectionPriority(userRole: string): string[] {
    const priorities: Record<string, string[]> = {
      '开发者': ['github', 'resume', 'blog', 'projects'],
      '设计师': ['portfolio', 'behance', 'dribbble', 'resume'],
      '产品经理': ['linkedin', 'resume', 'products', 'cases'],
      'default': ['resume', 'linkedin', 'portfolio', 'projects']
    };
    
    return priorities[userRole] || priorities.default;
  }

  private getCurrentCollectedData(sessionData: SessionData): any {
    return sessionData.collectedData || {};
  }

  private updateSessionWithToolResults(sessionData: SessionData, toolResults: ToolExecutionResult[]): void {
    if (!sessionData.collectedData) {
      sessionData.collectedData = {} as any;
    }

    for (const result of toolResults) {
      if (result.success && result.data) {
        // 根据数据类型更新相应字段
        this.mergeCollectedData(sessionData.collectedData as any, result.data);
      }
    }

    // 更新元数据
    const metadata = sessionData.metadata as any;
    metadata.lastToolExecution = {
      timestamp: new Date().toISOString(),
      results: toolResults.length,
      successful: toolResults.filter(r => r.success).length
    };
  }

  private mergeCollectedData(existing: any, newData: any): void {
    // 智能合并数据逻辑
    if (newData.platform === 'github') {
      existing.github = newData;
      if (newData.top_repositories) {
        existing.projects = [...(existing.projects || []), ...newData.top_repositories];
      }
    } else if (newData.platform === 'linkedin') {
      existing.linkedin = newData;
      if (newData.experience) {
        existing.experience = [...(existing.experience || []), ...newData.experience];
      }
    } else if (newData.type === 'resume') {
      existing.resume = newData;
      Object.assign(existing, newData.extracted_data);
    }
  }

  // ============== 响应生成方法 ==============

  private createAdvanceResponse(analysisResult: any, sessionData: SessionData): StreamableAgentResponse {
    const collectedData = this.getCurrentCollectedData(sessionData);
    const summary = this.generateCollectionSummary(collectedData);

    return this.createResponse({
      immediate_display: {
        reply: `🎉 太棒了！我已经收集到了充足的信息：\n\n${summary}\n\n现在让我们开始设计您的专属页面吧！`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 75,
        current_stage: '信息收集完成',
        metadata: {
          collection_summary: summary,
          data_sources: Object.keys(collectedData),
          next_stage: 'page_design'
        }
      }
    });
  }

  private createContinueConversationResponse(analysisResult: any, welcomeData: any): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: analysisResult.reply,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'continue',
        done: false,
        progress: 50,
        current_stage: '继续收集信息',
        metadata: {
          next_expected_input: analysisResult.next_expected_input,
          collection_progress: analysisResult.collection_progress
        }
      }
    });
  }

  private createClarificationResponse(analysisResult: any): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: analysisResult.clarification_question,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'clarify',
        done: false,
        progress: 30,
        current_stage: '澄清需求'
      }
    });
  }

  private createSuggestionResponse(analysisResult: any, welcomeData: any): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: analysisResult.suggestion_message,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'suggest',
        done: false,
        progress: 40,
        current_stage: '提供建议',
        metadata: {
          suggestions: analysisResult.suggestions
        }
      }
    });
  }

  private generateCollectionSummary(collectedData: any): string {
    const sources = [];
    if (collectedData.github) sources.push('GitHub仓库');
    if (collectedData.linkedin) sources.push('LinkedIn档案');
    if (collectedData.resume) sources.push('简历文件');
    if (collectedData.portfolio) sources.push('作品集网站');
    
    return sources.length > 0 
      ? `✅ 已收集：${sources.join('、')}`
      : '使用默认模板数据';
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 文档解析工具
   */
  private async parseDocumentTool(params: { file_data: string; file_type: string }): Promise<any> {
    const { file_data, file_type } = params;
    
    console.log(`📄 [文档解析] 类型: ${file_type}`);
    
    // 使用真实的工具服务
    return await toolService.parseDocument(file_data, file_type);
  }

  /**
   * 网页内容抓取工具
   */
  private async scrapeWebpageTool(params: { url: string; target_sections: string[] }): Promise<any> {
    const { url, target_sections } = params;
    
    console.log(`🌐 [网页抓取] ${url}, 目标: ${target_sections.join(', ')}`);
    
    // 使用真实的工具服务
    return await toolService.scrapeWebpage(url, target_sections);
  }

  /**
   * GitHub分析工具
   */
  private async analyzeGithubTool(params: { username_or_url: string; include_repos: boolean }): Promise<any> {
    const { username_or_url, include_repos } = params;
    
    console.log(`🐙 [GitHub分析] ${username_or_url}`);
    
    // 使用真实的工具服务
    return await toolService.analyzeGitHub(username_or_url, include_repos);
  }

  /**
   * LinkedIn信息提取工具
   */
  private async extractLinkedinTool(params: { profile_url: string }): Promise<any> {
    const { profile_url } = params;
    
    console.log(`💼 [LinkedIn提取] ${profile_url}`);
    
    // 使用真实的工具服务
    return await toolService.extractLinkedIn(profile_url);
  }
} 