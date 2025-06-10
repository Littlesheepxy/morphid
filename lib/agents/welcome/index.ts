/**
 * Welcome Agent - 简化版导出
 * 专注大模型推荐，移除本地算法
 */

// 导出主要功能
export { WelcomeAgent, processWelcomeAgent } from './agent';

// 导出核心类型
export type { 
  WelcomeCollectedInfo, 
  IntentRecognitionResult, 
  RecommendationGuideResult,
  WelcomeAgentResponse 
} from './agent';

// 导出工具函数
export { 
  extractCollectedInfo,
  getFieldDisplayName,
  getMissingFields,
  validateIntentResponse,
  updateSessionData
} from './utils';

// 导出基础类型
export type { IntentResponse } from './utils'; 