/**
 * Welcome Agent 工具函数、常量和类型定义
 */

// =================== 类型定义 ===================

export interface IntentResponse {
  identified: {
    user_role: string | null;
    use_case: string | null;
    style: string | null;
    highlight_focus: string[];
  };
  follow_up: {
    missing_fields: string[];
    suggestions: Record<string, {
      prompt_text: string;
      options: string[];
    }>;
  };
  completion_status: 'collecting' | 'optimizing' | 'ready';
  direction_suggestions: string[];
  smart_defaults: any;
}

export interface EnhancedWelcomeResponse {
  reply: string;
  analysis: {
    confirmed_info: {
      user_goal: string | null;
      user_type: string | null;
      style_preference: string | null;
      urgency: string | null;
    };
    uncertain_info: {
      user_goal_suggestions: string[];
      user_type_suggestions: string[];
      style_suggestions: string[];
      context_questions: string[];
    };
  };
  confidence: 'high' | 'medium' | 'low';
  next_action: 'confirm_and_collect' | 'direct_proceed';
  reasoning: string;
  intent: string;
  done: boolean;
}

export interface WelcomeResponse {
  reply: string;
  user_goal: string;
  user_type: string;
  confidence: 'high' | 'medium' | 'low';
  intent: string;
  done: boolean;
}

// =================== 常量配置 ===================

export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  user_role: '身份背景',
  use_case: '使用目的',
  style: '风格偏好'
};

export const CUSTOM_DESCRIPTION_PROMPTS: Record<string, string> = {
  user_role: `好的！请用您自己的话详细描述一下您的身份和背景，比如：
• 您的职业或专业领域
• 您的工作经验或学习背景
• 您的专业技能或特长
• 您在行业中的角色定位

请尽量详细，这将帮助我为您创建更合适的页面！`,

  use_case: `好的！请详细说明您创建这个页面的目的，比如：
• 您希望达到什么目标
• 您的目标受众是谁
• 您希望展示什么内容
• 您期望产生什么效果

请具体描述您的需求和期望！`,

  style: `好的！请描述您理想中的页面风格，比如：
• 您喜欢什么样的设计风格
• 您希望传达什么样的感觉
• 您有什么色彩或布局偏好
• 您可以参考的网站或设计

请详细描述您的设计想法！`,

  highlight_focus: `好的！请详细说明您希望突出展示的重点内容，比如：
• 您最引以为豪的成就或项目
• 您希望别人记住的核心优势
• 您想要重点展示的技能或经验
• 您认为最能代表您的亮点

请具体描述您想要突出的方面！`
};

export const ICON_MAPS = {
  goal: {
    '求职': '🎯',
    '作品展示': '🎨',
    '找合作': '🤝',
    '纯炫技': '💪',
    '试试看': '👀',
    '个人品牌': '✨',
    '商务展示': '💼'
  } as Record<string, string>,
  type: {
    'AI从业者': '🤖',
    '设计师': '🎨',
    '开发者': '💻',
    '产品经理': '📊',
    '创意人': '✨',
    '学生求职者': '🎓',
    '软件工程师': '⚙️',
    '前端开发': '🖥️',
    '后端开发': '🔧',
    '全栈开发': '🔄'
  } as Record<string, string>,
  style: {
    '极简禅意': '🎋',
    '科技未来': '🚀',
    '商务专业': '💼',
    '创意炫酷': '🎆',
    '温暖人文': '🌸',
    '简约现代': '⚪',
    '技术极客': '⚡'
  } as Record<string, string>
};

// =================== 工具函数 ===================

/**
 * 提取已收集的信息
 */
export function extractCollectedInfo(sessionData: any): any {
  const intentData = sessionData.metadata?.intentData;
  return {
    user_role: intentData?.user_role || null,
    use_case: intentData?.use_case || null,
    style: intentData?.style || null,
    highlight_focus: intentData?.highlight_focus || []
  };
}

/**
 * 获取对话轮次
 */
export function getConversationRound(sessionData: any): number {
  return sessionData.metadata?.conversationRound || 1;
}

/**
 * 获取字段显示名称
 */
export function getFieldDisplayName(field: string): string {
  return FIELD_DISPLAY_NAMES[field] || '信息';
}

/**
 * 获取缺失字段
 */
