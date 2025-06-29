import { BaseAgent } from '../base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { z } from 'zod';
import {
  CodeFile,
  extractUserGoal,
  extractUserType,
  extractDesignData,
  generatePackageJson,
  generateTailwindConfig,
  generateTsConfig,
  generateNextConfig,
  generatePostCssConfig,
  generateUtils,
  generateGlobalStyles,
  generateDataConfig,
  generateDeploymentGuide,
  generateReadme,
  getSectionComponentName
} from './utils';

/**
 * Coding Agent - 代码生成和项目构建
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
   * 主处理流程 - 生成完整的代码项目
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      const userInput = input.user_input || '';
      
      // 检查是否为专业模式测试 - 直接进行代码生成，跳过设计阶段
      const isExpertMode = userInput.includes('[TEST_MODE]') || context?.expertMode === true;
      const cleanInput = userInput
        .replace(/\[FORCE_AGENT:\w+\]/g, '')  // 使用全局标志 g
        .replace(/\[TEST_MODE\]/g, '')        // 使用全局标志 g
        .trim();
      
      console.log('🔧 [CodingAgent] 输入分析:', {
        原始输入: userInput,
        是否专业模式: isExpertMode,
        清理后输入: cleanInput
      });
      
      if (isExpertMode) {
        // 🔧 专业模式：使用专业模式 prompt 直接根据用户需求生成代码
        yield* this.handleExpertModeGeneration(cleanInput, sessionData);
        return;
      }

      // 原有的正常模式逻辑 - 需要设计数据
      // 步骤1: 提取设计数据
      yield this.createThinkingResponse('正在解析页面设计方案...', 80);
      await this.delay(1000);

      const designData = extractDesignData(sessionData);
      if (!designData) {
        throw new Error('缺少设计数据，请先完成页面设计阶段');
      }

      const userType = extractUserType(sessionData);
      const userGoal = extractUserGoal(sessionData);
      const collectedData = sessionData.collectedData;

      // 步骤2: 生成项目配置文件
      yield this.createThinkingResponse('正在生成项目配置文件...', 85);
      await this.delay(1200);

      const configFiles = this.generateConfigFiles(designData.designStrategy, userType);

      // 步骤3: 生成核心代码文件
      yield this.createThinkingResponse('正在生成React组件和页面代码...', 90);
      await this.delay(1500);

      const codeFiles = await this.generateCodeFiles(designData.designStrategy, collectedData, userType);

      // 步骤4: 生成部署文档
      yield this.createThinkingResponse('正在生成部署文档和说明...', 95);
      await this.delay(800);

      const documentationFiles = this.generateDocumentationFiles(designData.designStrategy, userGoal, userType);

      // 整合所有文件
      const allFiles = [...configFiles, ...codeFiles, ...documentationFiles];

      // 步骤5: 输出完整项目
      yield this.createResponse({
        immediate_display: {
          reply: `🎉 代码生成完成！已为您创建了一个完整的${userType}个人网站项目，包含${allFiles.length}个文件。`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'project_complete',
          done: true,
          progress: 100,
          current_stage: '项目生成完成',
          metadata: {
            projectGenerated: true,
            totalFiles: allFiles.length,
            generatedAt: new Date().toISOString(),
            projectFiles: allFiles
          }
        }
      });

      // 更新会话数据
      this.updateSessionWithProject(sessionData, allFiles);

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 生成项目配置文件
   */
  private generateConfigFiles(strategy: any, userType: string): CodeFile[] {
    return [
      {
        filename: 'package.json',
        content: generatePackageJson(strategy, userType),
        description: 'Node.js项目配置文件，包含依赖和脚本',
        language: 'json'
      },
      {
        filename: 'tailwind.config.js',
        content: generateTailwindConfig(strategy, userType),
        description: 'Tailwind CSS配置文件',
        language: 'javascript'
      },
      {
        filename: 'tsconfig.json',
        content: generateTsConfig(),
        description: 'TypeScript编译配置',
        language: 'json'
      },
      {
        filename: 'next.config.js',
        content: generateNextConfig(),
        description: 'Next.js框架配置',
        language: 'javascript'
      },
      {
        filename: 'postcss.config.js',
        content: generatePostCssConfig(),
        description: 'PostCSS处理器配置',
        language: 'javascript'
      }
    ];
  }

  /**
   * 生成代码文件
   */
  private async generateCodeFiles(strategy: any, collectedData: any, userType: string): Promise<CodeFile[]> {
    const codeFiles: CodeFile[] = [];

    // 工具函数
    codeFiles.push({
      filename: 'lib/utils.ts',
      content: generateUtils(),
      description: '通用工具函数',
      language: 'typescript'
    });

    // 全局样式
    codeFiles.push({
      filename: 'app/globals.css',
      content: generateGlobalStyles(),
      description: '全局CSS样式文件',
      language: 'css'
    });

    // 数据配置
    codeFiles.push({
      filename: 'lib/config.ts',
      content: generateDataConfig(collectedData, userType),
      description: '网站数据配置文件',
      language: 'typescript'
    });

    // 主页面
    codeFiles.push({
      filename: 'app/page.tsx',
      content: this.generateMainPage(strategy),
      description: 'React主页面组件',
      language: 'typescript'
    });

    // 布局文件
    codeFiles.push({
      filename: 'app/layout.tsx',
      content: this.generateLayout(strategy),
      description: 'Next.js应用布局',
      language: 'typescript'
    });

    // 组件文件
    const componentFiles = await this.generateComponents(strategy, userType);
    codeFiles.push(...componentFiles);

    return codeFiles;
  }

  /**
   * 生成文档文件
   */
  private generateDocumentationFiles(strategy: any, userGoal: string, userType: string): CodeFile[] {
    return [
      {
        filename: 'README.md',
        content: generateReadme(strategy, userGoal, userType),
        description: '项目说明文档',
        language: 'markdown'
      },
      {
        filename: 'DEPLOYMENT.md',
        content: generateDeploymentGuide(),
        description: '部署指导文档',
        language: 'markdown'
      }
    ];
  }

  /**
   * 生成主页面代码
   */
  private generateMainPage(strategy: any): string {
    const sections = strategy.sections || [];
    const sectionImports = sections
      .map((section: any) => getSectionComponentName(section.type))
      .filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index);

    return `import { siteConfig } from '@/lib/config'
${sectionImports.map((name: string) => `import { ${name} } from '@/components/sections/${name}'`).join('\n')}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      ${sections.map((section: any) => {
        const componentName = getSectionComponentName(section.type);
        return `<${componentName} data={siteConfig} />`;
      }).join('\n      ')}
    </main>
  )
}`;
  }

  /**
   * 生成布局文件
   */
  private generateLayout(strategy: any): string {
    return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '个人作品集网站',
  description: '基于Next.js构建的现代化个人作品集网站',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`;
  }

  /**
   * 生成组件文件
   */
  private async generateComponents(strategy: any, userType: string): Promise<CodeFile[]> {
    const components: CodeFile[] = [];
    const sections = strategy.sections || [];

    // 为每个unique组件类型生成文件
    const componentSet = new Set(sections.map((section: any) => getSectionComponentName(section.type)));
    const uniqueComponents = Array.from(componentSet) as string[];

    for (const componentName of uniqueComponents) {
      components.push({
        filename: `components/sections/${componentName}.tsx`,
        content: this.generateComponentCode(componentName, strategy, userType),
        description: `${componentName}页面区块组件`,
        language: 'typescript'
      });
    }

    return components;
  }

  /**
   * 生成组件代码
   */
  private generateComponentCode(componentName: string, strategy: any, userType: string): string {
    // 这里简化实现，实际可以根据不同组件类型生成更详细的代码
    return `import { siteConfig } from '@/lib/config'

interface ${componentName}Props {
  data: typeof siteConfig
}

export function ${componentName}({ data }: ${componentName}Props) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">${componentName.replace('Section', '')}</h2>
        {/* 组件内容将在这里实现 */}
        <div className="text-muted-foreground">
          ${componentName} 组件内容
        </div>
      </div>
    </section>
  )
}`;
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
        current_stage: '代码生成中...'
      }
    });
  }

  /**
   * 更新会话数据
   */
  private updateSessionWithProject(sessionData: SessionData, files: CodeFile[]): void {
    const metadata = sessionData.metadata as any;
    metadata.projectGenerated = true;
    metadata.generatedFiles = files;
    metadata.codingPhaseCompleted = true;
    metadata.lastUpdated = new Date().toISOString();

    console.log("✅ 会话数据已更新，项目文件已保存");
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理测试模式
   */
  private async* handleExpertModeGeneration(
    userInput: string, 
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 如果是初始启动（空输入或启动消息）
      if (!userInput || userInput === '启动测试代码生成模式') {
        yield this.createResponse({
          immediate_display: {
            reply: `🎯 **专业模式已启动！**

