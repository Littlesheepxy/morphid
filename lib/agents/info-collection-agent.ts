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
 * Info Collection Agent - 材料和链接收集
 */
export class InfoCollectionAgent extends BaseAgent {
  constructor() {
    const capabilities: AgentCapabilities = {
      canStream: true,
      requiresInteraction: true,
      outputFormats: ['json', 'html'],
      maxRetries: 3,
      timeout: 15000
    };
    
    super('InfoCollectionAgent', capabilities);
  }

  /**
   * 主处理流程 - 收集用户已有材料和链接
   */
  async* process(
    input: any,
    sessionData: SessionData,
    context?: Record<string, any>
  ): AsyncGenerator<StreamableAgentResponse, void, unknown> {
    try {
      // 步骤1: 分析用户画像和收集策略
      yield this.createThinkingResponse('正在准备材料收集清单...', 25);
      await this.delay(1000);

      const userGoal = this.extractUserGoal(sessionData);
      const userType = this.extractUserType(sessionData);
      const urgency = this.extractUrgency(sessionData);
      
      // 判断收集模式
      const collectionMode = this.determineCollectionMode(userGoal, urgency);

      // 检查当前收集状态
      const currentState = this.assessMaterialCollectionState(sessionData);
      
      if (this.shouldAdvanceToDesign(currentState, collectionMode)) {
        // 材料足够或用户选择跳过，推进到下一阶段
        yield this.createAdvanceResponse(currentState, sessionData);
        return;
      }

      // 生成材料收集请求
      const materialRequest = this.generateMaterialRequest(userType, userGoal, currentState, collectionMode);
      yield materialRequest;

    } catch (error) {
      yield await this.handleError(error as Error, sessionData, context);
    }
  }

  /**
   * 确定收集模式
   */
  private determineCollectionMode(userGoal: string, urgency: string): 'quick' | 'standard' | 'comprehensive' {
    if (userGoal === '试试看' || urgency === '随时都行') return 'quick';
    if (userGoal === '求职' || userGoal === '作品展示') return 'comprehensive';
    return 'standard';
  }

  /**
   * 评估材料收集状态
   */
  private assessMaterialCollectionState(sessionData: SessionData): MaterialCollectionState {
    const materials = sessionData.collectedData || {
      documents: [],
      links: [],
      userOptedOut: false
    };

    // 计算收集完整度
    let completeness = 0;
    const userType = this.extractUserType(sessionData);
    const requiredMaterials = this.getRequiredMaterials(userType);
    
    // 检查必需材料
    let hasRequiredMaterials = 0;
    requiredMaterials.required.forEach(material => {
      if (this.hasMaterial(materials, material)) {
        hasRequiredMaterials++;
      }
    });
    
    completeness = (hasRequiredMaterials / requiredMaterials.required.length) * 100;

    return {
      completeness,
      hasDocuments: (materials as any).documents?.length > 0 || false,
      hasLinks: (materials as any).links?.length > 0 || false,
      userOptedOut: (materials as any).userOptedOut || false,
      missingCritical: this.getMissingCriticalMaterials(materials, userType),
      canProceed: completeness >= this.getRequiredCompleteness(userType) || (materials as any).userOptedOut
    };
  }

  /**
   * 判断是否应该推进到设计阶段
   */
  private shouldAdvanceToDesign(state: MaterialCollectionState, mode: string): boolean {
    const thresholds = {
      'quick': 30,
      'standard': 70,
      'comprehensive': 90
    };
    
    return state.completeness >= thresholds[mode as keyof typeof thresholds] || state.userOptedOut;
  }

