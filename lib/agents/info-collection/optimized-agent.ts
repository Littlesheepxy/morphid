import { BaseAgent } from '../base-agent';
import { StreamableAgentResponse, AgentCapabilities } from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { generateStreamWithModel } from '@/lib/ai-models';
import { formatPrompt } from '@/lib/prompts';
import { OPTIMIZED_INFO_COLLECTION_PROMPT } from '@/lib/prompts/info-collection/optimized-agent';
import { cleanTextContent } from '@/lib/utils';

// 🆕 添加隐藏控制信息处理相关的类型定义
interface InfoCollectionHiddenControl {
  collection_status: 'CONTINUE' | 'READY_TO_ADVANCE' | 'NEED_CLARIFICATION';
  user_type: 'trial_user' | 'information_rich' | 'guided_discovery';
  collected_data: {
    core_identity?: string;
    key_skills?: string[];
    achievements?: string[];
    values?: string[];
    goals?: string[];
  };
  tool_calls?: Array<{
    tool: string;
    status: 'pending' | 'success' | 'failed';
    result: string;
  }>;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
  next_focus?: string;
  collection_summary?: string;
}

interface StreamContentSeparation {
  visibleContent: string;
  hiddenControl: InfoCollectionHiddenControl | null;
  isComplete: boolean;
}

// 🆕 流式内容处理器 - 分离可见内容和隐藏控制信息
class InfoCollectionStreamProcessor {
  private accumulatedContent = '';
  private lastVisibleContent = '';
  
  processChunk(chunk: string): {
    newVisibleContent: string;
    hiddenControl: InfoCollectionHiddenControl | null;
    isComplete: boolean;
  } {
    this.accumulatedContent += chunk;
    
    const separation = this.separateVisibleAndHiddenContent(this.accumulatedContent);
    
    // 计算新增的可见内容
    const newVisibleContent = separation.visibleContent.slice(this.lastVisibleContent.length);
    this.lastVisibleContent = separation.visibleContent;
    
    return {
      newVisibleContent,
      hiddenControl: separation.hiddenControl,
      isComplete: separation.isComplete
    };
  }
  
  getCurrentVisibleContent(): string {
    return this.lastVisibleContent;
  }
  
  reset(): void {
    this.accumulatedContent = '';
    this.lastVisibleContent = '';
  }
  
  /**
   * 分离可见内容和隐藏控制信息
   */
  private separateVisibleAndHiddenContent(content: string): StreamContentSeparation {
    const patterns = [
      /```HIDDEN_CONTROL\s*([\s\S]*?)\s*```/,
      /HIDDEN_CONTROL\s*([\s\S]*?)(?=\n\n|$)/
    ];
    
    let match: RegExpMatchArray | null = null;
    
    // 尝试各种模式
    for (const pattern of patterns) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (match) {
      // 🔧 修复：分离可见内容并清理空行
      const beforeHidden = content.substring(0, match.index || 0);
      const afterHidden = content.substring((match.index || 0) + match[0].length);
      const cleanVisibleContent = this.cleanupContent(beforeHidden + afterHidden);
      
      // 提取JSON字符串
      const jsonStr = match[1].trim();
      
      if (jsonStr) {
        try {
          // 检查JSON是否完整
          if (!this.isCompleteJSON(jsonStr)) {
            return {
              visibleContent: cleanVisibleContent,
              hiddenControl: null,
              isComplete: false
            };
          }
          
          const hiddenJson = JSON.parse(jsonStr);
          const hiddenControl: InfoCollectionHiddenControl = {
            collection_status: hiddenJson.collection_status || 'CONTINUE',
            user_type: hiddenJson.user_type || 'guided_discovery',
            collected_data: hiddenJson.collected_data || {},
            tool_calls: hiddenJson.tool_calls || [],
            confidence_level: hiddenJson.confidence_level || 'MEDIUM',
            reasoning: hiddenJson.reasoning || '默认推理',
            next_focus: hiddenJson.next_focus,
            collection_summary: hiddenJson.collection_summary
          };
          
          return {
            visibleContent: cleanVisibleContent,
            hiddenControl,
            isComplete: true
          };
        } catch (error) {
          console.warn('⚠️ [隐藏控制信息解析失败]:', error);
          
          // 尝试修复JSON
          const fixedJson = this.tryFixJSON(jsonStr);
          if (fixedJson) {
            try {
              const hiddenJson = JSON.parse(fixedJson);
              const hiddenControl: InfoCollectionHiddenControl = {
                collection_status: hiddenJson.collection_status || 'CONTINUE',
                user_type: hiddenJson.user_type || 'guided_discovery',
                collected_data: hiddenJson.collected_data || {},
                tool_calls: hiddenJson.tool_calls || [],
                confidence_level: hiddenJson.confidence_level || 'MEDIUM',
                reasoning: hiddenJson.reasoning || '修复后的默认推理',
                next_focus: hiddenJson.next_focus,
                collection_summary: hiddenJson.collection_summary
              };
              
              return {
                visibleContent: cleanVisibleContent,
                hiddenControl,
                isComplete: true
              };
            } catch (fixError) {
              console.warn('⚠️ [JSON修复也失败了]:', fixError);
            }
          }
        }
      }
    }
    
    // 没有找到隐藏控制信息，返回清理后的原始内容
    return {
      visibleContent: this.cleanupContent(content),
      hiddenControl: null,
      isComplete: false
    };
  }
  