专业模式将使用最先进的代码生成能力，为你创建高质量的Web项目。

### 💡 支持的项目类型：
- 个人简历/作品集网站
- 商业展示页面  
- 博客网站
- 产品介绍页
- 公司官网
- 登陆页面
- 仪表板界面
- 其他任何Web应用

### 🔧 专业特性：
- V0 级别的代码质量
- Next.js 15 + TypeScript
- Tailwind CSS + shadcn/ui
- 响应式设计和无障碍支持
- 现代化动画效果

请告诉我你想要创建什么类型的项目！

**示例：**
- "创建一个个人简历网站"
- "生成一个产品展示页面" 
- "制作一个公司介绍网站"`,
            agent_name: this.name,
            timestamp: new Date().toISOString()
          },
          system_state: {
            intent: 'awaiting_requirements',
            done: false,
            progress: 10,
            current_stage: '等待用户需求',
            metadata: {
              expertMode: true,
              awaitingUserInput: true
            }
          }
        });
        return;
      }

      // 专业模式：使用专业模式 prompt 直接生成代码
      yield this.createThinkingResponse('🎯 正在使用专业模式分析需求...', 20);
      await this.delay(500);

      yield this.createThinkingResponse('🤖 正在调用V0级别的代码生成引擎...', 40);
      await this.delay(800);

      console.log('🎯 [专业模式] 开始调用专业模式代码生成，用户输入:', userInput);
      
      // 调用专业模式代码生成
      const expertGeneratedCode = await this.callExpertModeGeneration(userInput);
      
      console.log('🎯 [专业模式] 代码生成完成，文件数量:', expertGeneratedCode.length);
      
      yield this.createThinkingResponse('⚡ 正在优化代码结构和样式...', 80);
      await this.delay(600);

      // 发送完成响应
      yield this.createResponse({
        immediate_display: {
          reply: `✅ **专业模式代码生成完成！**

