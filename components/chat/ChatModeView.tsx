'use client';

import { useRef, useEffect, useState, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ThinkingLoader } from '@/components/ui/unified-loading';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/theme-context';

interface ChatModeViewProps {
  currentSession: any;
  inputValue: string;
  setInputValue: (value: string) => void;
  isGenerating: boolean;
  onSendMessage: (message: string, option?: any) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  sessionId?: string;
}

// 🔧 优化：使用React.memo减少不必要的重新渲染
export const ChatModeView = memo(function ChatModeView({
  currentSession,
  inputValue,
  setInputValue,
  isGenerating,
  onSendMessage,
  onKeyPress,
  sessionId
}: ChatModeViewProps) {
  const { theme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previousSessionId, setPreviousSessionId] = useState<string | undefined>(sessionId);

  // 🔧 优化：使用useMemo缓存消息列表
  const currentMessages = useMemo(() => {
    return currentSession?.conversationHistory || [];
  }, [currentSession?.conversationHistory]);

  // 🔧 优化：减少会话切换日志
  useEffect(() => {
    if (sessionId !== previousSessionId) {
      console.log('🔄 [ChatModeView] 会话切换:', {
        from: previousSessionId,
        to: sessionId
      });
      setPreviousSessionId(sessionId);
    }
  }, [sessionId, previousSessionId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* 🎨 消息列表 - 简约白色背景 */}
      <div className={`flex-1 overflow-hidden min-h-0 ${
        theme === "light" ? "bg-white" : "bg-gray-900"
      }`}>
        <ScrollArea className="h-full">
          <div className="py-8">
            {currentMessages.length === 0 && !isGenerating ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">开始新的对话</p>
                  <p className="text-sm">向AI助手发送消息来开始创建您的个人页面</p>
                </div>
              </div>
            ) : (
              <>
                {currentMessages.map((message: any, index: number) => (
                  <MessageBubble
                    key={`${sessionId}-${message.id}-${index}`}
                    message={message}
                    isLast={index === currentMessages.length - 1}
                    isGenerating={isGenerating && index === currentMessages.length - 1}
                    onSendMessage={onSendMessage}
                    sessionId={sessionId}
                  />
                ))}
                
                {/* 🔧 修复：用户发送消息后，AI正在生成时显示思考状态 */}
                {isGenerating && currentMessages.length > 0 && !currentMessages.some((msg: any) => msg.metadata?.streaming) && (
                  <div className="flex gap-4 max-w-4xl mx-auto px-6 py-4">
                    {/* AI头像 - 与文本对齐 */}
                    <div className="flex-shrink-0 pt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-100 text-gray-600">
                          <Sparkles className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* 思考状态 */}
                    <div className="flex-1">
                      <div className="inline-block text-gray-800">
                        <ThinkingLoader 
                          text="正在思考中"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* 🎨 底部输入框 - 简约设计，品牌色仅用于边框 */}
      <div className={`border-t shrink-0 transition-all duration-300 ${
        theme === "light" 
          ? "bg-white border-gray-200" 
          : "bg-gray-900 border-gray-700"
      }`}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center">
              {/* 🎨 输入框区域 - 品牌色边框 */}
              <div className="w-full relative">
                <div 
                  className={`flex items-center rounded-3xl transition-all duration-300 border-2 cursor-text ${
                    theme === "light" 
                      ? "bg-white shadow-sm border-emerald-200/80 hover:border-emerald-300/80" 
                      : "bg-gray-800 shadow-sm border-emerald-700/50 hover:border-emerald-600/50"
                  }`}
                  onClick={() => {
                    const input = document.querySelector('#chat-input') as HTMLInputElement;
                    input?.focus();
                  }}
                >
                  {/* 文档上传图标 - 内部左侧 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`ml-3 p-3 h-12 w-12 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      theme === "light"
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                        : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                    }`}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  {/* 输入框 */}
                  <div className="flex-1 relative">
                    <Input
                      id="chat-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={onKeyPress}
                      placeholder="发送消息给 HeysMe AI..."
                      className={`px-4 py-4 w-full border-0 rounded-3xl text-base transition-all duration-300 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-16 ${
                        theme === "light"
                          ? "bg-transparent placeholder-gray-400 text-gray-900"
                          : "bg-transparent placeholder-gray-500 text-white"
                      }`}
                      style={{ height: '72px' }}
                      disabled={isGenerating}
                    />
                    
                    {/* 🎨 发送按钮 - 内部右侧 */}
                    <Button
                      onClick={handleSendClick}
                      disabled={!inputValue.trim() || isGenerating}
                      size="sm"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-12 h-12 p-0 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 z-20"
                      style={{
                        background: !inputValue.trim() || isGenerating 
                          ? '#9CA3AF' 
                          : 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
                      }}
                    >
                      <Send className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>
                
                {/* 🎨 输入提示 - 简约设计 */}
                <div className={`flex items-center justify-between mt-3 px-4 text-xs ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}>
                  <span>按 Enter 发送，Shift + Enter 换行</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    AI 在线
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 🎨 底部装饰线 - 品牌色 */}
        <div className="h-1 bg-brand-gradient opacity-30"></div>
      </div>
    </>
  );
}); 