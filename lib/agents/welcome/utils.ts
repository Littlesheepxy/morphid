/**
 * Welcome Agent 工具函数
 */

import { 
  WELCOME_SYSTEM_PROMPT,
  FIRST_ROUND_PROMPT_TEMPLATE,
  CONTINUATION_PROMPT_TEMPLATE,
  WELCOME_SUMMARY_PROMPT
} from '@/lib/prompts/welcome';

/**
 * 收集到的信息接口
 */
export interface CollectedInfo {
  user_role?: string;
  use_case?: string;
  style?: string;
  highlight_focus?: string[];
}

/**
 * AI响应接口
 */
export interface WelcomeAIResponse {
  reply: string;
  collected_info: CollectedInfo;
  completion_status: 'collecting' | 'ready';
  next_question?: string;
}

/**
 * Welcome Agent汇总结果接口 - 简化版
 */
export interface WelcomeSummaryResult {
  summary: {
    user_role: string;
    use_case: string;
    style: string;
    highlight_focus: string[];
  };
  user_intent: {
    commitment_level: '试一试' | '认真制作';
    reasoning: string;
  };
  context_for_next_agent: string;
  sample_suggestions: {
    should_use_samples: boolean;
    reason: string;
  };
}

/**
 * 格式化第一轮Prompt
 */
export function getFirstRoundPrompt(userInput: string): string {
  return FIRST_ROUND_PROMPT_TEMPLATE.replace('{userInput}', userInput);
}

/**
 * 格式化后续轮次Prompt
 */
export function getContinuationPrompt(
  userInput: string, 
  conversationHistory: string, 
  currentInfo: CollectedInfo
): string {
  return CONTINUATION_PROMPT_TEMPLATE
    .replace('{userInput}', userInput)
    .replace('{conversationHistory}', conversationHistory)
    .replace('{currentInfo}', JSON.stringify(currentInfo, null, 2));
}

/**
 * 尝试解析部分流式响应，检测是否包含完整的JSON
 */
export function tryParseStreamingResponse(partialResponse: string): {
  isComplete: boolean;
  parsedResponse?: WelcomeAIResponse;
  displayText: string;
} {
  // 先尝试提取显示文本
  let displayText = partialResponse;
  
  // 如果看起来像JSON，尝试提取reply字段
  if (partialResponse.includes('"reply"') && partialResponse.includes(':')) {
    try {
      // 尝试提取reply内容
      const replyMatch = partialResponse.match(/"reply"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (replyMatch) {
        displayText = replyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
    } catch (error) {
      // 提取失败，使用原始文本
    }
  }
  
  // 检查是否是完整的JSON
  try {
    const parsed = JSON.parse(partialResponse);
    if (parsed.reply && parsed.completion_status) {
      return {
        isComplete: true,
        parsedResponse: parseAIResponse(partialResponse),
        displayText: parsed.reply
      };
    }
  } catch (error) {
    // 不是完整的JSON，继续流式处理
  }
  
  return {
    isComplete: false,
    displayText: displayText
  };
}

/**
 * 解析AI响应
 */
export function parseAIResponse(response: string): WelcomeAIResponse {
  try {
    // 尝试解析JSON
    const parsed = JSON.parse(response);
    
    // 验证必要字段
    if (!parsed.reply || !parsed.completion_status) {
      throw new Error('AI响应格式不完整');
    }

    return {
      reply: parsed.reply,
      collected_info: parsed.collected_info || {},
      completion_status: parsed.completion_status,
      next_question: parsed.next_question
    };
    
  } catch (error) {
    console.error('❌ [AI响应解析失败]:', error);
    
    // 降级处理：从文本中提取回复
    return {
      reply: response || '抱歉，我需要重新理解您的需求。请再说一遍您想要创建什么样的个人页面？',
      collected_info: {},
      completion_status: 'collecting'
    };
  }
}

/**
 * 计算收集进度
 */
export function calculateCollectionProgress(collectedInfo: CollectedInfo): number {
  const fields = ['user_role', 'use_case', 'style', 'highlight_focus'];
  const completedFields = fields.filter(field => {
    const value = collectedInfo[field as keyof CollectedInfo];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  });
  
  return Math.round((completedFields.length / fields.length) * 100);
}

/**
 * 构建对话历史文本
 */
export function buildConversationHistoryText(conversationHistory: any[]): string {
  return conversationHistory.map((h: any) => 
    `${h.role}: ${h.content}`
  ).join('\n');
}

/**
 * 验证收集信息的完整性
 */
export function isInfoCollectionComplete(collectedInfo: CollectedInfo): boolean {
  const hasRole = !!collectedInfo.user_role;
  const hasUseCase = !!collectedInfo.use_case;
  const hasStyle = !!collectedInfo.style;
  const hasHighlights = collectedInfo.highlight_focus && collectedInfo.highlight_focus.length > 0;
  
  // 至少需要3个核心信息
  const completedCount = [hasRole, hasUseCase, hasStyle, hasHighlights].filter(Boolean).length;
  return completedCount >= 3;
}

/**
 * 生成收集状态摘要
 */
export function generateCollectionSummary(collectedInfo: CollectedInfo): string {
  const summary = [];
  
  if (collectedInfo.user_role) {
    summary.push(`👤 身份：${collectedInfo.user_role}`);
  }
  if (collectedInfo.use_case) {
    summary.push(`🎯 目的：${collectedInfo.use_case}`);
  }
  if (collectedInfo.style) {
    summary.push(`🎨 风格：${collectedInfo.style}`);
  }
  if (collectedInfo.highlight_focus && collectedInfo.highlight_focus.length > 0) {
    summary.push(`📋 重点：${collectedInfo.highlight_focus.join('、')}`);
  }
  
  return summary.length > 0 ? summary.join('\n') : '暂无收集信息';
}

/**
 * 获取系统Prompt
 */
export function getSystemPrompt(): string {
  return WELCOME_SYSTEM_PROMPT;
}

/**
 * 获取汇总Prompt
 */
export function getSummaryPrompt(conversationHistory: any[]): string {
  const historyText = buildConversationHistoryText(conversationHistory);
  return WELCOME_SUMMARY_PROMPT.replace('{conversationHistory}', historyText);
}

/**
 * 解析汇总结果 - 简化版
 */
export function parseSummaryResponse(response: string): WelcomeSummaryResult {
  try {
    const parsed = JSON.parse(response);
    
    // 验证必要字段
    if (!parsed.summary || !parsed.user_intent) {
      throw new Error('汇总响应格式不完整');
    }

    return parsed as WelcomeSummaryResult;
    
  } catch (error) {
    console.error('❌ [汇总响应解析失败]:', error);
    
    // 降级处理 - 返回默认的"试一试"模式
    return {
      summary: {
        user_role: '新用户',
        use_case: '个人展示',
        style: '简约风格',
        highlight_focus: ['个人信息', '技能展示']
      },
      user_intent: {
        commitment_level: '试一试',
        reasoning: '响应解析失败，默认为体验模式'
      },
      context_for_next_agent: '用户信息收集不完整，建议使用示例数据进行快速体验',
      sample_suggestions: {
        should_use_samples: true,
        reason: '为新用户提供友好的体验模式'
      }
    };
  }
} 