  /**
   * 🔧 使用全局内容清理函数
   */
  private cleanupContent(content: string): string {
    return cleanTextContent(content);
  }
  
  /**
   * 检查JSON字符串是否完整
   */
  private isCompleteJSON(jsonStr: string): boolean {
    const trimmed = jsonStr.trim();
    
    if (!trimmed.startsWith('{')) {
      return false;
    }
    
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
    }
    
    return braceCount === 0 && trimmed.endsWith('}');
  }
  
  /**
   * 尝试修复常见的JSON问题
   */
  private tryFixJSON(jsonStr: string): string | null {
    try {
      let fixed = jsonStr.trim();
      
      // 修复1：移除末尾的逗号
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      // 修复2：确保字符串值被正确引用
      fixed = fixed.replace(/:\s*([^",{}\[\]]+)(?=\s*[,}])/g, (match, value) => {
        const trimmedValue = value.trim();
        if (!/^(true|false|null|\d+(\.\d+)?)$/.test(trimmedValue)) {
          return `: "${trimmedValue}"`;
        }
        return match;
      });
      
      // 验证修复后的JSON
      JSON.parse(fixed);
      return fixed;
      
    } catch (error) {
      return null;
    }
  }
}

/**
 * 优化的信息收集Agent - 支持隐藏控制信息
 */
export class OptimizedInfoCollectionAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json'],
      maxRetries: 3,
      timeout: 30000
    };
    
    super('OptimizedInfoCollectionAgent', capabilities);
  }

  /**
   * 主处理流程 - 支持隐藏控制信息的流式对话
   */
  async* process(
    input: { user_input: string },
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    console.log(`\n🎯 [优化信息收集Agent] 开始处理用户输入`);
    console.log(`📝 [用户输入] "${input.user_input}"`);
    
    try {
      // 提取Welcome数据
      const welcomeData = this.extractWelcomeData(sessionData);
      
      // 检查轮次限制
      const currentTurn = this.getTurnCount(sessionData);
      const maxTurns = this.getMaxTurns(sessionData);
      
      if (currentTurn >= maxTurns) {
        console.log(`⏰ [轮次限制] 已达到最大轮次 ${maxTurns}，强制推进到下一阶段`);
        yield* this.createForceAdvanceResponseStream(sessionData);
        return;
      }
      
      // 增加轮次计数
      this.incrementTurnCount(sessionData);
      
      console.log(`🔄 [轮次信息] 当前第${currentTurn + 1}轮，最大${maxTurns}轮`);
      
      // 显示分析进度
      yield this.createThinkingResponse('🔍 正在分析您提供的信息...', 20);
      
      // 使用流式处理调用Claude分析
      yield* this.analyzeInputWithClaudeStreaming(input.user_input, welcomeData, sessionData);
      
    } catch (error) {
      console.error(`❌ [优化信息收集Agent错误] 处理失败:`, error);
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 流式调用Claude进行信息分析
   */
  private async* analyzeInputWithClaudeStreaming(
    userInput: string,
    welcomeData: any,
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      console.log(`🧠 [Claude流式分析] 开始调用Claude进行智能分析`);
      
      // 🚀 检查是否有预解析的文件内容
      const uploadedFiles = this.extractUploadedFiles(userInput);
      const hasPreParsedFiles = uploadedFiles.length > 0;
      const parsedFileContent = uploadedFiles.map(file => 
        `文件名: ${file.name}\n类型: ${file.type}\n内容: ${file.content}`
      ).join('\n\n');

      // 🔗 检查是否有链接需要处理（无论是否有预解析文件）
      const hasLinks = this.detectLinksInInput(userInput);
      const linkInfo = hasLinks ? this.extractLinkInfo(userInput) : '无链接';

      // 构建prompt
      const prompt = formatPrompt(OPTIMIZED_INFO_COLLECTION_PROMPT, {
        user_role: welcomeData.user_role || '未知身份',
        use_case: welcomeData.use_case || '个人展示',
        style: welcomeData.style || '简约现代',
        highlight_focus: welcomeData.highlight_focus || '综合展示',
        commitment_level: welcomeData.commitment_level || '认真制作',
        reasoning: welcomeData.reasoning || '基于用户表达分析',
        should_use_samples: welcomeData.should_use_samples || false,
        sample_reason: welcomeData.sample_reason || '根据用户需求判断',
        // 🆕 文件相关信息
        uploaded_files_count: uploadedFiles.length,
        files_pre_parsed: hasPreParsedFiles,
        parsed_file_content: parsedFileContent || '无',
        // 🆕 链接相关信息
        has_links: hasLinks,
        link_info: linkInfo,
        // 原有信息
        collection_priority: welcomeData.collection_priority || 'balanced',
        current_collected_data: JSON.stringify(welcomeData.current_collected_data || {}),
        available_tools: JSON.stringify(welcomeData.available_tools || []),
        context_for_next_agent: welcomeData.context_for_next_agent || '继续信息收集',
        user_input: userInput
      });
      
      // 使用流式内容处理器
      const contentProcessor = new InfoCollectionStreamProcessor();
      let finalHiddenControl: InfoCollectionHiddenControl | null = null;
      let isFirstChunk = true;
      let messageId = `info-collection-${Date.now()}`;
      let chunkCount = 0;
      
      console.log(`🌊 [流式处理] 开始接收Claude响应流`);
      
      // 流式调用Claude
      for await (const chunk of generateStreamWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [{ role: 'user', content: prompt }],
        { maxTokens: 2000 }
      )) {
        chunkCount++;
        
        // 处理每个chunk
        const processResult = contentProcessor.processChunk(chunk);
        
        // 如果有新的可见内容，发送给前端
        if (processResult.newVisibleContent) {
          console.log(`📤 [流式可见内容] 第${chunkCount}个块，新增内容长度: ${processResult.newVisibleContent.length}`);
          
          yield this.createResponse({
            immediate_display: {
              reply: contentProcessor.getCurrentVisibleContent(),
              agent_name: this.name,
              timestamp: new Date().toISOString()
            },
            system_state: {
              intent: 'collecting',
              done: false,
              progress: Math.min(90, 20 + Math.floor(contentProcessor.getCurrentVisibleContent().length / 50)),
              current_stage: '正在分析对话...',
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
          finalHiddenControl = processResult.hiddenControl;
          break;
        }
      }
      
      // 流式完成：根据隐藏控制信息决定下一步
      if (finalHiddenControl) {
        console.log(`🔍 [流式完成] 解析最终控制信息:`, finalHiddenControl.collection_status);
        
        // 更新会话数据
        this.updateSessionData(sessionData, finalHiddenControl);
        
        // 根据collection_status决定下一步
        if (finalHiddenControl.collection_status === 'READY_TO_ADVANCE') {
          console.log(`🎉 [信息收集完成] 准备推进到下一阶段`);
          yield* this.createAdvanceResponseStream(finalHiddenControl, sessionData);
        } else {
          console.log(`🔄 [继续收集] 继续信息收集流程`);
          yield this.createContinueResponse(finalHiddenControl, messageId);
        }
      } else {
        // 如果没有检测到完整的控制信息，默认继续收集
        console.log(`⚠️ [未检测到控制信息] 默认继续收集模式`);
        yield this.createDefaultContinueResponse(messageId);
      }
      
    } catch (error) {
      console.error(`❌ [Claude流式分析失败]:`, error);
      throw new Error('Claude分析调用失败');
    }
  }

  /**
   * 创建推进到下一阶段的响应
   */
  private async* createAdvanceResponseStream(
    hiddenControl: InfoCollectionHiddenControl,
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    // 构建收集总结
    const collectionSummary = {
      user_type: hiddenControl.user_type,
      core_identity: hiddenControl.collected_data.core_identity || '未知身份',
      key_skills: hiddenControl.collected_data.key_skills || [],
      achievements: hiddenControl.collected_data.achievements || [],
      values: hiddenControl.collected_data.values || [],
      goals: hiddenControl.collected_data.goals || [],
      confidence_level: hiddenControl.confidence_level,
      reasoning: hiddenControl.reasoning,
      collection_summary: hiddenControl.collection_summary || '信息收集完成'
    };
    
    // 保存到会话数据供下一个Agent使用
    const metadata = sessionData.metadata as any;
    metadata.infoCollectionSummary = collectionSummary;
    
    yield this.createResponse({
      immediate_display: {
        reply: '✅ 信息收集完成！正在为您准备个性化的页面设计方案...',
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance_to_next_agent',
        done: true,
        progress: 100,
        current_stage: '信息收集完成',
        next_agent: 'design_agent',
        metadata: {
          collection_summary: collectionSummary,
          ready_for_next_stage: true
        }
      }
    });
  }

  /**
   * 创建继续收集的响应
   */
  private createContinueResponse(
    hiddenControl: InfoCollectionHiddenControl,
    messageId: string
  ): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: '', // 可见内容已经在流式过程中发送
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'collecting',
        done: false,
        progress: this.calculateCollectionProgress(hiddenControl),
        current_stage: '信息收集中',
        metadata: {
          streaming: false,
          message_id: messageId,
          stream_type: 'complete',
          is_final: true,
          collection_status: hiddenControl.collection_status,
          user_type: hiddenControl.user_type,
          next_focus: hiddenControl.next_focus,
          confidence_level: hiddenControl.confidence_level
        }
      }
    });
  }

  /**
   * 创建默认继续响应（当没有检测到控制信息时）
   */
  private createDefaultContinueResponse(messageId: string): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: '请继续提供更多信息，或者告诉我您还有什么想要补充的。',
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'collecting',
        done: false,
        progress: 50,
        current_stage: '信息收集中',
        metadata: {
          streaming: false,
          message_id: messageId,
          stream_type: 'complete',
          is_final: true,
          collection_status: 'CONTINUE',
          fallback_mode: true
        }
      }
    });
  }

  /**
   * 更新会话数据
   */
  private updateSessionData(sessionData: SessionData, hiddenControl: InfoCollectionHiddenControl): void {
    const metadata = sessionData.metadata as any;
    
    // 更新收集到的数据
    if (!metadata.collectedInfo) {
      metadata.collectedInfo = {};
    }
    
    Object.assign(metadata.collectedInfo, hiddenControl.collected_data);
    
    // 更新用户类型和状态
    metadata.userType = hiddenControl.user_type;
    metadata.collectionStatus = hiddenControl.collection_status;
    metadata.confidenceLevel = hiddenControl.confidence_level;
    
    console.log(`💾 [会话数据更新] 用户类型: ${hiddenControl.user_type}, 状态: ${hiddenControl.collection_status}`);
  }

  /**
   * 计算收集进度
   */
  private calculateCollectionProgress(hiddenControl: InfoCollectionHiddenControl): number {
    const data = hiddenControl.collected_data;
    let progress = 30; // 基础进度
    
    if (data.core_identity) progress += 20;
    if (data.key_skills && data.key_skills.length > 0) progress += 15;
    if (data.achievements && data.achievements.length > 0) progress += 15;
    if (data.values && data.values.length > 0) progress += 10;
    if (data.goals && data.goals.length > 0) progress += 10;
    
    return Math.min(progress, 90); // 最高90%，完成时才是100%
  }

  /**
   * 创建强制推进响应流
   */
  private async* createForceAdvanceResponseStream(sessionData: SessionData): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    const metadata = sessionData.metadata as any;
    const collectedInfo = metadata.collectedInfo || {};
    
    const forceSummary = {
      user_type: 'guided_discovery',
      core_identity: collectedInfo.core_identity || '多才多艺的专业人士',
      key_skills: collectedInfo.key_skills || ['沟通协调', '问题解决', '学习能力'],
      achievements: collectedInfo.achievements || ['积极参与项目', '持续学习成长'],
      values: collectedInfo.values || ['专业负责', '团队合作'],
      goals: collectedInfo.goals || ['职业发展', '技能提升'],
      confidence_level: 'MEDIUM',
      reasoning: '达到最大轮次限制，使用已收集信息推进',
      collection_summary: '基于有限信息完成收集，推进到下一阶段'
    };
    
    metadata.infoCollectionSummary = forceSummary;
    
    yield this.createResponse({
      immediate_display: {
        reply: '⏰ 基于您目前提供的信息，我来为您准备个性化的页面设计方案...',
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance_to_next_agent',
        done: true,
        progress: 100,
        current_stage: '信息收集完成',
        next_agent: 'design_agent',
        metadata: {
          collection_summary: forceSummary,
          ready_for_next_stage: true,
          force_advance: true
        }
      }
    });
  }

  /**
   * 提取Welcome数据
   */
  private extractWelcomeData(sessionData: SessionData): any {
    const metadata = sessionData.metadata as any;
    const welcomeSummary = metadata.welcomeSummary;
    
    if (!welcomeSummary) {
      console.warn('⚠️ [Welcome数据缺失] 使用默认数据');
      return {
        user_role: '专业人士',
        use_case: '个人展示',
        style: '简约现代',
        highlight_focus: '综合展示',
        commitment_level: '认真制作',
        reasoning: '默认分析',
        should_use_samples: false,
        sample_reason: '用户未明确表示体验需求',
        collection_priority: 'balanced',
        current_collected_data: {},
        available_tools: [],
        context_for_next_agent: '继续信息收集'
      };
    }
    
    return {
      user_role: welcomeSummary.summary?.user_role || '专业人士',
      use_case: welcomeSummary.summary?.use_case || '个人展示',
      style: welcomeSummary.summary?.style || '简约现代',
      highlight_focus: welcomeSummary.summary?.highlight_focus || '综合展示',
      commitment_level: welcomeSummary.user_intent?.commitment_level || '认真制作',
      reasoning: welcomeSummary.user_intent?.reasoning || '基于用户表达分析',
      should_use_samples: welcomeSummary.sample_suggestions?.should_use_samples || false,
      sample_reason: welcomeSummary.sample_suggestions?.sample_reason || '根据用户需求判断',
      collection_priority: welcomeSummary.collection_priority || 'balanced',
      current_collected_data: welcomeSummary.current_collected_data || {},
      available_tools: welcomeSummary.available_tools || [],
      context_for_next_agent: welcomeSummary.context_for_next_agent || '继续信息收集'
    };
  }

  /**
   * 获取轮次计数
   */
  private getTurnCount(sessionData: SessionData): number {
    const metadata = sessionData.metadata as any;
    return metadata.infoCollectionTurns || 0;
  }

  /**
   * 获取最大轮次限制
   */
  private getMaxTurns(sessionData: SessionData): number {
    const welcomeData = this.extractWelcomeData(sessionData);
    
    const maxTurns: Record<string, number> = {
      '试一试': 3,
      '认真制作': 6
    };
    
    return maxTurns[welcomeData.commitment_level] || 6;
  }

  /**
   * 增加轮次计数
   */
  private incrementTurnCount(sessionData: SessionData): void {
    const metadata = sessionData.metadata as any;
    metadata.infoCollectionTurns = (metadata.infoCollectionTurns || 0) + 1;
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
        current_stage: '分析中',
        metadata: {
          thinking: true,
          message
        }
      }
    });
  }

  /**
   * 从用户输入中提取已上传的文件信息
   */
  private extractUploadedFiles(userInput: string): Array<{name: string, type: string, content: string}> {
    const files: Array<{name: string, type: string, content: string}> = [];
    
    // 匹配文件信息的正则表达式
    const filePattern = /📎\s+([^\n]+)\n类型:\s+([^\n]+)\n大小:\s+[^\n]+\n(?:内容:\s+([\s\S]*?)(?=\n\n📎|\n\n$|$))?/g;
    
    let match;
    while ((match = filePattern.exec(userInput)) !== null) {
      const fileName = match[1]?.trim();
      const fileType = match[2]?.trim();
      const fileContent = match[3]?.trim() || '';
      
      if (fileName && fileType) {
        files.push({
          name: fileName,
          type: fileType,
          content: fileContent
        });
      }
    }
    
    console.log(`📎 [文件提取] 从用户输入中提取到 ${files.length} 个文件`);
    if (files.length > 0) {
      files.forEach((file, index) => {
        console.log(`📄 [文件${index + 1}] ${file.name} (${file.type}) - 内容长度: ${file.content.length}`);
      });
    }
    
    return files;
  }

  /**
   * 检测用户输入中是否包含链接
   */
  private detectLinksInInput(userInput: string): boolean {
    const linkPatterns = [
      /https?:\/\/[^\s]+/g,
      /linkedin\.com\/in\/[^\s]+/g,
      /github\.com\/[^\s]+/g,
      /instagram\.com\/[^\s]+/g,
      /twitter\.com\/[^\s]+/g,
      /x\.com\/[^\s]+/g,
      /behance\.net\/[^\s]+/g,
      /dribbble\.com\/[^\s]+/g
    ];

    return linkPatterns.some(pattern => pattern.test(userInput));
  }

  /**
   * 提取用户输入中的链接信息
   */
  private extractLinkInfo(userInput: string): string {
    const links: string[] = [];
    const linkPattern = /https?:\/\/[^\s]+/g;
    
    let match;
    while ((match = linkPattern.exec(userInput)) !== null) {
      links.push(match[0]);
    }

    if (links.length === 0) {
      return '无链接';
    }

    return links.map((link, index) => 
      `链接${index + 1}: ${link}`
    ).join('\n');
  }
} 