export function getMissingFields(info: any): string[] {
  const required = ['user_role', 'use_case'];
  return required.filter(field => !info[field] || info[field] === 'custom');
}

/**
 * 为指定字段生成建议选项
 */
export function generateSuggestions(field: string): Record<string, { prompt_text: string; options: string[] }> {
  const suggestions: Record<string, { prompt_text: string; options: string[] }> = {
    user_role: {
      prompt_text: '您的身份是？',
      options: ['设计师', '开发者', '产品经理', '学生', '创业者', '自由职业者']
    },
    use_case: {
      prompt_text: '您创建页面的主要目的是？',
      options: ['求职简历', '作品展示', '个人品牌', '业务推广', '学术展示', '创意分享']
    },
    style: {
      prompt_text: '您偏好的风格是？',
      options: ['简约现代', '专业商务', '创意艺术', '技术极客', '温暖人文', '未来科技']
    }
  };
  return { [field]: suggestions[field] || { prompt_text: '请选择', options: [] } };
}

/**
 * 检测是否需要自定义描述
 */
export function checkForCustomDescription(data: any): { needsDescription: boolean; field?: string } {
  if (data.user_role === '让我自己描述我的身份') {
    return { needsDescription: true, field: 'user_role' };
  }
  if (data.use_case === '我有其他目的') {
    return { needsDescription: true, field: 'use_case' };
  }
  if (data.style === '我有其他风格想法') {
    return { needsDescription: true, field: 'style' };
  }
  if (data.highlight_focus === '我有其他想突出的亮点') {
    return { needsDescription: true, field: 'highlight_focus' };
  }
  
  // 兼容性检查
  if (data.user_role === 'custom') {
    return { needsDescription: true, field: 'user_role' };
  }
  if (data.use_case === 'custom') {
    return { needsDescription: true, field: 'use_case' };
  }
  if (data.style === 'custom') {
    return { needsDescription: true, field: 'style' };
  }
  
  return { needsDescription: false };
}

/**
 * 获取自定义描述的引导词
 */
export function getCustomDescriptionPrompt(field: string): string {
  return CUSTOM_DESCRIPTION_PROMPTS[field] || '请详细描述您的需求...';
}

/**
 * 获取图标
 */
export function getGoalIcon(goal: string): string {
  return ICON_MAPS.goal[goal] || '📝';
}

export function getTypeIcon(type: string): string {
  return ICON_MAPS.type[type] || '📝';
}

export function getStyleIcon(style: string): string {
  return ICON_MAPS.style[style] || '🎨';
}

/**
 * 验证意图识别响应格式
 */
export function validateIntentResponse(response: any): IntentResponse {
  if (!response.identified || !response.follow_up || !response.completion_status) {
    throw new Error('响应格式不完整：缺少 identified、follow_up 或 completion_status');
  }

  return {
    identified: {
      user_role: response.identified.user_role || null,
      use_case: response.identified.use_case || null,
      style: response.identified.style || null,
      highlight_focus: response.identified.highlight_focus || []
    },
    follow_up: {
      missing_fields: response.follow_up.missing_fields || [],
      suggestions: response.follow_up.suggestions || {}
    },
    completion_status: response.completion_status,
    direction_suggestions: response.direction_suggestions || [],
    smart_defaults: response.smart_defaults || {}
  };
}

/**
 * 更新会话数据
 */
export function updateSessionData(response: IntentResponse, sessionData: any): void {
  // 确保有必要的数据结构
  if (!sessionData.collectedData) {
    sessionData.collectedData = {
      personal: {},
      professional: {} as any,
      experience: [],
      education: [],
      projects: [],
      certifications: []
    } as any;
  }

  // 使用类型断言来扩展元数据
  const metadata = sessionData.metadata as any;
  if (!metadata) {
    (sessionData as any).metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      version: '1.0.0',
      tags: [],
      notes: '',
      customFields: {}
    };
  }
  
  // 存储意图识别结果
  const identified = response.identified;
  (sessionData as any).metadata.intentData = {
    user_role: identified.user_role,
    use_case: identified.use_case,
    style: identified.style,
    highlight_focus: identified.highlight_focus
  };

  (sessionData as any).metadata.conversationRound = ((sessionData as any).metadata.conversationRound || 0) + 1;
  (sessionData as any).metadata.completionStatus = response.completion_status;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 