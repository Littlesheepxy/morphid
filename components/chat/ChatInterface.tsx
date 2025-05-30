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

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionUpdate?: (session: SessionData) => void;
  className?: string;
}

export function ChatInterface({ sessionId: initialSessionId, onSessionUpdate, className = '' }: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<Partial<StreamableAgentResponse> | null>(null);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentAgentResponse]);

  // 初始化会话
  useEffect(() => {
    if (!sessionId) {
      createNewSession();
    } else {
      loadSessionStatus();
    }
  }, []);

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
      
      // 自动开始第一个欢迎消息
      setTimeout(() => {
        sendMessage('Hello');
      }, 500);

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

  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim() || isStreaming) return;

    // 添加用户消息到界面
    const userMessage: ConversationEntry = {
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      type: 'user_message',
      content: message,
      metadata: {}
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
    }
  };

  const handleStreamingResponse = (response: Partial<StreamableAgentResponse>) => {
    setCurrentAgentResponse(response);

    // 如果响应完成，添加到消息历史
    if (response.system_state?.done || response.system_state?.intent === 'advance') {
      const agentMessage: ConversationEntry = {
        id: `agent-${Date.now()}`,
        timestamp: new Date(),
        type: 'agent_response',
        agent: response.immediate_display?.agent_name,
        content: response.immediate_display?.reply || '',
        metadata: response.system_state?.metadata
      };

      setMessages(prev => [...prev, agentMessage]);
      setCurrentAgentResponse(null);
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
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-start space-x-2 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-500' : 'bg-gray-500'
          }`}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>
          
          {/* Message Content */}
          <Card className={`${isUser ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
            <CardContent className="p-3">
              {!isUser && message.agent && (
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <Cpu className="w-3 h-3 mr-1" />
                  {message.agent}
                </div>
              )}
              
              <div className="text-sm text-gray-800">
                {message.content}
              </div>
              
              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-600">正在初始化会话...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}
