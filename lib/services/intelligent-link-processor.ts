/**
 * 智能链接处理器 - 分离内容解析和展示集成判断
 * 充分利用大模型的判断能力和工具调用能力
 */

export interface ContentAnalysisResult {
  url: string;
  platform: string;
  content_type: string;
  extracted_data: {
    title?: string;
    description?: string;
    author?: string;
    content_summary?: string;
    technical_details?: {
      languages: string[];
      frameworks: string[];
      tools: string[];
    };
    visual_elements?: {
      images: string[];
      videos: string[];
      demos: string[];
    };
    metadata?: Record<string, any>;
  };
  extraction_method: 'api' | 'scrape' | 'hybrid';
  confidence: number;
  raw_data?: any; // 原始提取的数据
}

export interface IntegrationRecommendation {
  integration_type: 'iframe' | 'card' | 'gallery' | 'timeline' | 'skill_badge' | 'text_block' | 'link_only';
  priority: 'high' | 'medium' | 'low';
  section_placement: 'hero' | 'projects' | 'experience' | 'skills' | 'about' | 'contact' | 'footer';
  display_config: {
    layout: string;
    size: 'small' | 'medium' | 'large' | 'full';
    style_hints: string[];
    interactive: boolean;
  };
  content_processing: {
    title: string;
    subtitle?: string;
    description: string;
    tags: string[];
    highlight_points: string[];
  };
  reasoning: string;
  alternative_options?: IntegrationRecommendation[];
}

export interface ProcessedLinkResult {
  url: string;
  analysis: ContentAnalysisResult;
  integration: IntegrationRecommendation;
  user_context: {
    role: string;
    goals: string[];
    current_content: string[];
  };
  llm_reasoning: {
    content_assessment: string;
    integration_rationale: string;
    user_benefit: string;
    optimization_tips?: string[];
    potential_concerns?: string[];
    next_suggestions?: string[];
  };
}

export class IntelligentLinkProcessor {
  private static instance: IntelligentLinkProcessor;
  
  private constructor() {}
  
  public static getInstance(): IntelligentLinkProcessor {
    if (!IntelligentLinkProcessor.instance) {
      IntelligentLinkProcessor.instance = new IntelligentLinkProcessor();
    }
    return IntelligentLinkProcessor.instance;
  }

  /**
   * 主处理流程：内容解析 + 展示集成判断
   */
  async processLink(
    url: string, 
    userContext: any,
    availableTools: string[]
  ): Promise<ProcessedLinkResult> {
    console.log(`🎯 [智能链接处理] 开始处理: ${url}`);
    
    try {
      // 第一阶段：内容解析 - 理解这个链接是什么
      const contentAnalysis = await this.analyzeContent(url, availableTools);
      console.log(`📊 [内容分析完成]`, contentAnalysis);
      
      // 第二阶段：集成判断 - 如何最好地展示到用户页面
      const integrationRecommendation = await this.judgeIntegration(
        contentAnalysis, 
        userContext
      );
      console.log(`🎨 [集成建议完成]`, integrationRecommendation);
      
      // 第三阶段：LLM综合推理 - 生成最终建议和解释
      const llmReasoning = await this.generateLLMReasoning(
        contentAnalysis, 
        integrationRecommendation, 
        userContext
      );
      
      return {
        url,
        analysis: contentAnalysis,
        integration: integrationRecommendation,
        user_context: userContext,
        llm_reasoning: llmReasoning
      };
      
    } catch (error) {
      console.error(`❌ [智能处理失败]`, error);
      return this.createFallbackResult(url, userContext, error);
    }
  }

  /**
   * 第一阶段：内容解析 - 使用工具调用深度理解内容
   */
  private async analyzeContent(
    url: string, 
    availableTools: string[]
  ): Promise<ContentAnalysisResult> {
    console.log(`🔍 [内容解析] ${url}`);
    
    // 1. LLM选择最佳工具组合
    const toolSelection = await this.selectOptimalTools(url, availableTools);
    console.log(`🛠️ [工具选择]`, toolSelection);
    
    // 2. 执行选定的工具
    const toolResults = await this.executeAnalysisTools(url, toolSelection);
    console.log(`⚙️ [工具执行完成]`, toolResults.map(r => r.tool));
    
    // 3. LLM整合分析结果
    const integratedAnalysis = await this.integrateAnalysisResults(url, toolResults);
    
    return integratedAnalysis;
  }

