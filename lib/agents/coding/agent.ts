import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';

/**
 * 代码文件接口
 */
export interface CodeFile {
  filename: string;
  content: string;
  description: string;
  language: string;
}

/**
 * Coding Agent - AI驱动的代码生成
 */
export class CodingAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json', 'markdown'],
      maxRetries: 2,
      timeout: 30000
    };
    
    super('CodingAgent', capabilities);
  }

  /**
   * 主处理流程 - AI驱动的代码生成
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      const userInput = input.user_input || '';
      
      console.log('🔧 [CodingAgent] 输入分析:', {
        用户输入: userInput,
        上下文: context
      });
      
      // 🚀 统一使用AI生成模式
      yield* this.handleAIGeneration(userInput, sessionData, context);

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * AI生成模式处理
   */
  private async* handleAIGeneration(
    userInput: string, 
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 思考阶段
      yield this.createThinkingResponse('🤔 正在分析您的需求...', 10);
      await this.delay(500);

      yield this.createThinkingResponse('🎯 准备调用AI生成代码...', 20);
      await this.delay(500);

      // 🆕 统一使用流式输出，不再区分测试模式和常规模式
      console.log('🌊 [流式模式] 使用流式AI代码生成');
      yield* this.handleStreamingAIGeneration(userInput, sessionData, context);

    } catch (error) {
      console.error('❌ [AI生成错误]:', error);
      yield this.createResponse({
        immediate_display: {
          reply: '抱歉，AI代码生成过程中遇到了问题。请重试或调整您的需求。',
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'error',
          done: true
        }
      });
    }
  }

  /**
   * 🆕 流式AI代码生成处理
   */
  private async* handleStreamingAIGeneration(
    userInput: string, 
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      console.log('🤖 [流式AI调用] 步骤1: 开始导入模块...');
      
      // 动态导入提示词和JSON流式解析器
      const { getCodingPrompt, CODING_EXPERT_MODE_PROMPT } = await import('@/lib/prompts/coding');
      const { JSONStreamParser } = await import('@/lib/streaming/json-streamer');
      
      console.log('🤖 [流式AI调用] 步骤2: 提示词导入成功');
      
      // 🔧 判断使用哪种模式的prompt
      let prompt: string;
      const isExpertMode = this.isExpertMode(sessionData, context);
      
      if (isExpertMode) {
        // 专业模式：用户直接对话
        prompt = CODING_EXPERT_MODE_PROMPT + `\n\n用户需求：${userInput}`;
        console.log('🎯 [模式选择] 使用专业模式 CODING_EXPERT_MODE_PROMPT');
      } else {
        // 正常模式：来自prompt-output agent
        prompt = getCodingPrompt(userInput);
        console.log('🎯 [模式选择] 使用正常模式 CODING_AGENT_PROMPT');
      }
      
      console.log('🤖 [流式AI调用] 步骤3: 提示词构建完成，长度:', prompt.length);
      
      // 🆕 使用流式AI模型生成
      const { generateStreamWithModel } = await import('@/lib/ai-models');
      
      console.log('🌊 [流式生成] 开始流式调用大模型API...');
      
      let chunkCount = 0;
      let messageId = `coding-stream-${Date.now()}`;
      
      // 🆕 创建JSON流式解析器
      const jsonParser = new JSONStreamParser();
      
      // 流式调用AI模型
      for await (const chunk of generateStreamWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [
          { role: 'system', content: '你是一个专业的全栈开发工程师，专门生成高质量的代码项目。' },
          { role: 'user', content: prompt }
        ],
        { maxTokens: 64000 }
      )) {
        chunkCount++;
        
        console.log(`📤 [流式输出] 第${chunkCount}个块，新增内容长度: ${chunk.length}`);
        
        // 🆕 使用JSON流式解析器处理chunk
        const parseResult = jsonParser.processChunk(chunk);
        
        // 🆕 发送分离后的内容 - 只发送纯文本到对话框
        yield this.createResponse({
          immediate_display: {
            reply: parseResult.rawText, // 🆕 只发送纯文本内容到对话框
            agent_name: this.name,
            timestamp: new Date().toISOString()
          },
          system_state: {
            intent: 'generating',
            done: false,
            progress: Math.min(90, 30 + Math.floor(chunkCount / 10) * 10),
            current_stage: `正在生成代码... (${chunkCount} 块)`,
            metadata: {
              streaming: true,
              message_id: messageId,
              chunk_count: chunkCount,
              is_update: chunkCount > 1,
              latest_chunk: chunk,
              // 🆕 文件相关信息
              hasCodeFiles: parseResult.files.length > 0,
              codeFilesReady: parseResult.files.length > 0,
              projectFiles: parseResult.files.map(f => ({
                filename: f.filename,
                content: f.content,
                description: f.description,
                language: f.language,
                type: f.type
              })),
              totalFiles: parseResult.files.length,
              // 🆕 流式文件创建状态
              fileCreationProgress: parseResult.files.map(file => ({
                filename: file.filename,
                status: file.status,
                progress: file.progress,
                size: file.content.length
              })),
              // 🆕 实时更新标记
              hasNewFile: parseResult.hasNewFile,
              hasContentUpdate: parseResult.hasContentUpdate,
              newFileIndex: parseResult.newFileIndex,
              updatedFileIndex: parseResult.updatedFileIndex
            }
          }
        });
        
        // 如果JSON解析完成，退出循环
        if (parseResult.isComplete) {
          console.log('🎉 [JSON解析] JSON解析完成，文件数量:', parseResult.files.length);
          break;
        }
      }
      
      console.log('🤖 [流式AI调用] 步骤4: 流式生成完成');
      
      // 🆕 获取最终文件列表
      const finalFiles = jsonParser.getAllFiles();
      
      // 🆕 标记所有文件为完成状态
      finalFiles.forEach(file => {
        jsonParser.markFileComplete(file.filename);
      });
      
      console.log('🤖 [流式AI调用] 步骤5: 解析完成，得到', finalFiles.length, '个文件');
      
      // 步骤3: 完成响应
      yield this.createThinkingResponse('✨ 代码生成完成！', 100);

      // 🆕 转换为CodeFile格式
      const codeFiles: CodeFile[] = finalFiles.map(file => ({
        filename: file.filename,
        content: file.content,
        description: file.description || `生成的${file.language}文件`,
        language: file.language || 'text'
      }));

      yield this.createResponse({
        immediate_display: {
          reply: `🎉 AI代码生成完成！已为您创建了一个完整的项目，包含 ${finalFiles.length} 个文件。\n\n` +
                 `📁 生成的文件：\n${finalFiles.map((f: any) => `• ${f.filename} - ${f.description}`).join('\n')}`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'project_complete',
          done: true,
          progress: 100,
          current_stage: '项目生成完成',
          metadata: {
            streaming: false,
            message_id: messageId,
            stream_type: 'complete',
            is_final: true,
            expertMode: true,
            projectGenerated: true,
            totalFiles: finalFiles.length,
            generatedAt: new Date().toISOString(),
            projectFiles: codeFiles,
            userRequest: userInput,
            hasCodeFiles: true,
            codeFilesReady: true,
            // 🆕 所有文件创建完成
            fileCreationProgress: finalFiles.map((file: any) => ({
              filename: file.filename,
              status: 'completed',
              progress: 100,
              size: file.content.length
            }))
          }
        }
      });

      // 更新会话数据
      this.updateSessionWithProject(sessionData, codeFiles);
      
    } catch (error) {
      console.error('❌ [流式AI生成错误]:', error);
      throw error;
    }
  }

  /**
   * 🆕 分离文本和代码的核心方法
   */
  private separateTextAndCode(content: string): {
    text: string;
    codeFiles: CodeFile[];
  } {
    // 首先尝试提取代码块
    const codeFiles = this.extractCodeBlocksFromText(content);
    
    // 移除所有代码块，保留纯文本
    let textOnly = content;
    
    // 匹配各种代码块格式并移除
    const codeBlockPatterns = [
      /```[\s\S]*?```/g,  // 标准代码块
      /`[^`\n]*`/g,       // 行内代码
    ];
    
    codeBlockPatterns.forEach(pattern => {
      textOnly = textOnly.replace(pattern, '');
    });
    
    // 清理文本格式
    textOnly = textOnly
      .replace(/\n{3,}/g, '\n\n')      // 合并多余换行
      .replace(/^\s+|\s+$/g, '')       // 移除首尾空白
      .replace(/\s*\n\s*/g, '\n')      // 规范化换行
      .trim();
    
    // 如果文本为空，生成默认说明
    if (!textOnly && codeFiles.length > 0) {
      textOnly = `我正在为您生成一个完整的项目，包含 ${codeFiles.length} 个文件。\n\n项目结构：\n${codeFiles.map(f => `• ${f.filename}`).join('\n')}`;
    }
    
    return {
      text: textOnly,
      codeFiles: codeFiles
    };
  }

  /**
   * 解析AI代码响应
   */
  private parseAICodeResponse(response: string): CodeFile[] {
    try {
      let responseText = response;
      
      // 🔧 如果响应是包含text字段的对象，先提取text内容
      if (typeof response === 'string' && response.startsWith('{"text":')) {
        try {
          const responseObj = JSON.parse(response);
          if (responseObj.text) {
            responseText = responseObj.text;
            console.log('🤖 [响应解析] 从响应对象中提取text字段，长度:', responseText.length);
          }
        } catch (e) {
          console.log('🤖 [响应解析] 响应对象解析失败，使用原始响应');
        }
      }
      
      // 🔧 然后尝试提取JSON代码块（处理```json格式）
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
      let jsonText = responseText;
      
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
        console.log('🤖 [JSON提取] 从markdown代码块中提取JSON，长度:', jsonText.length);
      } else {
        console.log('🤖 [JSON提取] 未找到markdown代码块，直接解析响应');
      }
      
      // 🔧 清理可能的转义字符问题
      jsonText = jsonText.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      
      // 尝试解析JSON响应
      const parsed = JSON.parse(jsonText);
      
      if (parsed.files && Array.isArray(parsed.files)) {
        console.log('🤖 [JSON解析] 成功解析JSON格式，包含', parsed.files.length, '个文件');
        return parsed.files.map((file: any) => ({
          filename: file.filename || 'unknown.txt',
          content: file.content || '',
          description: file.description || '生成的文件',
          language: file.language || 'text'
        }));
      }
      
      // 如果不是标准格式，尝试其他解析方式
      return this.parseAlternativeFormat(response);
      
    } catch (error) {
      console.error('🤖 [解析错误] JSON解析失败:', error);
      console.log('🤖 [解析错误] 尝试的JSON文本预览:', response.substring(0, 300));
      
      // 尝试从文本中提取代码块
      return this.extractCodeBlocksFromText(response);
    }
  }

  /**
   * 解析备用格式
   */
  private parseAlternativeFormat(response: string): CodeFile[] {
    console.log('🤖 [备用解析] 尝试备用格式解析...');
    return this.extractCodeBlocksFromText(response);
  }

  /**
   * 从文本中提取代码块
   */
  private extractCodeBlocksFromText(text: string): CodeFile[] {
    const files: CodeFile[] = [];
    
    // 🔧 改进的代码块匹配模式
    const patterns = [
      // 模式1: ```typescript filename="app/page.tsx"
      /```(\w+)\s+filename="([^"]+)"\s*\n([\s\S]*?)```/gi,
      // 模式2: ```typescript:app/page.tsx
      /```(\w+):([^\n]+)\s*\n([\s\S]*?)```/gi,
      // 模式3: ```app/page.tsx
      /```([^\s\n]+\.[^\s\n]+)\s*\n([\s\S]*?)```/gi,
      // 模式4: 标准代码块（尝试从上下文推断文件名）
      /```(\w+)?\s*\n([\s\S]*?)```/gi
    ];
    
    for (const regex of patterns) {
      let match;
      regex.lastIndex = 0; // 重置正则表达式索引
      
      while ((match = regex.exec(text)) !== null) {
        let filename, content, language;
        
        if (match.length === 4) {
          // 模式1和2: 有明确的语言、文件名和内容
          [, language, filename, content] = match;
        } else if (match.length === 3) {
          // 模式3: 文件名作为语言标识
          [, filename, content] = match;
          language = this.getLanguageFromExtension(filename);
        } else {
          // 模式4: 标准代码块，需要推断文件名
          [, language, content] = match;
          filename = this.inferFilenameFromContent(content, language || 'text');
        }
        
        if (filename && content && content.trim().length > 0) {
          // 避免重复添加相同的文件
          if (!files.some(f => f.filename === filename.trim())) {
            files.push({
              filename: filename.trim(),
              content: content.trim(),
              description: `从AI响应中提取的${language || ''}文件`,
              language: language || this.getLanguageFromExtension(filename)
            });
          }
        }
      }
      
      // 如果已经找到文件，跳出循环
      if (files.length > 0) {
        break;
      }
    }
    
    console.log('🤖 [文本提取] 从文本中提取到', files.length, '个代码块');
    
    // 如果没有提取到文件，返回回退文件
    if (files.length === 0) {
      console.log('🤖 [文本提取] 未找到代码块，使用回退方案');
      return this.generateFallbackFiles(text.substring(0, 100));
    }
    
    return files;
  }

  /**
   * 从文件扩展名推断语言
   */
  private getLanguageFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    return langMap[ext || ''] || 'text';
  }

  /**
   * 从内容推断文件名
   */
  private inferFilenameFromContent(content: string, language: string): string {
    // 尝试从内容中推断文件名
    if (content.includes('export default function') && content.includes('HomePage')) {
      return 'app/page.tsx';
    }
    if (content.includes('RootLayout')) {
      return 'app/layout.tsx';
    }
    if (content.includes('"name":') && content.includes('"version":')) {
      return 'package.json';
    }
    if (content.includes('tailwind') && content.includes('config')) {
      return 'tailwind.config.js';
    }
    if (content.includes('@tailwind')) {
      return 'app/globals.css';
    }
    
    // 默认文件名
    const ext = language === 'typescript' ? 'tsx' : 
                language === 'javascript' ? 'jsx' : 
                language === 'json' ? 'json' : 'txt';
    return `generated-file.${ext}`;
  }

  /**
   * 生成回退文件
   */
  private generateFallbackFiles(userInput: string): CodeFile[] {
    console.log('🤖 [回退生成] 使用回退文件生成器...');
    
    const projectType = this.determineProjectType(userInput);
    const projectTitle = this.getProjectTitle(projectType, userInput);
    
    return [
      {
        filename: 'package.json',
        content: JSON.stringify({
          name: 'ai-generated-project',
          version: '1.0.0',
          description: `基于"${userInput}"生成的${projectTitle}项目`,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint'
          },
          dependencies: {
            'next': '^15.0.0',
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            'typescript': '^5.0.0',
            'tailwindcss': '^3.3.0'
          }
        }, null, 2),
        description: '项目配置文件',
        language: 'json'
      },
      {
        filename: 'app/page.tsx',
        content: `export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          ${projectTitle}
        </h1>
        <p className="text-lg text-gray-600">
          这是基于您的需求"${userInput}"生成的项目。
        </p>
      </div>
    </div>
  );
}`,
        description: '主页面组件',
        language: 'typescript'
      },
      {
        filename: 'app/layout.tsx',
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${projectTitle}',
  description: '基于AI生成的现代化网站',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}`,
        description: '应用布局文件',
        language: 'typescript'
      },
      {
        filename: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,
        description: '全局样式文件',
        language: 'css'
      },
      {
        filename: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
        description: 'Tailwind CSS配置',
        language: 'javascript'
      }
    ];
  }

  /**
   * 判断是否为专业模式
   */
  private isExpertMode(sessionData?: SessionData, context?: Record<string, any>): boolean {
    // 1. 优先检查context中的强制模式标记
    if (context?.forceExpertMode || context?.expertMode || context?.testMode) {
      console.log('🎯 [模式判断] Context中指定为专业模式:', context);
      return true;
    }
    
    // 2. 检查会话状态 - 如果当前阶段不是 code_generation，说明是直接调用
    if (sessionData?.metadata?.progress?.currentStage !== 'code_generation') {
      console.log('🎯 [模式判断] 非code_generation阶段，使用专业模式');
      return true;
    }
    
    // 3. 检查是否来自prompt-output阶段（正常流程）
    const hasDesignData = sessionData?.collectedData && 
                         Object.keys(sessionData.collectedData).some(key => {
                           const data = (sessionData.collectedData as any)[key];
                           return data && typeof data === 'object' && Object.keys(data).length > 0;
                         });
    
    if (hasDesignData) {
      console.log('🎯 [模式判断] 有设计数据，使用正常流程模式');
      return false; // 有设计数据，说明是正常流程
    }
    
    // 默认为专业模式
    console.log('🎯 [模式判断] 默认使用专业模式');
    return true;
  }

  /**
   * 项目类型判断
   */
  private determineProjectType(userInput: string): string {
    if (userInput.includes('简历') || userInput.includes('resume')) return 'resume';
    if (userInput.includes('作品集') || userInput.includes('portfolio')) return 'portfolio';
    if (userInput.includes('博客') || userInput.includes('blog')) return 'blog';
    if (userInput.includes('商城') || userInput.includes('shop')) return 'ecommerce';
    if (userInput.includes('登录') || userInput.includes('注册')) return 'auth';
    return 'website';
  }

  /**
   * 获取项目标题
   */
  private getProjectTitle(projectType: string, userInput: string): string {
    const titles: Record<string, string> = {
      resume: '个人简历网站',
      portfolio: '个人作品集',
      blog: '个人博客',
      ecommerce: '电商网站',
      auth: '用户认证系统',
      website: '网站项目'
    };
    
    return titles[projectType] || '网站项目';
  }

  /**
   * 创建思考响应
   */
  protected createThinkingResponse(message: string, progress: number): StreamableAgentResponse {
    return {
      immediate_display: {
        reply: message,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'thinking',
        done: false,
        progress,
        current_stage: message
      }
    };
  }

  /**
   * 更新会话数据
   */
  private updateSessionWithProject(sessionData: SessionData, files: CodeFile[]): void {
    if (sessionData.metadata) {
      (sessionData.metadata as any).generatedProject = {
        files,
        generatedAt: new Date().toISOString(),
        totalFiles: files.length
      };
    }
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 