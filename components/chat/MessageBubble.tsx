'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  message: any;
  isLast: boolean;
  isGenerating?: boolean;
  onSendMessage?: (message: string, option?: any) => void;
}

export function MessageBubble({ message, isLast, isGenerating, onSendMessage }: MessageBubbleProps) {
  const isUser = message.type === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-4 max-w-4xl mx-auto px-6 py-4 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* 头像 */}
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-blue-500 text-white" : "bg-gray-100"}>
          {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* 消息内容 */}
      <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-full ${
            isUser
              ? "text-gray-800"
              : "text-gray-800"
          }`}
        >
          {/* 消息文本 */}
          <div className="whitespace-pre-wrap break-words">
            {isLast && !isUser && isGenerating ? (
              <div className="flex items-center gap-2">
                <span>{message.content}</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            ) : (
              message.content
            )}
          </div>

          {/* 选项按钮 */}
          {!isUser && message.metadata?.options && onSendMessage && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.metadata.options.map((option: any, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSendMessage(option.label, option);
                  }}
                  className="text-sm rounded-full border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          {/* 智能确认表单 */}
          {!isUser && message.metadata?.interaction && onSendMessage && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">
                {message.metadata.interaction.title}
              </h4>
              <div className="space-y-4">
                {message.metadata.interaction.elements?.map((element: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {element.label}
                      {element.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {element.type === 'select' && (
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        defaultValue={element.value || ''}
                      >
                        <option value="">请选择...</option>
                        {element.options?.map((option: any, optIndex: number) => (
                          <option key={optIndex} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {element.type === 'input' && (
                      <input
                        type="text"
                        placeholder={element.placeholder || '请输入...'}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    
                    {element.type === 'checkbox' && (
                      <div className="space-y-2">
                        {element.options?.map((option: any, optIndex: number) => (
                          <label key={optIndex} className="flex items-center space-x-2">
                            <input type="checkbox" value={option.value} className="rounded" />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => {
                      // 收集表单数据并发送
                      const formData: any = {};
                      const form = document.querySelector(`form[data-message-id="${message.id}"]`) as HTMLFormElement;
                      if (form) {
                        const formElements = form.elements;
                        for (let i = 0; i < formElements.length; i++) {
                          const element = formElements[i] as HTMLInputElement | HTMLSelectElement;
                          if (element.name && element.value) {
                            formData[element.name] = element.value;
                          }
                        }
                      }
                      onSendMessage('确认信息', { type: 'interaction', ...formData });
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    确认提交
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSendMessage('我需要重新考虑一下');
                    }}
                  >
                    重新考虑
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 