  /**
   * LLM智能选择最佳工具组合
   */
  private async selectOptimalTools(url: string, availableTools: string[]): Promise<any> {
    const prompt = `
作为内容分析专家，请为这个链接选择最佳的分析工具组合：

URL: ${url}
可用工具: ${availableTools.join(', ')}

分析任务：
1. 理解这是什么类型的内容
2. 提取最有价值的信息
3. 为后续展示做准备

请选择2-3个最适合的工具，并说明选择理由：

可用工具说明：
- analyze_github: GitHub仓库和用户分析
- extract_linkedin: LinkedIn职业档案提取
- scrape_webpage: 通用网页内容抓取
- parse_document: 文档内容解析
- analyze_media: 媒体文件分析

返回JSON格式：
{
  "selected_tools": [
    {
      "tool_name": "工具名称",
      "priority": "high/medium/low",
      "parameters": {...},
      "expected_output": "期望获得的信息类型",
      "reasoning": "选择理由"
    }
  ],
  "analysis_strategy": "分析策略说明",
  "fallback_tools": ["备用工具列表"]
}
`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('工具选择失败，使用默认策略:', error);
      return this.getDefaultToolStrategy(url, availableTools);
    }
  }

  /**
   * 执行选定的分析工具
   */
  private async executeAnalysisTools(url: string, toolSelection: any): Promise<any[]> {
    const results = [];
    
    for (const toolConfig of toolSelection.selected_tools) {
      try {
        console.log(`🔧 [执行工具] ${toolConfig.tool_name}`);
        
        // 这里会调用实际的工具服务
        const result = await this.callAnalysisTool(toolConfig.tool_name, {
          url,
          ...toolConfig.parameters
        });
        
        results.push({
          tool: toolConfig.tool_name,
          success: true,
          data: result,
          priority: toolConfig.priority,
          expected_output: toolConfig.expected_output
        });
        
      } catch (error) {
        console.error(`❌ [工具执行失败] ${toolConfig.tool_name}:`, error);
        results.push({
          tool: toolConfig.tool_name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          priority: toolConfig.priority
        });
      }
    }
    
    return results;
  }

  /**
   * LLM整合分析结果
   */
  private async integrateAnalysisResults(url: string, toolResults: any[]): Promise<ContentAnalysisResult> {
    const prompt = `
作为内容分析专家，请整合以下工具分析结果，生成统一的内容分析报告：

URL: ${url}
工具分析结果: ${JSON.stringify(toolResults, null, 2)}

请生成结构化的内容分析：

{
  "url": "${url}",
  "platform": "平台名称",
  "content_type": "内容类型(project/profile/blog/portfolio/document/media)",
  "extracted_data": {
    "title": "内容标题",
    "description": "内容描述",
    "author": "作者信息",
    "content_summary": "内容摘要",
    "technical_details": {
      "languages": ["编程语言"],
      "frameworks": ["框架技术"],
      "tools": ["使用工具"]
    },
    "visual_elements": {
      "images": ["图片链接"],
      "videos": ["视频链接"],
      "demos": ["演示链接"]
    },
    "metadata": {
      "创建时间": "",
      "更新时间": "",
      "标签": [],
      "统计数据": {}
    }
  },
  "extraction_method": "api/scrape/hybrid",
  "confidence": 0.85,
  "content_highlights": ["关键亮点1", "关键亮点2"],
  "content_category": "professional/creative/technical/educational"
}

注意：
1. 优先使用成功工具的结果
2. 合并重复信息，解决冲突
3. 提取最有价值的展示信息
4. 标注信息的可信度
`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('分析结果整合失败:', error);
      return this.createBasicAnalysisResult(url, toolResults);
    }
  }

  /**
   * 第二阶段：展示集成判断 - LLM决定如何最好地展示
   */
  private async judgeIntegration(
    contentAnalysis: ContentAnalysisResult,
    userContext: any
  ): Promise<IntegrationRecommendation> {
    console.log(`🎨 [集成判断] ${contentAnalysis.content_type}`);
    
    const prompt = `
作为用户体验专家，请为以下内容制定最佳的页面集成方案：

内容分析结果:
${JSON.stringify(contentAnalysis, null, 2)}

用户背景:
- 身份角色: ${userContext.role}
- 目标用途: ${userContext.goals?.join(', ')}
- 现有内容: ${userContext.current_content?.join(', ')}
- 页面风格: ${userContext.style}

请制定集成建议：

{
  "integration_type": "iframe/card/gallery/timeline/skill_badge/text_block/link_only",
  "priority": "high/medium/low",
  "section_placement": "hero/projects/experience/skills/about/contact/footer",
  "display_config": {
    "layout": "grid/list/carousel/masonry/timeline",
    "size": "small/medium/large/full",
    "style_hints": ["modern", "minimal", "colorful"],
    "interactive": true/false,
    "preview_type": "thumbnail/iframe/screenshot/none"
  },
  "content_processing": {
    "title": "展示标题",
    "subtitle": "子标题",
    "description": "描述文本(50字内)",
    "tags": ["标签1", "标签2"],
    "highlight_points": ["亮点1", "亮点2"],
    "call_to_action": "查看项目/了解更多"
  },
  "reasoning": "选择这种展示方式的详细理由",
  "user_benefit": "对用户的具体价值",
  "alternative_options": [
    {
      "integration_type": "备选方案1",
      "reasoning": "备选理由",
      "trade_offs": "优缺点对比"
    }
  ]
}

决策考虑因素：
1. 内容类型与用户身份的匹配度
2. 视觉冲击力与信息价值的平衡
3. 页面整体布局的和谐性
4. 用户目标受众的期望
5. 技术可行性和加载性能
`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('集成判断失败:', error);
      return this.createBasicIntegrationRecommendation(contentAnalysis, userContext);
    }
  }

  /**
   * 第三阶段：LLM综合推理 - 生成最终解释和建议
   */
  private async generateLLMReasoning(
    contentAnalysis: ContentAnalysisResult,
    integration: IntegrationRecommendation,
    userContext: any
  ): Promise<any> {
    const prompt = `
作为简历优化顾问，请为用户解释这个链接的价值和展示建议：

内容分析: ${JSON.stringify(contentAnalysis, null, 2)}
集成建议: ${JSON.stringify(integration, null, 2)}
用户背景: ${JSON.stringify(userContext, null, 2)}

请生成用户友好的解释：

{
  "content_assessment": "这个内容的价值评估(100字内)",
  "integration_rationale": "为什么选择这种展示方式(100字内)", 
  "user_benefit": "对用户简历/页面的具体帮助(100字内)",
  "optimization_tips": ["优化建议1", "优化建议2"],
  "potential_concerns": ["可能的问题1", "解决方案"],
  "next_suggestions": ["建议收集的相关材料"]
}

语调要求：
- 专业但友好
- 具体而非抽象
- 针对用户的具体情况
- 提供可操作的建议
`;

    try {
      const response = await this.callLLM(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('LLM推理失败:', error);
      return {
        content_assessment: '这是一个有价值的内容资源',
        integration_rationale: '建议以卡片形式展示',
        user_benefit: '能够丰富您的项目展示',
        optimization_tips: ['建议补充项目描述'],
        potential_concerns: ['加载速度需要优化'],
        next_suggestions: ['收集更多相关项目']
      };
    }
  }

  // ============== 辅助方法 ==============

  private async callLLM(prompt: string): Promise<string> {
    // 这里会调用实际的LLM API
    console.log('🤖 [LLM调用] 长度:', prompt.length);
    
    // 模拟LLM响应
    return '{"mock": "response"}';
  }

  private async callAnalysisTool(toolName: string, params: any): Promise<any> {
    // 这里会调用实际的分析工具
    console.log(`🛠️ [工具调用] ${toolName}`, params);
    
    // 模拟工具响应
    return {
      platform: 'github',
      content_type: 'repository',
      extracted_data: {}
    };
  }

  private getDefaultToolStrategy(url: string, availableTools: string[]): any {
    // 基于URL模式的默认工具选择策略
    if (url.includes('github.com')) {
      return {
        selected_tools: [
          { tool_name: 'analyze_github', priority: 'high', parameters: {}, reasoning: '检测到GitHub链接' }
        ]
      };
    }
    
    return {
      selected_tools: [
        { tool_name: 'scrape_webpage', priority: 'medium', parameters: {}, reasoning: '通用网页分析' }
      ]
    };
  }

  private createBasicAnalysisResult(url: string, toolResults: any[]): ContentAnalysisResult {
    return {
      url,
      platform: 'unknown',
      content_type: 'general',
      extracted_data: {
        title: '未知内容',
        description: '无法分析的链接'
      },
      extraction_method: 'scrape',
      confidence: 0.1
    };
  }

  private createBasicIntegrationRecommendation(
    contentAnalysis: ContentAnalysisResult,
    userContext: any
  ): IntegrationRecommendation {
    return {
      integration_type: 'link_only',
      priority: 'low',
      section_placement: 'footer',
      display_config: {
        layout: 'list',
        size: 'small',
        style_hints: ['minimal'],
        interactive: false
      },
      content_processing: {
        title: contentAnalysis.extracted_data.title || '外部链接',
        description: '用户提供的链接',
        tags: [],
        highlight_points: []
      },
      reasoning: '无法深度分析，建议简单展示'
    };
  }

  private createFallbackResult(url: string, userContext: any, error: any): ProcessedLinkResult {
    return {
      url,
      analysis: this.createBasicAnalysisResult(url, []),
      integration: this.createBasicIntegrationRecommendation(
        this.createBasicAnalysisResult(url, []), 
        userContext
      ),
      user_context: userContext,
      llm_reasoning: {
        content_assessment: '链接分析遇到技术问题',
        integration_rationale: '建议手动添加描述',
        user_benefit: '可以作为参考链接保留'
      }
    };
  }
}

// 导出单例实例
export const intelligentLinkProcessor = IntelligentLinkProcessor.getInstance(); 