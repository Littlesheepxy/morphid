import { BaseAgent } from './base-agent';
import { 
  StreamableAgentResponse, 
  AgentCapabilities,
  UserIntent,
  PersonalizationProfile
} from '@/lib/types/streaming';
import { SessionData } from '@/lib/types/session';
import { AGENT_PROMPTS, formatPrompt } from '@/lib/prompts/agent-templates';
import { z } from 'zod';

/**
 * Prompt Output Agent - 页面结构设计和开发任务生成
 */
export class PromptOutputAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: false,
      outputFormats: ['json', 'markdown'],
      maxRetries: 2,
      timeout: 20000
    };
    
    super('PromptOutputAgent', capabilities);
  }

  /**
   * 主处理流程 - 生成页面设计方案和开发任务
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 分析用户信息
      yield this.createThinkingResponse('正在分析您的信息，设计最适合的页面结构...', 50);
      await this.delay(1200);

      const userGoal = this.extractUserGoal(sessionData);
      const userType = this.extractUserType(sessionData);
      const collectedData = sessionData.collectedData;

      // 步骤2: 使用 AI 生成页面设计策略
      const designStrategy = await this.generateDesignStrategyWithAI(userGoal, userType, collectedData, sessionData.personalization);
      
      yield this.createResponse({
        immediate_display: {
          reply: this.formatDesignStrategyMessage(designStrategy, userType),
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'designing',
          done: false,
          progress: 70,
          current_stage: '页面设计方案',
          metadata: { designStrategy }
        }
      });

      await this.delay(1500);

      // 步骤3: 生成开发任务描述
      yield this.createThinkingResponse('正在生成开发指令和技术方案...', 85);
      await this.delay(1000);

      const developmentPrompt = this.generateDevelopmentPrompt(designStrategy, userGoal, userType, collectedData);

      // 步骤4: 输出最终设计方案
      yield this.createResponse({
        immediate_display: {
          reply: '🎯 页面设计方案已完成！现在开始生成您的专属代码...',
          agent_name: this.name,
          timestamp: new Date().toISOString()
        },
        system_state: {
          intent: 'advance',
          done: true,
          progress: 75,
          current_stage: '页面设计完成',
          metadata: {
            designStrategy,
            developmentPrompt,
            readyForCoding: true
          }
        }
      });

      // 更新会话数据
      this.updateSessionWithDesign(sessionData, designStrategy, developmentPrompt);

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 使用 AI 生成设计策略
   */
  private async generateDesignStrategyWithAI(
    userGoal: string,
    userType: string,
    collectedData: any,
    personalization?: PersonalizationProfile
  ): Promise<DesignStrategy> {
    try {
      console.log("🤖 PromptOutputAgent 调用 AI 生成设计策略...");
      
      // 使用模板生成prompt
      const prompt = formatPrompt(AGENT_PROMPTS.PROMPT_OUTPUT_AGENT, {
        collected_user_info: JSON.stringify(collectedData, null, 2),
        user_goal: userGoal,
        user_type: userType
      });

      // 定义设计策略的 Schema
      const designStrategySchema = z.object({
        layout: z.enum(['portfolio_showcase', 'project_grid', 'classic_timeline', 'professional_blocks', 'modern_card', 'consultation_layout']),
        theme: z.enum(['tech_blue', 'creative_purple', 'business_gray', 'nature_green', 'vibrant_orange', 'modern', 'classic', 'creative', 'minimal', 'corporate']),
        sections: z.array(z.object({
          id: z.string(),
          title: z.string(),
          type: z.string(),
          priority: z.enum(['high', 'medium', 'low']),
          required: z.boolean()
        })),
        features: z.object({
          darkMode: z.boolean(),
          responsive: z.boolean(),
          animations: z.boolean(),
          downloadPdf: z.boolean(),
          socialLinks: z.boolean(),
          contactForm: z.boolean(),
          analytics: z.boolean(),
          seo: z.boolean()
        }),
        customizations: z.object({
          colorScheme: z.string(),
          typography: z.string(),
          spacing: z.string(),
          borderRadius: z.string(),
          shadows: z.string()
        }),
        priority: z.enum(['speed', 'quality', 'features']),
        audience: z.string()
      });

      // 调用 AI API
      const result = await this.callLLM(prompt, {
        schema: designStrategySchema,
        maxTokens: 2000,
        system: "你是一个专业的页面设计策略专家，严格按照要求的JSON格式返回设计方案。"
      });

      if ('object' in result) {
        console.log("✅ AI 设计策略生成成功");
        // 补充内容生成
        const strategy = result.object as any;
        strategy.sections = strategy.sections.map((section: any) => ({
          ...section,
          content: this.generateSectionContent(section.type, collectedData, userType)
        }));
        
        return strategy;
      } else {
        throw new Error('AI 返回格式不正确');
      }
    } catch (error) {
      console.error("❌ AI 设计策略生成失败，使用默认策略:", error);
      // 回退到原有的逻辑生成方法
      return this.generateDesignStrategy(userGoal, userType, collectedData, personalization);
    }
  }

  /**
   * 生成设计策略（回退方法）
   */
  private generateDesignStrategy(
    userGoal: string,
    userType: string,
    collectedData: any,
    personalization?: PersonalizationProfile
  ): DesignStrategy {
    const strategy: DesignStrategy = {
      layout: this.determineLayout(userGoal, userType, collectedData),
      theme: this.determineTheme(userType, personalization),
      sections: this.determineSections(userGoal, userType, collectedData),
      features: this.determineFeatures(userGoal, userType, collectedData),
      customizations: this.generateCustomizations(userType, collectedData),
      priority: this.determinePriority(userGoal),
      audience: this.determineAudience(userGoal)
    };

    return strategy;
  }

  /**
   * 确定页面布局
   */
  private determineLayout(userGoal: string, userType: string, collectedData: any): LayoutType {
    // 根据用户类型和目标选择最适合的布局
    if (userType === '设计师' || userGoal === '作品展示') {
      return 'portfolio_showcase'; // 作品集展示型
    } else if (userType === '开发者' || userType === 'AI从业者') {
      return 'project_grid'; // 项目网格型
    } else if (userGoal === '求职') {
      return 'classic_timeline'; // 经典时间线型
    } else if (userType === '产品经理') {
      return 'professional_blocks'; // 专业模块型
    } else {
      return 'modern_card'; // 现代卡片型
    }
  }

  /**
   * 确定主题风格
   */
  private determineTheme(userType: string, personalization?: PersonalizationProfile): ThemeType {
    // 优先使用用户偏好
    if (personalization?.preferences?.style) {
      return personalization.preferences.style as ThemeType;
    }

    // 根据身份类型选择合适主题
    const themeMap: Record<string, ThemeType> = {
      'AI从业者': 'tech_blue',
      '开发者': 'tech_blue', 
      '设计师': 'creative_purple',
      '产品经理': 'business_gray',
      '创意人': 'vibrant_orange',
      '学生求职者': 'nature_green'
    };

    return themeMap[userType] || 'tech_blue';
  }

  /**
   * 确定页面sections
   */
  private determineSections(userGoal: string, userType: string, collectedData: any): PageSection[] {
    const sections: PageSection[] = [];
    
    // 基础Hero区域 - 必需
    sections.push({
      id: 'hero',
      title: '个人介绍',
      type: 'hero_banner',
      priority: 'high',
      content: this.generateHeroContent(collectedData),
      required: true
    });

    // 技能展示 - 根据数据决定
    if (collectedData.professional?.skills?.length > 0) {
      sections.push({
        id: 'skills',
        title: '核心技能',
        type: this.getSkillsDisplayType(userType),
        priority: 'high',
        content: this.generateSkillsContent(collectedData.professional.skills, userType),
        required: true
      });
    }

    // 项目/作品展示 - 设计师和开发者优先
    if (collectedData.projects?.length > 0 || ['设计师', '开发者', 'AI从业者'].includes(userType)) {
      sections.push({
        id: 'projects',
        title: userType === '设计师' ? '设计作品' : '项目经验',
        type: 'project_cards',
        priority: ['设计师', '开发者'].includes(userType) ? 'high' : 'medium',
        content: this.generateProjectsContent(collectedData.projects, userType),
        required: userGoal === '作品展示'
      });
    }

    // 工作经历 - 求职导向必需
    if (collectedData.experience?.length > 0 || userGoal === '求职') {
      sections.push({
        id: 'experience',
        title: '工作经历',
        type: 'timeline',
        priority: userGoal === '求职' ? 'high' : 'medium',
        content: this.generateExperienceContent(collectedData.experience),
        required: userGoal === '求职'
      });
    }

    // 联系方式 - 总是需要
    sections.push({
      id: 'contact',
      title: '联系我',
      type: 'contact_info',
      priority: 'high',
      content: this.generateContactContent(collectedData.personal),
      required: true
    });

    return sections;
  }

  /**
   * 确定功能特性
   */
  private determineFeatures(userGoal: string, userType: string, collectedData: any): FeatureConfig {
    return {
      darkMode: true,
      responsive: true,
      animations: !userGoal.includes('试试看'), // 快速体验模式减少动画
      downloadPdf: userGoal === '求职',
      socialLinks: Boolean(collectedData.personal?.github || collectedData.personal?.linkedin),
      contactForm: ['找合作', '作品展示'].includes(userGoal),
      analytics: false,
      seo: true,
      lazyLoading: true,
      progressiveEnhancement: true
    };
  }

  /**
   * 生成个性化定制
   */
  private generateCustomizations(userType: string, collectedData: any): CustomizationConfig {
    const customizations: CustomizationConfig = {
      colorScheme: this.getColorScheme(userType),
      typography: this.getTypography(userType),
      spacing: 'comfortable',
      borderRadius: 'rounded',
      shadows: 'moderate'
    };

    // 特定身份的定制
    if (userType === '设计师') {
      customizations.portfolioFeatures = {
        imageGallery: true,
        caseStudyLayout: true,
        designProcess: true
      };
    } else if (userType === '开发者' || userType === 'AI从业者') {
      customizations.techFeatures = {
        codeHighlighting: true,
        githubIntegration: true,
        techStackVisual: true
      };
    } else if (userType === '产品经理') {
      customizations.businessFeatures = {
        dataVisualization: true,
        metricsDashboard: true,
        testimonials: true
      };
    }

    return customizations;
  }

  /**
   * 确定优先级
   */
  private determinePriority(userGoal: string): 'speed' | 'quality' | 'features' {
    if (userGoal === '试试看') return 'speed';
    if (userGoal === '作品展示') return 'quality';
    if (userGoal === '求职') return 'features';
    return 'quality';
  }

  /**
   * 确定目标受众
   */
  private determineAudience(userGoal: string): string {
    const audienceMap: Record<string, string> = {
      '求职': 'HR和招聘经理',
      '作品展示': '客户和合作伙伴',
      '找合作': '潜在合作伙伴',
      '纯炫技': '同行和技术社区',
      '试试看': '个人展示'
    };
    
    return audienceMap[userGoal] || '通用受众';
  }

  /**
   * 生成开发任务描述
   */
  private generateDevelopmentPrompt(
    strategy: DesignStrategy,
    userGoal: string,
    userType: string,
    collectedData: any
  ): string {
    const techStack = this.getRecommendedTechStack(strategy, userType);
    
    return `
## 页面开发任务

### 项目概述
创建一个${userGoal}导向的个性化展示页面，目标受众为${strategy.audience}。

### 设计规格
- **布局类型**: ${strategy.layout}
- **主题风格**: ${strategy.theme}
- **优先级**: ${strategy.priority}

### 技术栈要求
${techStack.framework} + ${techStack.styling} + ${techStack.components}

### 页面结构
${strategy.sections.map(section => 
  `- ${section.title} (${section.type}) - 优先级: ${section.priority}`
).join('\n')}

### 功能要求
${Object.entries(strategy.features)
  .filter(([_, enabled]) => enabled)
  .map(([feature, _]) => `- ${feature}`)
  .join('\n')}

### 个性化要求
- 配色方案: ${strategy.customizations.colorScheme}
- 字体方案: ${strategy.customizations.typography}
- 特殊功能: ${JSON.stringify(strategy.customizations, null, 2)}

### 用户数据
\`\`\`json
${JSON.stringify(collectedData, null, 2)}
\`\`\`

### 代码质量要求
- TypeScript严格模式
- 响应式设计 (移动端优先)
- SEO优化
- 性能优化 (Lighthouse 90+)
- 可访问性 (WCAG 2.1 AA)
`;
  }

  /**
   * 获取推荐技术栈
   */
  private getRecommendedTechStack(strategy: DesignStrategy, userType: string): TechStack {
    return {
      framework: 'Next.js 14',
      styling: 'Tailwind CSS',
      components: 'Shadcn/ui',
      animations: strategy.features.animations ? 'Framer Motion' : 'CSS Transitions',
      icons: 'Lucide React',
      deployment: 'Vercel',
      extras: this.getTechStackExtras(strategy, userType)
    };
  }

  /**
   * 获取技术栈扩展
   */
  private getTechStackExtras(strategy: DesignStrategy, userType: string): string[] {
    const extras: string[] = [];
    
    if (strategy.features.downloadPdf) {
      extras.push('jsPDF', 'html2canvas');
    }
    
    if (userType === '开发者' || userType === 'AI从业者') {
      extras.push('Prism React Renderer');
    }
    
    if (userType === '产品经理') {
      extras.push('Chart.js', 'React Chartjs 2');
    }
    
    if (strategy.features.contactForm) {
      extras.push('React Hook Form', 'Zod');
    }
    
    return extras;
  }

  /**
   * 格式化设计策略消息
   */
  private formatDesignStrategyMessage(strategy: DesignStrategy, userType: string): string {
    let message = `🎨 **页面设计方案已完成！**\n\n`;
    
    message += `基于您${userType}的身份和需求，我为您设计了：\n\n`;
    message += `📐 **布局风格**: ${this.getLayoutDescription(strategy.layout)}\n`;
    message += `🎨 **视觉主题**: ${this.getThemeDescription(strategy.theme)}\n`;
    message += `📄 **核心模块**: ${strategy.sections.filter(s => s.required).map(s => s.title).join('、')}\n`;
    
    if (strategy.features.downloadPdf) {
      message += `📥 **特色功能**: 支持PDF简历下载\n`;
    }
    
    if (strategy.features.socialLinks) {
      message += `🔗 **社交集成**: GitHub/LinkedIn链接展示\n`;
    }
    
    message += `\n🎯 **设计重点**: ${this.getDesignFocus(userType, strategy)}\n`;
    message += `👥 **目标受众**: ${strategy.audience}`;
    
    return message;
  }

  /**
   * 获取布局描述
   */
  private getLayoutDescription(layout: LayoutType): string {
    const descriptions: Record<LayoutType, string> = {
      'portfolio_showcase': '作品集展示型 - 突出视觉作品',
      'project_grid': '项目网格型 - 技术项目清晰展示',
      'classic_timeline': '经典时间线型 - 经历发展一目了然',
      'professional_blocks': '专业模块型 - 信息组织清晰',
      'modern_card': '现代卡片型 - 简洁优雅',
      'consultation_layout': '咨询服务型 - 专业可信'
    };
    
    return descriptions[layout];
  }

  /**
   * 获取主题描述
   */
  private getThemeDescription(theme: ThemeType): string {
    const descriptions: Record<ThemeType, string> = {
      'tech_blue': '科技蓝调 - 专业创新',
      'creative_purple': '创意紫调 - 艺术想象',
      'business_gray': '商务灰调 - 稳重可靠',
      'nature_green': '自然绿调 - 和谐成长',
      'vibrant_orange': '活力橙调 - 热情洋溢',
      'modern': '现代简约',
      'classic': '经典传统',
      'creative': '创意前卫',
      'minimal': '极简主义',
      'corporate': '企业正式'
    };
    
    return descriptions[theme] || '现代专业';
  }

  /**
   * 获取设计重点
   */
  private getDesignFocus(userType: string, strategy: DesignStrategy): string {
    const focusMap: Record<string, string> = {
      '设计师': '视觉冲击力和作品展示',
      '开发者': '技术能力和项目成果',
      'AI从业者': '技术深度和创新能力',
      '产品经理': '数据驱动和商业价值',
      '创意人': '创意表达和个人品牌',
      '学生求职者': '潜力展示和学习能力'
    };
    
    return focusMap[userType] || '专业能力和个人特色';
  }

  /**
   * 更新会话数据
   */
  private updateSessionWithDesign(
    sessionData: SessionData,
    strategy: DesignStrategy,
    developmentPrompt: string
  ): void {
    sessionData.metadata.progress = {
      currentStage: 'code_generation',
      percentage: 75,
      completedStages: ['welcome', 'info_collection', 'page_design'],
      totalStages: 4
    };

    // 在AgentFlowEntry中存储设计方案，供后续Agent使用
    const designEntry: any = {
      id: `design_${Date.now()}`,
      agent: this.name,
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      output: {
        designStrategy: strategy,
        developmentPrompt: developmentPrompt
      }
    };
    
    sessionData.agentFlow.push(designEntry);
  }

  /**
   * 根据模块类型生成内容
   */
  private generateSectionContent(sectionType: string, collectedData: any, userType: string): any {
    switch (sectionType) {
      case 'hero_banner':
        return this.generateHeroContent(collectedData);
      case 'tech_stack_visual':
      case 'skill_cloud':
      case 'progress_bars':
        return this.generateSkillsContent(collectedData.professional?.skills || [], userType);
      case 'project_cards':
        return this.generateProjectsContent(collectedData.projects || [], userType);
      case 'timeline':
        return this.generateExperienceContent(collectedData.experience || []);
      case 'contact_info':
        return this.generateContactContent(collectedData.personal || {});
      default:
        return {};
    }
  }

  // 生成内容的辅助方法
  private generateHeroContent(collectedData: any): any {
    return {
      name: collectedData.personal?.fullName || 'Your Name',
      title: collectedData.professional?.currentTitle || 'Professional Title',
      bio: collectedData.professional?.summary || '专业的个人简介',
      location: collectedData.personal?.location,
      email: collectedData.personal?.email
    };
  }

  private generateSkillsContent(skills: string[], userType: string): any {
    return {
      primary: skills.slice(0, 6),
      secondary: skills.slice(6),
      displayType: this.getSkillsDisplayType(userType)
    };
  }

  private getSkillsDisplayType(userType: string): string {
    if (userType === '开发者' || userType === 'AI从业者') return 'tech_stack_visual';
    if (userType === '设计师') return 'skill_cloud';
    return 'progress_bars';
  }

  private generateProjectsContent(projects: any[], userType: string): any {
    return {
      items: projects || [],
      displayType: userType === '设计师' ? 'gallery' : 'cards',
      showTechStack: ['开发者', 'AI从业者'].includes(userType)
    };
  }

  private generateExperienceContent(experience: any[]): any {
    return {
      items: experience || [],
      displayType: 'timeline'
    };
  }

  private generateContactContent(personal: any): any {
    return {
      email: personal?.email,
      linkedin: personal?.linkedin,
      github: personal?.github,
      website: personal?.website,
      showForm: true
    };
  }

  private getColorScheme(userType: string): string {
    const schemes: Record<string, string> = {
      '设计师': 'purple-gradient',
      '开发者': 'blue-tech',
      'AI从业者': 'cyan-neural',
      '产品经理': 'gray-professional',
      '创意人': 'orange-vibrant'
    };
    
    return schemes[userType] || 'blue-modern';
  }

  private getTypography(userType: string): string {
    const typography: Record<string, string> = {
      '设计师': 'creative-sans',
      '开发者': 'code-friendly',
      'AI从业者': 'tech-modern',
      '产品经理': 'business-serif'
    };
    
    return typography[userType] || 'modern-sans';
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
type LayoutType = 'portfolio_showcase' | 'project_grid' | 'classic_timeline' | 'professional_blocks' | 'modern_card' | 'consultation_layout';
type ThemeType = 'tech_blue' | 'creative_purple' | 'business_gray' | 'nature_green' | 'vibrant_orange' | 'modern' | 'classic' | 'creative' | 'minimal' | 'corporate';

interface DesignStrategy {
  layout: LayoutType;
  theme: ThemeType; 
  sections: PageSection[];
  features: FeatureConfig;
  customizations: CustomizationConfig;
  priority: 'speed' | 'quality' | 'features';
  audience: string;
}

interface PageSection {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  content: any;
  required: boolean;
}

interface FeatureConfig {
  darkMode: boolean;
  responsive: boolean;
  animations: boolean;
  downloadPdf: boolean;
  socialLinks: boolean;
  contactForm: boolean;
  analytics: boolean;
  seo: boolean;
  lazyLoading?: boolean;
  progressiveEnhancement?: boolean;
}

interface CustomizationConfig {
  colorScheme: string;
  typography: string;
  spacing: string;
  borderRadius: string;
  shadows: string;
  portfolioFeatures?: any;
  techFeatures?: any;
  businessFeatures?: any;
}

interface TechStack {
  framework: string;
  styling: string;
  components: string;
  animations: string;
  icons: string;
  deployment: string;
  extras: string[];
}
