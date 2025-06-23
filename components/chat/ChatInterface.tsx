'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StreamingMessage } from './StreamingMessage';
import { InteractionPanel } from './InteractionPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bot, 
  User, 
  Cpu, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Send,
  Activity
} from 'lucide-react';
import { 
  StreamableAgentResponse, 
  AgentSessionState 
} from '@/lib/types/streaming';
import { SessionData, ConversationEntry } from '@/lib/types/session';
import { MessageBubble } from './MessageBubble';
import { UnifiedLoading, ThinkingLoader, GeneratingLoader } from '@/components/ui/unified-loading';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingCarousel, LOADING_SEQUENCES } from '@/components/ui/loading-carousel';
import { AuthPromptDialog } from '@/components/dialogs';
import { useAuthCheck, usePendingAuthAction } from '@/hooks/use-auth-check';

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionUpdate?: (session: SessionData) => void;
  className?: string;
}

export function ChatInterface({ sessionId: initialSessionId, onSessionUpdate, className = '' }: ChatInterfaceProps) {
  // 认证状态
  const { isAuthenticated, isLoading: authLoading, userId } = useAuthCheck();
  const { executePendingAction } = usePendingAuthAction();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  
  // 原有状态
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<Partial<StreamableAgentResponse> | null>(null);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<{
    content: string;
    type: string;
    sequence?: string;
    stage?: string;
    sender: string;
    agent: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const processingMessagesRef = useRef<Set<string>>(new Set());

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAgentResponse]);

  // 处理登录成功后的继续对话
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // 检查是否有待执行的操作
      const executed = executePendingAction(() => {
        // 登录成功后继续之前的对话
        if (pendingMessage) {
          setTimeout(() => {
            sendMessage(pendingMessage);
            setPendingMessage('');
          }, 500);
        }
      });
      
      if (executed) {
        console.log('✅ 登录成功，继续执行待执行的对话操作');
      }
    }
  }, [isAuthenticated, authLoading, pendingMessage, executePendingAction]);

  // 初始化会话
  useEffect(() => {
    if (!sessionId) {
      createNewSession();
    } else {
      loadSessionStatus();
    }
  }, []);

  // 处理sessionId变化，重置消息历史
  useEffect(() => {
    if (initialSessionId !== sessionId) {
      setSessionId(initialSessionId || null);
      setMessages([]); // 重置消息历史
      setCurrentAgentResponse(null);
      setError(null);
      setIsStreaming(false);
      
      if (initialSessionId) {
        loadSessionStatus();
      }
    }
  }, [initialSessionId]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      
      // 🔧 修复：避免自动发送消息，等待用户主动开始对话
      // 移除自动发送的Hello消息，防止重复会话创建

    } catch (error) {
      console.error('Session creation error:', error);
      setError('创建会话失败，请刷新页面重试');
    }
  };

  const loadSessionStatus = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/session?sessionId=${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSessionStatus(data.session);
      }
    } catch (error) {
      console.error('Failed to load session status:', error);
    }
  };

  const sendMessage = async (message: string, options?: any) => {
    // 检查认证状态
    if (!authLoading && !isAuthenticated) {
      // 未登录，显示登录提示
      setPendingMessage(message);
      setShowAuthDialog(true);
      return;
    }
    
    if (!sessionId || (!message.trim() && !options) || isStreaming) return;
    
    // 防重复提交：检查是否已有相同消息正在处理
    const messageKey = `${sessionId}-${message}-${JSON.stringify(options)}`;
    
    if (processingMessagesRef.current.has(messageKey)) {
      console.log('⏸️ [防重复] 忽略重复提交的消息:', message);
      return;
    }
    
    processingMessagesRef.current.add(messageKey);
    
    // 清理函数，确保处理完成后移除标记
    const cleanup = () => {
      processingMessagesRef.current.delete(messageKey);
    };

    // 🔧 修复：处理带有特殊选项的消息（如loading状态）
    if (options && (options.type === 'system_loading' || options.type === 'system_loading_carousel' || options.type === 'system_error' || options.type === 'system_success')) {
      // 这些是临时状态消息，不应该添加到永久聊天记录中
      // 而应该通过临时状态显示
      setCurrentLoadingMessage({
        content: message,
        type: options.type,
        sequence: options.sequence,
        stage: options.stage,
        sender: options.sender || 'assistant',
        agent: options.agent || 'system'
      });
      
      // 自动清除loading消息（除非是错误消息）
      if (options.type === 'system_loading' || options.type === 'system_loading_carousel') {
        const duration = options.type === 'system_loading_carousel' ? 4000 : 3000;
        setTimeout(() => {
          setCurrentLoadingMessage(null);
        }, duration);
      }
      return;
    }

    // 添加用户消息到界面
    const userMessage: ConversationEntry = {
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      type: 'user_message',
      content: message,
      metadata: options || {}
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setError(null);

    try {
      // 启动流式响应
      const eventSource = new EventSource('/api/chat/stream', {
        // 注意：EventSource不支持POST，我们需要通过查询参数传递
      });

      // 实际上我们需要使用fetch来发送POST请求
      eventSourceRef.current?.close();
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          currentStage: sessionStatus?.currentStage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // 读取流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
                    if (data === '[DONE]') {
          setIsStreaming(false);
          cleanup(); // 清理防重复标记
          loadSessionStatus(); // 重新加载会话状态
          break;
        }

            try {
              const parsedData = JSON.parse(data);
              handleStreamingResponse(parsedData);
            } catch (error) {
              console.error('Failed to parse streaming data:', error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Send message error:', error);
      setError('发送消息失败，请重试');
      setIsStreaming(false);
      cleanup(); // 清理防重复标记
    }
  };

  const handleStreamingResponse = (response: Partial<StreamableAgentResponse>) => {
    // 🔧 修复：实时更新流式响应，而不是等到完成才显示
    setCurrentAgentResponse(response);

    // 🔧 修复：如果有回复内容，立即创建或更新Agent消息
    if (response.immediate_display?.reply) {
      const messageId = `agent-${Date.now()}`;
      
      setMessages(prev => {
        // 检查是否已有流式消息正在更新
        const lastMessage = prev[prev.length - 1];
        const isStreamingMessage = lastMessage?.metadata?.streaming === true;
        
        if (isStreamingMessage && lastMessage.type === 'agent_response') {
          // 更新现有的流式消息
          return prev.map((msg, index) => 
            index === prev.length - 1 
              ? {
                  ...msg,
                  content: response.immediate_display?.reply || '',
                  metadata: {
                    ...msg.metadata,
                    streaming: !response.system_state?.done,
                    ...response.system_state?.metadata
                  }
                }
              : msg
          );
        } else {
          // 创建新的流式消息
          const agentMessage: ConversationEntry = {
            id: messageId,
            timestamp: new Date(),
            type: 'agent_response',
            agent: response.immediate_display?.agent_name || 'system',
            content: response.immediate_display?.reply || '',
            metadata: {
              streaming: !response.system_state?.done,
              ...response.system_state?.metadata
            }
          };
          
          return [...prev, agentMessage];
        }
      });
    }

    // 如果响应完成，清理流式状态
    if (response.system_state?.done || response.system_state?.intent === 'advance') {
      setCurrentAgentResponse(null);
      
      // 标记最后一条消息为完成状态
      setMessages(prev => 
        prev.map((msg, index) => 
          index === prev.length - 1 && msg.type === 'agent_response'
            ? { ...msg, metadata: { ...msg.metadata, streaming: false } }
            : msg
        )
      );
    }
  };

  const handleUserInteraction = async (type: string, data: any) => {
    if (!sessionId) return;

    try {
      // 发送用户交互到后端
      const response = await fetch('/api/chat/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          interactionType: type,
          data
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send user interaction');
      }

      const result = await response.json();
      
      // 根据结果处理后续操作
      if (result.result?.action === 'advance') {
        // 自动推进到下一阶段
        setTimeout(() => {
          sendMessage('');
        }, 500);
      }

    } catch (error) {
      console.error('User interaction error:', error);
      setError('交互失败，请重试');
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setError(null);
    
    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const renderMessage = (message: ConversationEntry) => {
    const isUser = message.type === 'user_message';
    const isLast = messages[messages.length - 1]?.id === message.id;
    
    // 🔧 修复：保留原始的sender和agent信息
    const messageData = {
      sender: message.metadata?.sender || (isUser ? 'user' : 'assistant'),
      agent: message.metadata?.agent || (isUser ? 'user' : message.agent || 'system'),
      content: message.content,
      metadata: message.metadata
    };
    
    return (
      <MessageBubble
        key={message.id}
        message={messageData}
        isLast={isLast}
        isGenerating={isLast && isStreaming && !isUser}
        isStreaming={isLast && isStreaming && !isUser}
        onSendMessage={sendMessage}
        sessionId={sessionId || undefined}
      />
    );
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <ThinkingLoader 
          text="正在初始化会话"
          size="lg"
        />
      </div>
    );
  }

  return (
    <>
      <Card className={`h-full flex flex-col ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              智能简历助手
            </div>
            
            {sessionStatus && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4" />
                <span className="text-gray-600">{sessionStatus.currentStage}</span>
                <span className="text-blue-600 font-medium">{sessionStatus.overallProgress}%</span>
              </div>
            )}
          </CardTitle>
          
          {/* 进度条 */}
          {sessionStatus && (
            <ProgressBar 
              progress={sessionStatus.overallProgress} 
              stage={sessionStatus.currentStage}
            />
          )}
        </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map(renderMessage)}
          
          {/* 当前Agent响应 */}
          {currentAgentResponse && (
            <StreamingMessage
              response={currentAgentResponse}
              onInteraction={handleUserInteraction}
            />
          )}
          
          {/* 🎯 临时Loading消息 - 轮播和光照扫描UI */}
          {currentLoadingMessage && (
            <>
              {currentLoadingMessage.type === 'system_loading_carousel' ? (
                <LoadingCarousel
                  messages={LOADING_SEQUENCES[currentLoadingMessage.sequence as keyof typeof LOADING_SEQUENCES] || LOADING_SEQUENCES.INTERACTION_PROCESSING}
                  onComplete={() => setCurrentLoadingMessage(null)}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-start gap-4 max-w-4xl mx-auto px-6 py-4"
                >
                  {/* AI头像 */}
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      <Sparkles className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Loading消息内容 - 带光照扫描效果 */}
                  <div className="flex-1">
                    <div className="inline-block max-w-full text-gray-800">
                      <div className="whitespace-pre-wrap break-words">
                        <GeneratingLoader 
                          text={currentLoadingMessage.content.replace('...', '')}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
          
          {/* 错误提示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  '重试'
                )}
              </Button>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="输入您的消息..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isStreaming || !inputMessage.trim()}
            className="px-6"
          >
            {isStreaming ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* 未登录提醒对话框 */}
    <AuthPromptDialog
      isOpen={showAuthDialog}
      onClose={() => setShowAuthDialog(false)}
      title="需要登录才能继续"
      message="请先登录您的账户来继续使用智能对话功能"
      action="发送消息"
      onLoginSuccess={() => {
        // 登录成功回调会在useEffect中处理
        setShowAuthDialog(false);
      }}
    />
  </>
  );
}
