/**
 * Welcome Agent 工具函数和类型定义 - 简化版（仅大模型推荐）
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
      reasoning?: string;
    }>;
  };
  completion_status: 'collecting' | 'ready';
  direction_suggestions: string[];
  smart_defaults: any;
}

// =================== 常量配置 ===================

/**
 * 信息收集优先级定义
 */
export const FIELD_PRIORITIES: Record<string, number> = {
  user_role: 1,      // 最高优先级
  use_case: 2,       // 次高优先级  
  style: 3,          // 第三优先级
  highlight_focus: 4 // 最低优先级
};

export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  user_role: '身份背景',
  use_case: '使用目的',
  style: '风格偏好',
  highlight_focus: '重点内容'
};

/**
 * 自定义描述提示
 */
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

// =================== 辅助函数 ===================

/**
 * 从会话数据中提取已收集的信息
 */
export function extractCollectedInfo(sessionData: any): any {
  const metadata = sessionData.metadata || {};
  const intentData = metadata.intentData || {};
  
  return {
    user_role: intentData.user_role || null,
    use_case: intentData.use_case || null,
    style: intentData.style || null,
    highlight_focus: intentData.highlight_focus || []
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
  return FIELD_DISPLAY_NAMES[field] || field;
}

/**
 * 获取缺失字段列表（按优先级排序）
 */
export function getMissingFields(info: any): string[] {
  const allFields = Object.keys(FIELD_PRIORITIES);
  const missingFields = allFields.filter(field => {
    const value = info[field];
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return !value || value.trim() === '';
  });
  
  // 按优先级排序
  return missingFields.sort((a, b) => 
    FIELD_PRIORITIES[a] - FIELD_PRIORITIES[b]
  );
}

/**
 * 检查是否选择了自定义描述选项
 */
export function checkForCustomDescription(data: any): { needsDescription: boolean; field?: string } {
  for (const [field, value] of Object.entries(data)) {
    if (typeof value === 'string' && (
      value.includes('让我自己描述') || 
      value.includes('我有其他') ||
      value.includes('自定义')
    )) {
      return { needsDescription: true, field };
    }
  }
  return { needsDescription: false };
}

/**
 * 获取自定义描述提示
 */
export function getCustomDescriptionPrompt(field: string): string {
  return CUSTOM_DESCRIPTION_PROMPTS[field] || `请详细描述您的${getFieldDisplayName(field)}：`;
}

/**
 * 验证意图响应格式
 */
export function validateIntentResponse(response: any): IntentResponse {
  // 基础验证
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response format');
  }
  
  // 确保必要字段存在
  const validated: IntentResponse = {
    identified: {
      user_role: response.identified?.user_role || null,
      use_case: response.identified?.use_case || null,
      style: response.identified?.style || null,
      highlight_focus: Array.isArray(response.identified?.highlight_focus) 
        ? response.identified.highlight_focus 
        : []
    },
    follow_up: {
      missing_fields: Array.isArray(response.follow_up?.missing_fields) 
        ? response.follow_up.missing_fields 
        : [],
      suggestions: response.follow_up?.suggestions || {}
    },
    completion_status: response.completion_status === 'ready' ? 'ready' : 'collecting',
    direction_suggestions: Array.isArray(response.direction_suggestions) 
      ? response.direction_suggestions 
      : [],
    smart_defaults: response.smart_defaults || {}
  };
  
  return validated;
}

/**
 * 更新会话数据
 */
export function updateSessionData(response: IntentResponse, sessionData: any): void {
  if (!sessionData.metadata) {
    sessionData.metadata = {};
  }
  
  // 更新意图数据
  sessionData.metadata.intentData = response.identified;
  
  // 更新完成状态
  sessionData.metadata.completionStatus = response.completion_status;
  
  // 增加对话轮次
  sessionData.metadata.conversationRound = (sessionData.metadata.conversationRound || 0) + 1;
  
  // 保存方向建议
  if (response.direction_suggestions.length > 0) {
    sessionData.metadata.directionSuggestions = response.direction_suggestions;
  }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 