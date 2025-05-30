import { BaseAgent } from './base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent,
  PersonalizationProfile
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';

/**
 * Coding Agent - 基于设计方案生成高质量代码
 */
export class CodingAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json', 'html'],
      maxRetries: 3,
      timeout: 60000
    };
    
    super('CodingAgent', capabilities);
  }

  /**
   * 主处理流程 - 生成完整的个性化页面代码
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 获取设计方案
      yield this.createThinkingResponse('正在分析设计方案，准备生成代码...', 80);
      await this.delay(1000);

      const designData = this.extractDesignData(sessionData);
      if (!designData) {
        throw new Error('未找到页面设计方案');
      }

      const { designStrategy, developmentPrompt } = designData;
      const userGoal = this.extractUserGoal(sessionData);
      const userType = this.extractUserType(sessionData);
      const collectedData = sessionData.collectedData;

      // 步骤2: 生成项目结构和依赖
      yield this.createResponse({
        immediate_display: {
          reply: '🏗️ 正在搭建项目基础架构...\n\n📦 生成依赖配置和项目结构',
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'generating',
          done: false,
          progress: 85,
          current_stage: '生成项目配置',
          metadata: { phase: 'setup' }
        }
      });

      await this.delay(1500);

      // 生成package.json
      const packageJson = this.generatePackageJson(designStrategy, userType);
      
      yield this.createCodeResponse('📦 **依赖配置文件**', [{
        filename: 'package.json',
        content: packageJson,
        description: '项目依赖配置，包含优化的技术栈',
        language: 'json'
      }]);

      await this.delay(1000);

      // 步骤3: 生成配置文件
      yield this.createThinkingResponse('⚙️ 生成配置文件和工具设置...', 88);
      await this.delay(800);

      const configFiles = this.generateConfigFiles(designStrategy, userType);
      
      yield this.createCodeResponse('⚙️ **项目配置文件**', configFiles);

      await this.delay(1200);

      // 步骤4: 生成核心组件
      yield this.createThinkingResponse('🧩 生成核心组件和页面结构...', 92);
      await this.delay(1000);

      const coreComponents = this.generateCoreComponents(designStrategy, collectedData, userType);
      
      yield this.createCodeResponse('🧩 **核心组件代码**', coreComponents);

      await this.delay(1500);

      // 步骤5: 生成主页面
      yield this.createThinkingResponse('📄 生成主页面和布局...', 96);
      await this.delay(1000);

      const mainPages = this.generateMainPages(designStrategy, collectedData, userType);
      
      yield this.createCodeResponse('📄 **主页面代码**', mainPages);

      await this.delay(1000);

      // 步骤6: 生成样式和资源文件
      const styleFiles = this.generateStyleFiles(designStrategy, userType);
      
      yield this.createCodeResponse('🎨 **样式文件**', styleFiles);

      await this.delay(800);

      // 步骤7: 生成部署和使用说明
      const deploymentGuide = this.generateDeploymentGuide();
      const readme = this.generateReadme(designStrategy, userGoal, userType);

      // 生成部署指导
      yield this.createCodeResponse('📖 **部署指导和说明**', [
        {
          filename: 'README.md',
          content: readme,
          description: '项目说明和使用指导',
          language: 'markdown'
        },
        {
          filename: 'DEPLOYMENT.md',
          content: deploymentGuide,
          description: '部署指导文档',
          language: 'markdown'
        }
      ]);

      // 最终完成消息
      yield this.createResponse({
        immediate_display: {
          reply: `🎉 **恭喜！您的个性化页面已生成完成！**\n\n✨ 基于${userType}身份定制的专业页面\n📱 完全响应式设计，支持移动端\n🚀 使用Next.js + TypeScript + Tailwind CSS\n🎨 集成Shadcn/ui组件库\n⚡ 可一键部署到Vercel\n\n**下一步操作：**\n1️⃣ 将代码保存到本地文件夹\n2️⃣ 运行 \`npm install\` 安装依赖\n3️⃣ 运行 \`npm run dev\` 本地预览\n4️⃣ 运行 \`npm run deploy\` 部署上线`,
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'done',
          done: true,
          progress: 100,
          current_stage: '代码生成完成',
          metadata: {
            success: true,
            filesGenerated: true,
            deploymentReady: true
          }
        }
      });

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 提取设计数据
   */
  private extractDesignData(sessionData: SessionData): any {
    // 从AgentFlow中找到最近的设计数据
    const designEntry = sessionData.agentFlow
      .filter(entry => entry.agent === 'PromptOutputAgent' && entry.status === 'completed')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

    if (!designEntry?.output) return null;

    return {
      designStrategy: (designEntry.output as any).designStrategy,
      developmentPrompt: (designEntry.output as any).developmentPrompt
    };
  }

  /**
   * 生成package.json
   */
  private generatePackageJson(strategy: any, userType: string): string {
    const basePackage: any = {
      name: "personal-portfolio",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        deploy: "npm run build && npx vercel --prod"
      },
      dependencies: {
        "next": "14.0.0",
        "react": "^18",
        "react-dom": "^18",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "typescript": "^5",
        "tailwindcss": "^3.3.0",
        "autoprefixer": "^10",
        "postcss": "^8",
        "lucide-react": "^0.294.0",
        "clsx": "^2.0.0",
        "tailwind-merge": "^2.0.0"
      },
      devDependencies: {
        "eslint": "^8",
        "eslint-config-next": "14.0.0"
      }
    };

    // 根据功能需求添加依赖
    if (strategy.features?.animations) {
      basePackage.dependencies["framer-motion"] = "^10.16.0";
    }

    if (strategy.features?.downloadPdf) {
      basePackage.dependencies["jspdf"] = "^2.5.1";
      basePackage.dependencies["html2canvas"] = "^1.4.1";
    }

    if (strategy.features?.contactForm) {
      basePackage.dependencies["react-hook-form"] = "^7.47.0";
      basePackage.dependencies["@hookform/resolvers"] = "^3.3.2";
      basePackage.dependencies["zod"] = "^3.22.4";
    }

    // 根据用户类型添加特定依赖
    if (userType === '开发者' || userType === 'AI从业者') {
      basePackage.dependencies["prism-react-renderer"] = "^2.3.0";
      basePackage.dependencies["react-syntax-highlighter"] = "^15.5.0";
    }

    if (userType === '产品经理') {
      basePackage.dependencies["chart.js"] = "^4.4.0";
      basePackage.dependencies["react-chartjs-2"] = "^5.2.0";
    }

    // 添加Shadcn/ui组件
    basePackage.dependencies["@radix-ui/react-avatar"] = "^1.0.4";
    basePackage.dependencies["@radix-ui/react-button"] = "^0.1.0";
    basePackage.dependencies["@radix-ui/react-card"] = "^0.1.0";
    basePackage.dependencies["@radix-ui/react-dialog"] = "^1.0.5";
    basePackage.dependencies["@radix-ui/react-tooltip"] = "^1.0.7";

    return JSON.stringify(basePackage, null, 2);
  }

  /**
   * 生成配置文件
   */
  private generateConfigFiles(strategy: any, userType: string): CodeFile[] {
    const files: CodeFile[] = [];

    // Next.js配置
    files.push({
      filename: 'next.config.js',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['github.com', 'avatars.githubusercontent.com'],
  },
  // 优化性能
  swcMinify: true,
  // 支持PWA（可选）
  ${strategy.features?.progressive ? `
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/_next/static/sw.js',
      },
    ]
  },` : ''}
}

module.exports = nextConfig`,
      description: 'Next.js框架配置',
      language: 'javascript'
    });

    // Tailwind CSS配置
    const tailwindConfig = this.generateTailwindConfig(strategy, userType);
    files.push({
      filename: 'tailwind.config.js',
      content: tailwindConfig,
      description: 'Tailwind CSS配置，包含个性化主题',
      language: 'javascript'
    });

    // PostCSS配置
    files.push({
      filename: 'postcss.config.js',
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
      description: 'PostCSS配置',
      language: 'javascript'
    });

    // TypeScript配置
    files.push({
      filename: 'tsconfig.json',
      content: `{
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
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
      description: 'TypeScript配置',
      language: 'json'
    });

    return files;
  }

  /**
   * 生成Tailwind配置
   */
  private generateTailwindConfig(strategy: any, userType: string): string {
    const colorScheme = this.getColorScheme(strategy, userType);
    
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "${colorScheme.primary}",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "${colorScheme.secondary}",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "${colorScheme.accent}",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}`;
  }

  /**
   * 生成核心组件
   */
  private generateCoreComponents(strategy: any, collectedData: any, userType: string): CodeFile[] {
    const files: CodeFile[] = [];

    // 生成UI组件
    files.push(...this.generateUIComponents());
    
    // 生成数据配置
    files.push(this.generateDataConfig(collectedData, userType));
    
    // 生成实用工具
    files.push(this.generateUtils());

    return files;
  }

  /**
   * 生成UI组件
   */
  private generateUIComponents(): CodeFile[] {
    return [
      {
        filename: 'components/ui/button.tsx',
        content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }`,
        description: 'Shadcn/ui Button组件',
        language: 'typescript'
      },
      {
        filename: 'components/ui/card.tsx',
        content: `import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`,
        description: 'Shadcn/ui Card组件',
        language: 'typescript'
      }
    ];
  }

  /**
   * 生成数据配置
   */
  private generateDataConfig(collectedData: any, userType: string): CodeFile {
    const config = {
      personal: {
        name: collectedData.personal?.fullName || "Your Name",
        title: collectedData.professional?.currentTitle || "Professional Title",
        bio: collectedData.professional?.summary || "Professional summary goes here",
        location: collectedData.personal?.location || "Location",
        email: collectedData.personal?.email || "your.email@example.com",
        phone: collectedData.personal?.phone || "",
        website: collectedData.personal?.website || "",
        linkedin: collectedData.personal?.linkedin || "",
        github: collectedData.personal?.github || ""
      },
      skills: collectedData.professional?.skills || [],
      experience: collectedData.experience || [],
      projects: collectedData.projects || [],
      education: collectedData.education || []
    };

    return {
      filename: 'lib/data.ts',
      content: `export const userData = ${JSON.stringify(config, null, 2)};

export type UserData = typeof userData;`,
      description: '用户数据配置文件',
      language: 'typescript'
    };
  }

  /**
   * 生成工具函数
   */
  private generateUtils(): CodeFile {
    return {
      filename: 'lib/utils.ts',
      content: `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long'
  });
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}`,
      description: '实用工具函数',
      language: 'typescript'
    };
  }

  /**
   * 生成主页面
   */
  private generateMainPages(strategy: any, collectedData: any, userType: string): CodeFile[] {
    const files: CodeFile[] = [];

    // App Router layout
    files.push({
      filename: 'app/layout.tsx',
      content: this.generateRootLayout(strategy, userType),
      description: '根布局文件',
      language: 'typescript'
    });

    // 主页面
    files.push({
      filename: 'app/page.tsx',
      content: this.generateMainPage(strategy, collectedData, userType),
      description: '主页面组件',
      language: 'typescript'
    });

    return files;
  }

  /**
   * 生成根布局
   */
  private generateRootLayout(strategy: any, userType: string): string {
    return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '个人主页 | Professional Portfolio',
  description: '个性化的专业展示页面',
  keywords: ['portfolio', 'resume', '个人主页', '${userType}'],
  authors: [{ name: 'Portfolio Owner' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className={inter.className}>
        <div className="min-h-screen bg-background font-sans antialiased">
          {children}
        </div>
      </body>
    </html>
  )
}`;
  }

  /**
   * 生成主页面
   */
  private generateMainPage(strategy: any, collectedData: any, userType: string): string {
    const sections = strategy.sections || [];
    
    let sectionComponents = '';
    let sectionImports = '';

    sections.forEach((section: any) => {
      const componentName = this.getSectionComponentName(section.type);
      sectionImports += `import { ${componentName} } from '@/components/sections/${componentName}'\n`;
      sectionComponents += `        <${componentName} />\n`;
    });

    return `import React from 'react'
${sectionImports}

export default function HomePage() {
  return (
    <main className="relative">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Portfolio</h1>
            <div className="hidden md:flex space-x-6">
              ${sections.map((section: any) => `
              <a href="#${section.id}" className="text-sm hover:text-primary transition-colors">
                ${section.title}
              </a>`).join('')}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
${sectionComponents}
      </div>
    </main>
  )
}`;
  }

  /**
   * 生成样式文件
   */
  private generateStyleFiles(strategy: any, userType: string): CodeFile[] {
    return [
      {
        filename: 'app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Custom animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}`,
        description: '全局样式文件',
        language: 'css'
      }
    ];
  }

  // 辅助方法
  private getSectionComponentName(type: string): string {
    const componentMap: Record<string, string> = {
      'hero_banner': 'HeroSection',
      'tech_stack_visual': 'SkillsSection',
      'skill_cloud': 'SkillsSection',
      'progress_bars': 'SkillsSection',
      'project_cards': 'ProjectsSection',
      'timeline': 'ExperienceSection',
      'contact_info': 'ContactSection'
    };
    
    return componentMap[type] || 'DefaultSection';
  }

  private getColorScheme(strategy: any, userType: string): any {
    // 根据策略和用户类型返回颜色方案
    return {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA'
    };
  }

  private generateDeploymentGuide(): string {
    return `# 部署指导

## 本地开发

1. 安装依赖：
\`\`\`bash
npm install
\`\`\`

2. 启动开发服务器：
\`\`\`bash
npm run dev
\`\`\`

3. 打开浏览器访问 http://localhost:3000

## Vercel部署（推荐）

1. 将代码上传到GitHub
2. 访问 vercel.com
3. 连接GitHub账户
4. 选择你的项目仓库
5. 点击Deploy

## 其他部署选项

- **Netlify**: 支持拖拽部署
- **GitHub Pages**: 静态托管
- **Railway**: 全栈应用托管
`;
  }

  private generateReadme(strategy: any, userGoal: string, userType: string): string {
    return `# 个人作品集网站

${userType}专属的个性化展示页面，采用现代化技术栈构建。

## 技术栈

- ⚡ **Next.js 14** - React全栈框架
- 🎨 **Tailwind CSS** - 原子化CSS框架
- 🧩 **Shadcn/ui** - 现代化组件库
- 📱 **响应式设计** - 完美适配所有设备
- 🌙 **暗色模式** - 护眼夜间模式
- ⚡ **性能优化** - 快速加载体验

## 功能特性

${strategy.features?.downloadPdf ? '- 📥 PDF简历下载' : ''}
${strategy.features?.socialLinks ? '- 🔗 社交媒体集成' : ''}
${strategy.features?.contactForm ? '- 📧 联系表单' : ''}
${strategy.features?.animations ? '- ✨ 流畅动画效果' : ''}
- 🚀 SEO友好
- 📱 移动端优化

## 快速开始

\`\`\`bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 部署到Vercel
npm run deploy
\`\`\`

## 自定义配置

编辑 \`lib/data.ts\` 文件来更新个人信息：

\`\`\`typescript
export const userData = {
  personal: {
    name: "您的姓名",
    title: "您的职位",
    // ...
  }
};
\`\`\`

## 目录结构

\`\`\`
├── app/                  # Next.js App Router
├── components/           # React组件
│   ├── ui/              # UI基础组件
│   └── sections/        # 页面区块组件
├── lib/                 # 工具函数和配置
└── public/              # 静态资源
\`\`\`

---

🎉 享受您的专属个人网站！`;
  }

  private createCodeResponse(title: string, codeBlocks: CodeFile[]): StreamableAgentResponse {
    return this.createResponse({
      immediate_display: {
        reply: title,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'generating',
        done: false,
        progress: 90,
        current_stage: '代码生成中',
        metadata: { filesCount: codeBlocks.length, codeBlocks }
      }
    });
  }

  private extractUserGoal(sessionData: SessionData): string {
    return sessionData.userIntent?.primary_goal?.split('（')[0] || '其他';
  }

  private extractUserType(sessionData: SessionData): string {
    const profession = sessionData.personalization?.identity?.profession;
    const typeMap: Record<string, string> = {
      'developer': '开发者',
      'designer': '设计师',
      'product_manager': '产品经理',
      'marketer': '创意人',
      'other': '其他'
    };
    
    return typeMap[profession || 'other'] || '其他';
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 类型定义
interface CodeFile {
  filename: string;
  content: string;
  description: string;
  language: string;
}
