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
} 