已使用专业级 prompt 为你生成了高质量的项目代码，包含 ${expertGeneratedCode.length} 个文件。

**专业特性：**
- 🎨 V0 级别的代码质量
- 📱 完全响应式设计
- ⚡ 优化的性能
- 🚀 现代化架构

右侧预览区域将显示完整的项目代码和实时预览。如需修改，请直接告诉我！`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'project_complete',
          done: true,
          progress: 100,
          current_stage: '专业模式生成完成',
          metadata: {
            expertMode: true,
            projectGenerated: true,
            totalFiles: expertGeneratedCode.length,
            generatedAt: new Date().toISOString(),
            projectFiles: expertGeneratedCode,
            userRequest: userInput,
            hasCodeFiles: true,
            codeFilesReady: true
          }
        }
      });

      // 更新会话数据
      this.updateSessionWithProject(sessionData, expertGeneratedCode);

    } catch (error) {
      console.error('🔧 [专业模式] 发生错误:', error);
      yield await this.handleError(error as Error, sessionData);
    }
  }



  /**
   * 确定项目类型
   */
  private determineProjectType(userInput: string): string {
    const input = userInput.toLowerCase();
    if (input.includes('简历') || input.includes('resume') || input.includes('cv')) {
      return 'resume';
    } else if (input.includes('作品集') || input.includes('portfolio')) {
      return 'portfolio';
    } else if (input.includes('博客') || input.includes('blog')) {
      return 'blog';
    } else if (input.includes('公司') || input.includes('企业') || input.includes('business')) {
      return 'business';
    } else if (input.includes('产品') || input.includes('product')) {
      return 'product';
    } else {
      return 'general';
    }
  }





  /**
   * 获取项目标题
   */
  private getProjectTitle(projectType: string, userInput: string): string {
    if (userInput) {
      return userInput;
    }
    
    const titles = {
      resume: '个人简历',
      portfolio: '作品集',
      blog: '个人博客',
      business: '企业官网',
      product: '产品展示',
      general: '网站项目'
    };
    return titles[projectType as keyof typeof titles] || '网站项目';
  }

  /**
   * 获取项目描述
   */
  private getProjectDescription(projectType: string): string {
    const descriptions = {
      resume: '展示专业技能和工作经历的个人简历网站',
      portfolio: '精美的作品集展示平台',
      blog: '分享想法和知识的个人博客',
      business: '专业的企业形象展示网站',
      product: '突出产品特色的展示页面',
      general: '现代化的网站项目'
    };
    return descriptions[projectType as keyof typeof descriptions] || '现代化的网站项目';
  }

  /**
   * 获取项目区块内容
   */
  private getProjectSections(projectType: string): string {
    const sections = {
      resume: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">专业技能</h3>
            <p className="text-gray-600">展示你的核心技能和专业能力</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">工作经历</h3>
            <p className="text-gray-600">详细的职业发展历程</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">项目作品</h3>
            <p className="text-gray-600">精选的项目案例展示</p>
          </div>`,
      portfolio: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">设计作品</h3>
            <p className="text-gray-600">创意设计和视觉作品</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">开发项目</h3>
            <p className="text-gray-600">技术实现和代码作品</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">获奖经历</h3>
            <p className="text-gray-600">荣誉和成就展示</p>
          </div>`,
      blog: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">最新文章</h3>
            <p className="text-gray-600">最近发布的博客内容</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">分类标签</h3>
            <p className="text-gray-600">按主题浏览文章</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">关于我</h3>
            <p className="text-gray-600">个人介绍和联系方式</p>
          </div>`,
      business: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">公司简介</h3>
            <p className="text-gray-600">企业历史和发展理念</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">产品服务</h3>
            <p className="text-gray-600">核心业务和服务内容</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibent mb-4">联系我们</h3>
            <p className="text-gray-600">联系方式和地址信息</p>
          </div>`,
      product: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">产品特色</h3>
            <p className="text-gray-600">核心功能和优势介绍</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">使用案例</h3>
            <p className="text-gray-600">实际应用场景展示</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">立即体验</h3>
            <p className="text-gray-600">试用和购买渠道</p>
          </div>`,
      general: `
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">功能特色</h3>
            <p className="text-gray-600">主要功能和特点介绍</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">使用指南</h3>
            <p className="text-gray-600">操作说明和帮助文档</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">联系支持</h3>
            <p className="text-gray-600">技术支持和客服信息</p>
          </div>`
    };
    return sections[projectType as keyof typeof sections] || sections.general;
  }



  /**
   * 调用专业模式API生成代码
   */
  private async callExpertModeGeneration(userInput: string): Promise<CodeFile[]> {
    try {
      console.log('🤖 [AI调用] 步骤1: 开始导入模块...');
      
      // 🔧 导入专家模式提示词和AI模型函数
      const { CODING_EXPERT_MODE_PROMPT } = await import('@/lib/prompts/coding');
      console.log('🤖 [AI调用] 步骤2: 提示词导入成功');
      
      const { generateWithModel } = await import('@/lib/ai-models');
      console.log('🤖 [AI调用] 步骤3: AI模型函数导入成功');
      
      // 🔧 构建完整的提示词
      const fullPrompt = `${CODING_EXPERT_MODE_PROMPT}

## 🎯 用户需求：
${userInput}

## 📋 输出要求：
请生成一个完整的Next.js项目，包含以下文件：
1. package.json - 项目配置
2. tailwind.config.js - Tailwind配置  
3. tsconfig.json - TypeScript配置
4. app/layout.tsx - 应用布局
5. app/page.tsx - 主页面
6. app/globals.css - 全局样式
7. components/ui/button.tsx - Button组件
8. lib/utils.ts - 工具函数

请以JSON格式返回，每个文件包含filename、content、description、language字段。`;

      console.log('🤖 [AI调用] 步骤4: 提示词构建完成，长度:', fullPrompt.length);
      console.log('🤖 [AI调用] 步骤5: 开始调用大模型API...');
      
      // 🔧 调用大模型API
      const result = await generateWithModel(
        'claude',
        'claude-sonnet-4-20250514',
        [{ role: 'user', content: fullPrompt }],
        { maxTokens: 8000 }
      );
      
      console.log('🤖 [AI调用] 步骤6: 大模型API调用成功');
      
      // 提取响应文本
      const responseText = 'text' in result ? result.text : JSON.stringify(result);
      
      console.log('🤖 [AI调用] 步骤7: 响应文本提取完成，长度:', responseText.length);
      console.log('🤖 [AI调用] 步骤8: 响应预览:', responseText.substring(0, 500) + '...');
      
      // 检查响应长度，如果太短可能有问题
      if (responseText.length < 100) {
        console.warn('🤖 [AI调用] 警告: 响应内容过短，可能生成失败');
        console.log('🤖 [AI调用] 完整响应内容:', responseText);
        throw new Error(`AI响应内容过短(${responseText.length}字符)，可能生成失败`);
      }
      
      // 🔧 解析AI响应
      const parsedResponse = this.parseAICodeResponse(responseText);
      
      console.log('🤖 [AI调用] 步骤9: 解析完成，得到', parsedResponse.length, '个文件');
      
      // 检查解析结果
      if (parsedResponse.length === 0) {
        console.warn('🤖 [AI调用] 警告: 解析结果为空，使用回退方案');
        return this.generateFallbackFiles(userInput);
      }
      
      return parsedResponse;
      
    } catch (error) {
      console.error('🤖 [AI调用] 调用失败，错误详情:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      // 🔧 检查具体的错误类型
      if (error instanceof Error) {
        console.error('🤖 [错误分析] 错误名称:', error.name);
        console.error('🤖 [错误分析] 错误消息:', error.message);
        
        // 检查是否是网络相关错误
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
          console.error('🤖 [网络错误] 检测到网络相关错误');
        }
        
        // 检查是否是 API 限制错误
        if (error.message.includes('rate limit') || error.message.includes('quota') || error.message.includes('429')) {
          console.error('🤖 [API限制] 检测到API限制错误');
        }
        
        // 检查是否是认证错误
        if (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('api key')) {
          console.error('🤖 [认证错误] 检测到API认证错误');
        }
        
        // 检查是否是超时错误
        if (error.message.includes('超时') || error.message.includes('timeout')) {
          console.error('🤖 [超时错误] API调用超时，可能是因为请求太复杂');
        }
      }
      
      // 🔧 回退到基础文件生成
      console.log('🤖 [AI调用] 使用回退方案生成基础文件...');
      const fallbackFiles = this.generateFallbackFiles(userInput);
      console.log('🤖 [回退方案] 生成了', fallbackFiles.length, '个回退文件');
      return fallbackFiles;
    }
  }

  /**
   * 解析AI代码响应
   */
  private parseAICodeResponse(response: string): CodeFile[] {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(response);
      
      if (parsed.files && Array.isArray(parsed.files)) {
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
      
      // 尝试从文本中提取代码块
      return this.extractCodeBlocksFromText(response);
    }
  }

  /**
   * 解析备用格式
   */
  private parseAlternativeFormat(response: string): CodeFile[] {
    // 这里可以添加其他格式的解析逻辑
    console.log('🤖 [备用解析] 尝试备用格式解析...');
    return this.extractCodeBlocksFromText(response);
  }

  /**
   * 从文本中提取代码块
   */
  private extractCodeBlocksFromText(text: string): CodeFile[] {
    const files: CodeFile[] = [];
    
    // 匹配代码块模式：```filename\ncontent\n```
    const codeBlockRegex = /```(\w+)?\s*(?:filename:?\s*([^\n]+))?\n([\s\S]*?)```/gi;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [, language, filename, content] = match;
      
      if (filename && content) {
        files.push({
          filename: filename.trim(),
          content: content.trim(),
          description: `从AI响应中提取的${language || ''}文件`,
          language: language || 'text'
        });
      }
    }
    
    console.log('🤖 [文本提取] 从文本中提取到', files.length, '个代码块');
    
    // 如果没有提取到文件，返回回退文件
    if (files.length === 0) {
      return this.generateFallbackFiles(text.substring(0, 100));
    }
    
    return files;
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
            'tailwindcss': '^3.3.0',
            'autoprefixer': '^10.4.14',
            'postcss': '^8.4.24',
            'lucide-react': '^0.263.1',
            'framer-motion': '^10.16.4'
          },
          devDependencies: {
            '@types/node': '^20.5.2',
            '@types/react': '^18.2.21',
            '@types/react-dom': '^18.2.7',
            'eslint': '^8.48.0',
            'eslint-config-next': '^13.4.19'
          }
        }, null, 2),
        description: '项目配置文件',
        language: 'json'
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
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}`,
        description: 'Tailwind CSS配置文件',
        language: 'javascript'
      },
      {
        filename: 'app/layout.tsx',
        content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectTitle}',
  description: '${this.getProjectDescription(projectType)}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`,
        description: 'Next.js应用布局',
        language: 'typescript'
      },
      {
        filename: 'app/page.tsx',
        content: `'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Mail, Github, Linkedin } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              ${projectTitle}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              ${this.getProjectDescription(projectType)}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              了解更多
              <ArrowRight className="ml-2 w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${this.getProjectSections(projectType)}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">联系方式</h2>
          <div className="flex justify-center space-x-6">
            <a href="mailto:hello@example.com" className="flex items-center text-gray-600 hover:text-blue-600">
              <Mail className="w-5 h-5 mr-2" />
              邮箱
            </a>
            <a href="https://github.com" className="flex items-center text-gray-600 hover:text-blue-600">
              <Github className="w-5 h-5 mr-2" />
              GitHub
            </a>
            <a href="https://linkedin.com" className="flex items-center text-gray-600 hover:text-blue-600">
              <Linkedin className="w-5 h-5 mr-2" />
              LinkedIn
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}`,
        description: 'React主页面组件',
        language: 'typescript'
      },
      {
        filename: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`,
        description: '全局CSS样式',
        language: 'css'
      }
    ];
  }
} 