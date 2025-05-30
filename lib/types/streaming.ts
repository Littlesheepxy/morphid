// 流式Agent响应的核心类型定义
export interface StreamableAgentResponse {
  // 立即显示的内容
  immediate_display?: {
    reply: string;
    thinking?: string;
    agent_name?: string;
    timestamp?: string;
  };
  
  // 交互式元素
  interaction?: {
    type: 'choice' | 'input' | 'form' | 'confirmation';
    title?: string;
    description?: string;
    elements: InteractionElement[];
    required?: boolean;
  };
  
  // 系统状态
  system_state?: {
    progress?: number;
    current_stage?: string;
    intent: string;
    done: boolean;
    next_agent?: string;
    metadata?: Record<string, any>;
  };
  
  // 会话上下文
  session_context?: {
    user_id?: string;
    session_id: string;
    collected_data?: Record<string, any>;
    user_intent?: UserIntent;
    personalization?: PersonalizationProfile;
  };
}

// 交互元素类型
export interface InteractionElement {
  id: string;
  type: 'button' | 'input' | 'select' | 'textarea' | 'checkbox';
  label: string;
  value?: any;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  placeholder?: string;
  required?: boolean;
  validation?: {
    pattern?: string;
    message?: string;
    min?: number;
    max?: number;
  };
}

// 用户意图类型
export interface UserIntent {
  type: 'formal_resume' | 'exploration' | 'portfolio_website' | 'career_guidance';
  urgency: 'immediate' | 'this_week' | 'this_month' | 'exploring';
  target_audience: 'recruiters' | 'clients' | 'showcase' | 'internal_review';
  primary_goal: string;
  secondary_goals?: string[];
}

// 个性化配置文件
export interface PersonalizationProfile {
  identity: {
    profession: 'designer' | 'developer' | 'product_manager' | 'marketer' | 'other';
    experience_level: 'entry' | 'mid' | 'senior' | 'executive';
    industry?: string;
    specializations?: string[];
  };
  
  preferences: {
    style: 'modern' | 'classic' | 'creative' | 'minimal' | 'corporate';
    tone: 'professional' | 'friendly' | 'authoritative' | 'approachable';
    detail_level: 'concise' | 'detailed' | 'comprehensive';
    format_preference?: 'pdf' | 'web' | 'both';
  };
  
  context: {
    current_situation?: string;
    career_goals?: string;
    target_companies?: string[];
    geographic_preference?: string;
  };
}

// 流式处理状态
export interface StreamingState {
  isStreaming: boolean;
  currentChunk: string;
  accumulatedContent: string;
  error?: string;
  retryCount: number;
}

// Agent会话状态
export interface AgentSessionState {
  currentAgent: string;
  agentHistory: Array<{
    agent: string;
    timestamp: Date;
    response: StreamableAgentResponse;
    userInteraction?: any;
  }>;
  collectedData: Record<string, any>;
  sessionMetadata: {
    started_at: Date;
    last_activity: Date;
    total_interactions: number;
    completion_percentage: number;
  };
}

// JSON流处理块类型
export interface StreamChunk {
  type: 'start' | 'data' | 'complete' | 'error';
  path?: string[];
  value?: any;
  partial?: boolean;
}

// Agent能力定义
export interface AgentCapabilities {
  canStream: boolean;
  requiresInteraction: boolean;
  outputFormats: Array<'text' | 'json' | 'html' | 'markdown'>;
  maxRetries: number;
  timeout: number;
}

// 智能路由决策
export interface RoutingDecision {
  nextAgent: string;
  confidence: number;
  reasoning: string;
  requiredData?: string[];
  estimatedDuration?: number;
}