  /**
   * 生成材料收集请求
   */
  private generateMaterialRequest(
    userType: string,
    userGoal: string,
    currentState: MaterialCollectionState,
    mode: string
  ): StreamableAgentResponse {
    const materialGuide = this.getMaterialGuide(userType);
    
    return this.createResponse({
      immediate_display: {
        reply: this.generateMaterialRequestMessage(userType, userGoal, mode),
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      interaction: {
        type: 'form',
        title: '材料收集',
        description: '请提供您已有的材料和链接，或选择跳过使用默认数据',
        elements: this.buildMaterialCollectionElements(materialGuide, currentState)
      },
      system_state: {
        intent: 'collecting_materials',
        done: false,
        progress: 40,
        current_stage: '材料收集',
        metadata: {
          collectionMode: mode,
          userType,
          userGoal
        }
      }
    });
  }

  /**
   * 生成材料请求消息
   */
  private generateMaterialRequestMessage(userType: string, userGoal: string, mode: string): string {
    const messages = {
      '开发者': `作为软件工程师，如果您有以下材料会让页面更加出色：
🔗 **GitHub链接**（最重要）- 展示您的代码能力
📄 **现有简历** - 我可以提取关键信息  
🌐 **技术博客** - 体现您的技术深度
⭐ **开源项目链接** - 突出您的贡献

如果暂时没有也没关系，我们可以先创建一个基础版本！`,

      '设计师': `作为设计师，这些材料能让您的页面更加吸引人：
🎨 **作品集**（Behance/Dribbble链接或文件）- 最重要
📄 **现有简历** - 了解您的经历
🌐 **个人网站** - 如果已有设计页面  
📱 **项目截图** - 重要作品的视觉展示

没有完整作品集也可以，我们一起创建一个！`,

      'default': `现在让我了解一下您现有的材料，这样能为您创建更精准的页面：
📄 **现有简历** - 基础信息来源
🔗 **LinkedIn档案** - 职业展示
🌐 **个人网站/博客** - 现有在线展示
📱 **相关链接** - 任何能展示您能力的链接

没有这些材料也完全没问题，我们可以帮您创建！`
    };

    let baseMessage = messages[userType as keyof typeof messages] || messages.default;
    
    if (mode === 'quick') {
      baseMessage += '\n\n⚡ **快速体验模式**：您可以跳过材料收集，直接体验效果！';
    }
    
    return baseMessage;
  }

  /**
   * 构建材料收集表单元素
   */
  private buildMaterialCollectionElements(materialGuide: any, currentState: MaterialCollectionState): any[] {
    const elements = [];

    // 跳过选项
    elements.push({
      id: 'skip_collection',
      type: 'select',
      label: '🚀 收集模式选择',
      options: [
        { value: 'collect', label: '📝 提供我的材料和链接' },
        { value: 'skip', label: '⚡ 跳过收集，使用默认数据快速体验' }
      ],
      required: true
    });

    // 文档上传区域
    elements.push({
      id: 'documents',
      type: 'file_upload',
      label: '📄 文档材料（可选）',
      description: '简历、作品集、证书等文件',
      accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
      multiple: true,
      required: false
    });

    // 重要链接收集
    materialGuide.required.forEach((material: any, index: number) => {
      elements.push({
        id: `link_${material.key}`,
        type: 'input',
        label: `🔗 ${material.label}`,
        placeholder: material.placeholder,
        description: material.description,
        required: false,
        priority: 'high'
      });
    });

    // 可选链接收集
    materialGuide.optional.forEach((material: any, index: number) => {
      elements.push({
        id: `link_${material.key}`,
        type: 'input',
        label: `🌐 ${material.label}`,
        placeholder: material.placeholder,
        description: material.description,
        required: false,
        priority: 'low'
      });
    });

    return elements;
  }

  /**
   * 获取材料指南
   */
  private getMaterialGuide(userType: string): any {
    const guides = {
      '开发者': {
        required: [
          {
            key: 'github',
            label: 'GitHub 链接',
            placeholder: 'https://github.com/username',
            description: '展示您的代码能力和项目经验'
          }
        ],
        optional: [
          {
            key: 'linkedin',
            label: 'LinkedIn 档案',
            placeholder: 'https://linkedin.com/in/username',
            description: '职业背景展示'
          },
          {
            key: 'blog',
            label: '技术博客',
            placeholder: 'https://your-blog.com',
            description: '技术文章和思考分享'
          },
          {
            key: 'portfolio',
            label: '个人网站',
            placeholder: 'https://your-website.com',
            description: '现有的个人展示页面'
          }
        ]
      },
      '设计师': {
        required: [
          {
            key: 'portfolio',
            label: '作品集链接',
            placeholder: 'https://behance.net/username 或 https://dribbble.com/username',
            description: '展示您的设计作品和创意能力'
          }
        ],
        optional: [
          {
            key: 'website',
            label: '个人网站',
            placeholder: 'https://your-portfolio.com',
            description: '现有的设计展示网站'
          },
          {
            key: 'linkedin',
            label: 'LinkedIn 档案',
            placeholder: 'https://linkedin.com/in/username',
            description: '职业背景展示'
          },
          {
            key: 'instagram',
            label: '设计相关社交账号',
            placeholder: 'https://instagram.com/username',
            description: '设计灵感和日常分享'
          }
        ]
      },
      'default': {
        required: [
          {
            key: 'linkedin',
            label: 'LinkedIn 档案',
            placeholder: 'https://linkedin.com/in/username',
            description: '最重要的职业展示平台'
          }
        ],
        optional: [
          {
            key: 'website',
            label: '个人网站',
            placeholder: 'https://your-website.com',
            description: '现有的个人展示页面'
          },
          {
            key: 'other',
            label: '其他相关链接',
            placeholder: '任何能展示您能力的链接',
            description: '作品、项目、文章等'
          }
        ]
      }
    };

    return guides[userType as keyof typeof guides] || guides.default;
  }

  /**
   * 创建推进响应
   */
  private createAdvanceResponse(state: MaterialCollectionState, sessionData: SessionData): StreamableAgentResponse {
    const summary = this.generateMaterialSummary(sessionData.collectedData);
    
    return this.createResponse({
      immediate_display: {
        reply: state.userOptedOut 
          ? '完全理解！我们将使用智能默认数据为您创建精美的页面。现在开始设计您的专属页面结构...'
          : `太好了！我已经收集到足够的材料。${summary} 现在开始设计您的专属页面结构...`,
        agent_name: this.name,
        timestamp: new Date().toISOString()
      },
      system_state: {
        intent: 'advance',
        done: true,
        progress: 60,
        current_stage: '材料收集完成',
        metadata: {
          materialsSummary: summary,
          usingDefaults: state.userOptedOut,
          collectionState: state
        }
      }
    });
  }

  /**
   * 生成材料总结
   */
  private generateMaterialSummary(materials: any): string {
    if (!materials) return '将使用默认数据创建页面';
    
    const parts = [];
    if (materials.documents && materials.documents.length > 0) {
      parts.push(`${materials.documents.length}个文档`);
    }
    if (materials.links && materials.links.length > 0) {
      parts.push(`${materials.links.length}个链接`);
    }
    
    return parts.length > 0 ? `收集到：${parts.join('、')}` : '将使用默认数据创建页面';
  }

  // ... 其他辅助方法保持不变，但简化逻辑
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

  private extractUrgency(sessionData: SessionData): string {
    return sessionData.userIntent?.urgency || 'exploring';
  }

  private getRequiredMaterials(userType: string): { required: string[], optional: string[] } {
    const materialMap = {
      '开发者': { required: ['github'], optional: ['linkedin', 'blog', 'portfolio'] },
      '设计师': { required: ['portfolio'], optional: ['website', 'linkedin', 'social'] },
      'default': { required: ['linkedin'], optional: ['website', 'other'] }
    };
    
    return materialMap[userType as keyof typeof materialMap] || materialMap.default;
  }

  private hasMaterial(materials: any, materialKey: string): boolean {
    return materials.links?.some((link: any) => link.type === materialKey) || false;
  }

  private getMissingCriticalMaterials(materials: any, userType: string): string[] {
    const required = this.getRequiredMaterials(userType).required;
    return required.filter(material => !this.hasMaterial(materials, material));
  }

  private getRequiredCompleteness(userType: string): number {
    const thresholds = {
      '开发者': 70,  // 至少要有 GitHub
      '设计师': 70,  // 至少要有作品集
      'default': 50   // 一般情况更宽松
    };
    
    return thresholds[userType as keyof typeof thresholds] || thresholds.default;
  }

  /**
   * 处理用户交互
   */
  async handleInteraction(
    interactionType: string,
    data: any,
    sessionData: SessionData
  ): Promise<any> {
    if (interactionType === 'interaction') {
      // 检查用户是否选择跳过
      if (data.skip_collection === 'skip') {
        // 用户选择跳过材料收集
        sessionData.collectedData = {
          ...sessionData.collectedData,
          documents: [],
          links: [],
          userOptedOut: true
        } as any;
        
        return { 
          action: 'advance',
          summary: '用户选择跳过材料收集，使用默认数据'
        };
      } else {
        // 处理材料提交
        const collectedMaterials = this.processMaterialSubmission(data);
        sessionData.collectedData = {
          ...sessionData.collectedData,
          ...collectedMaterials
        } as any;
        
        const state = this.assessMaterialCollectionState(sessionData);
        
        if (state.canProceed) {
          return { 
            action: 'advance',
            summary: this.generateMaterialSummary(collectedMaterials)
          };
        } else {
          return { 
            action: 'continue',
            currentState: state
          };
        }
      }
    }

    return data;
  }

  /**
   * 处理材料提交
   */
  private processMaterialSubmission(data: any): any {
    const materials = {
      documents: data.documents || [],
      links: [] as Array<{type: string; url: string; timestamp: string}>,
      userOptedOut: false
    };

    // 处理链接数据
    Object.keys(data).forEach(key => {
      if (key.startsWith('link_') && data[key]) {
        const linkType = key.replace('link_', '');
        materials.links.push({
          type: linkType,
          url: data[key],
          timestamp: new Date().toISOString()
        });
      }
    });

    return materials;
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 类型定义
interface MaterialCollectionState {
  completeness: number;
  hasDocuments: boolean;
  hasLinks: boolean;
  userOptedOut: boolean;
  missingCritical: string[];
  canProceed: boolean;
}
