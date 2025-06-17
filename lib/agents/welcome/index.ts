/**
 * Welcome Agent 模块导出
 */

export { ConversationalWelcomeAgent } from './agent';
export type { 
  CollectedInfo, 
  WelcomeAIResponse 
} from './utils';
export {
  getSystemPrompt,
  getFirstRoundPrompt,
  getContinuationPrompt,
  parseAIResponse,
  calculateCollectionProgress,
  buildConversationHistoryText,
  generateCollectionSummary,
  isInfoCollectionComplete
} from './utils'; 