'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

interface ChatModeViewProps {
  currentSession: any;
  inputValue: string;
  setInputValue: (value: string) => void;
  isGenerating: boolean;
  onSendMessage: (message: string, option?: any) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export function ChatModeView({
  currentSession,
  inputValue,
  setInputValue,
  isGenerating,
  onSendMessage,
  onKeyPress
}: ChatModeViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.conversationHistory]);

  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="py-8">
            {currentSession?.conversationHistory?.map((message: any, index: number) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === (currentSession?.conversationHistory?.length || 0) - 1}
                isGenerating={isGenerating}
                onSendMessage={onSendMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* 底部输入框 */}
      <div className="border-t border-gray-100 bg-white p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto text-gray-400 hover:text-gray-600"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="发送消息..."
                className="pr-12 py-3 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSendClick}
                disabled={!inputValue.trim() || isGenerating}
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 