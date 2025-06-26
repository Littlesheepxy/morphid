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
      
      // 检查是否为测试模式
      const isTestMode = userInput.includes('[TEST_MODE]');
      const cleanInput = userInput.replace(/\[FORCE_AGENT:\w+\]/, '').replace(/\[TEST_MODE\]/, '').trim();
      
      if (isTestMode) {
        yield* this.handleTestMode(cleanInput, sessionData);
        return;
      }

      // 原有的正常模式逻辑
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
  private async* handleTestMode(
    userInput: string, 
    sessionData: SessionData
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 如果是初始启动测试模式（空输入或启动消息）
      if (!userInput || userInput === '启动测试代码生成模式') {
        yield this.createResponse({
          immediate_display: {
            reply: `🧪 **代码生成测试模式已启动！**

我现在可以根据你的具体需求生成各种类型的Web项目代码。

### 💡 支持的项目类型：
- 个人简历/作品集网站
- 商业展示页面  
- 博客网站
- 产品介绍页
- 公司官网
- 登陆页面
- 仪表板界面
- 其他任何Web应用

### 🔧 技术栈：
- Next.js 15 + TypeScript
- Tailwind CSS + shadcn/ui
- 响应式设计
- 现代化UI

请告诉我你想要创建什么类型的项目，我会为你生成完整的代码！

**示例：**
- "创建一个个人简历网站"
- "生成一个产品展示页面" 
- "制作一个公司介绍网站"`,
            agent_name: this.name,
            timestamp: new Date().toISOString()
          },
          system_state: {
            intent: 'test_mode_ready',
            done: false,
            progress: 10,
            current_stage: '等待用户需求',
            metadata: {
              testMode: true,
              readyForInput: true
            }
          }
        });
        return;
      }

      // 处理用户的具体需求
      yield this.createThinkingResponse('正在分析你的需求...', 30);
      await this.delay(1000);

      yield this.createThinkingResponse('正在设计项目结构...', 50);
      await this.delay(1500);

      yield this.createThinkingResponse('正在生成代码文件...', 80);
      await this.delay(2000);

      // 生成测试项目代码
      const testFiles = this.generateTestModeFiles(userInput);

      yield this.createResponse({
        immediate_display: {
          reply: `🎉 **测试代码生成完成！**

根据你的需求"${userInput}"，我已经生成了一个完整的项目，包含${testFiles.length}个文件。

你可以在右侧查看代码和预览效果。如果需要修改，请告诉我具体要调整什么！`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'test_project_complete',
          done: true,
          progress: 100,
          current_stage: '测试项目生成完成',
          metadata: {
            testMode: true,
            projectGenerated: true,
            totalFiles: testFiles.length,
            generatedAt: new Date().toISOString(),
            projectFiles: testFiles,
            userRequest: userInput
          }
        }
      });

      // 更新会话数据
      this.updateSessionWithProject(sessionData, testFiles);

    } catch (error) {
      yield await this.handleError(error as Error, sessionData);
    }
  }

  /**
   * 生成测试模式的文件
   */
  private generateTestModeFiles(userInput: string): CodeFile[] {
    // 根据用户输入生成不同类型的项目
    const projectType = this.determineProjectType(userInput);
    
    const files: CodeFile[] = [];

    // 基础配置文件
    files.push({
      filename: 'package.json',
      content: this.generateTestPackageJson(projectType),
      description: 'Node.js项目配置文件',
      language: 'json'
    });

    files.push({
      filename: 'tailwind.config.js',
      content: this.generateTestTailwindConfig(),
      description: 'Tailwind CSS配置',
      language: 'javascript'
    });

    files.push({
      filename: 'tsconfig.json',
      content: this.generateTestTsConfig(),
      description: 'TypeScript配置',
      language: 'json'
    });

    // 主要组件文件
    files.push({
      filename: 'app/page.tsx',
      content: this.generateTestMainPage(projectType, userInput),
      description: 'React主页面组件',
      language: 'typescript'
    });

    files.push({
      filename: 'app/layout.tsx',
      content: this.generateTestLayout(projectType),
      description: 'Next.js应用布局',
      language: 'typescript'
    });

    files.push({
      filename: 'app/globals.css',
      content: this.generateTestGlobalStyles(),
      description: '全局CSS样式',
      language: 'css'
    });

    // 组件文件
    files.push({
      filename: 'components/ui/button.tsx',
      content: this.generateTestButtonComponent(),
      description: 'Button组件',
      language: 'typescript'
    });

    files.push({
      filename: 'lib/utils.ts',
      content: this.generateTestUtils(),
      description: '工具函数',
      language: 'typescript'
    });

    return files;
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
   * 生成测试用的package.json
   */
  private generateTestPackageJson(projectType: string): string {
    return JSON.stringify({
      "name": `heysme-${projectType}-project`,
      "version": "0.1.0",
      "private": true,
      "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint"
      },
      "dependencies": {
        "react": "^18",
        "react-dom": "^18",
        "next": "15.0.3",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "typescript": "^5",
        "tailwindcss": "^3.4.0",
        "autoprefixer": "^10.0.1",
        "postcss": "^8",
        "lucide-react": "^0.263.1",
        "framer-motion": "^10.16.4"
      }
    }, null, 2);
  }

  /**
   * 生成测试用的Tailwind配置
   */
  private generateTestTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
    },
  },
  plugins: [],
}`;
  }

  /**
   * 生成测试用的TypeScript配置
   */
  private generateTestTsConfig(): string {
    return JSON.stringify({
      "compilerOptions": {
        "target": "es5",
        "lib": ["dom", "dom.iterable", "es6"],
        "allowJs": true,
        "skipLibCheck": true,
        "strict": true,
        "noEmit": true,
        "esModuleInterop": true,
        "module": "esnext",
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "jsx": "preserve",
        "incremental": true,
        "plugins": [
          {
            "name": "next"
          }
        ],
        "baseUrl": ".",
        "paths": {
          "@/*": ["./*"]
        }
      },
      "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      "exclude": ["node_modules"]
    }, null, 2);
  }

  /**
   * 生成测试用的主页面
   */
  private generateTestMainPage(projectType: string, userInput: string): string {
    return `import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            ${this.getProjectTitle(projectType, userInput)}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            ${this.getProjectDescription(projectType)}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg">
            开始探索
          </Button>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          ${this.getProjectSections(projectType)}
        </div>
      </div>
    </div>
  )
}`;
  }

  /**
   * 生成测试用的布局
   */
  private generateTestLayout(projectType: string): string {
    return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${this.getProjectTitle(projectType, '')}',
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
}`;
  }

  /**
   * 生成测试用的全局样式
   */
  private generateTestGlobalStyles(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`;
  }

  /**
   * 生成测试用的Button组件
   */
  private generateTestButtonComponent(): string {
    return `import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"
    
    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "underline-offset-4 hover:underline text-primary"
    }
    
    const sizeClasses = {
      default: "h-10 py-2 px-4",
      sm: "h-9 px-3 rounded-md",
      lg: "h-11 px-8 rounded-md",
      icon: "h-10 w-10"
    }

    return (
      <button
        className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${className}\`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }`;
  }

  /**
   * 生成测试用的工具函数
   */
  private generateTestUtils(): string {
    return `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwindcss-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}`;
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
} 