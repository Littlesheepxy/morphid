'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Sparkles } from 'lucide-react';
import { LoadingText, StreamingText, LoadingDots } from '@/components/ui/loading-text';
import { UnifiedLoading, ThinkingLoader, GeneratingLoader, SimpleTextLoader } from '@/components/ui/unified-loading';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface MessageBubbleProps {
  message: any;
  isLast: boolean;
  isGenerating?: boolean;
  onSendMessage?: (message: string, option?: any) => void;
  sessionId?: string;
  isStreaming?: boolean;  // 新增：是否正在流式输出
}

// 🔧 优化：移除React.memo，使用useMemo优化渲染
export const MessageBubble = function MessageBubble({ 
  message, 
  isLast, 
  isGenerating, 
  onSendMessage, 
  sessionId,
  isStreaming = false 
}: MessageBubbleProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [contentComplete, setContentComplete] = useState(!message.metadata?.streaming);
  
  // 🔧 修复：更精确的用户消息判断
  const isUser = message.sender === 'user' || message.agent === 'user';
  const isSystemMessage = message.agent === 'system' || message.sender === 'assistant' || message.sender === 'system';
  
  // 🔧 确保系统消息显示在左侧
  const actualIsUser = isUser && !isSystemMessage;

  // 🔧 流式消息检测逻辑
  const isStreamingMessage = useMemo(() => {
    return (
      message.streaming === true ||
      message.metadata?.streaming === true ||
      (isLast && isGenerating && !actualIsUser) ||
      (isLast && isStreaming && !actualIsUser)
    );
  }, [message.streaming, message.metadata?.streaming, isLast, isGenerating, actualIsUser, isStreaming]);

  // 🔧 修复：自动显示表单逻辑
  useEffect(() => {
    if (message.metadata?.interaction && !actualIsUser && !isStreamingMessage) {
      const timer = setTimeout(() => {
        setShowInteraction(true);
        setContentComplete(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [message.metadata?.interaction, actualIsUser, isStreamingMessage]);

  // 🔧 流式消息调试日志
  useEffect(() => {
    if (isStreamingMessage) {
      console.log('🌊 [MessageBubble] 流式状态:', {
        messageId: message.id,
        streaming: message.streaming,
        metadataStreaming: message.metadata?.streaming,
        isLast,
        isGenerating,
        contentLength: message.content?.length || 0
      });
    }
  }, [isStreamingMessage, message.content]);

  const handleInteractionSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // 🎯 UX优化：显示轮播loading状态
      if (onSendMessage) {
        onSendMessage('', { 
          type: 'system_loading_carousel',
          sequence: 'INTERACTION_PROCESSING',
          sender: 'assistant', // 🔧 明确标识为助手消息
          agent: 'system' // 🔧 添加agent字段确保正确识别
        });
      }

      // 🔧 修复：使用传入的sessionId，只发送实际的用户选择数据
      const response = await fetch('/api/chat/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId || 'default',
          interactionType: 'interaction',
          data: formData // 只发送用户的实际选择，不发送loading状态
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 🎯 流式响应处理
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        console.log('📡 [流式响应] 开始处理流式数据');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let buffer = '';
          let hasSentSuggestions = false;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                
                if (data === '[DONE]') {
                  console.log('✅ [流式完成] 所有数据接收完毕');
                  break;
                }
                
                try {
                  const chunk = JSON.parse(data);
                  console.log('📦 [流式块] 类型:', chunk.type);
                  
                  // 🎯 优先处理建议选项
                  if (chunk.type === 'suggestions_ready' && !hasSentSuggestions) {
                    console.log('⚡ [优先显示] 建议选项可用');
                    if (onSendMessage) {
                      // 🔧 检查是否有具体的回复内容，如果没有则不发送文本消息
                      if (chunk.interaction) {
                        onSendMessage('', {
                          type: 'suggestions_preview',
                          interaction: chunk.interaction,
                          sender: 'assistant',
                          agent: 'system'
                        });
                      }
                    }
                    hasSentSuggestions = true;
                  }
                  
                  // 处理其他类型的流式数据
                  else if (chunk.type === 'agent_response' && chunk.data) {
                    console.log('🤖 [Agent响应] 处理完整响应');
                    // 如果有具体的响应内容且还没有发送建议，显示它
                    if (chunk.data.immediate_display && onSendMessage) {
                      // 检查是否有交互内容，如果有则发送包含交互的完整消息
                      if (chunk.data.interaction && !hasSentSuggestions) {
                        onSendMessage(chunk.data.immediate_display.reply, {
                          type: 'agent_response',
                          sender: 'assistant',
                          agent: chunk.data.immediate_display.agent_name || 'system',
                          interaction: chunk.data.interaction
                        });
                        hasSentSuggestions = true;
                      } else if (!chunk.data.interaction) {
                        // 如果没有交互内容，直接显示文本消息
                        onSendMessage(chunk.data.immediate_display.reply, {
                          type: 'agent_response',
                          sender: 'assistant',
                          agent: chunk.data.immediate_display.agent_name || 'system'
                        });
                      }
                    }
                  }
                  
                  else if (chunk.type === 'processing') {
                    console.log('⏳ [处理中] 更新状态提示');
                    // 不发送额外的处理消息，避免重复
                  }
                  
                  else if (chunk.type === 'done') {
                    console.log('🎉 [完成] 流式响应处理完毕');
                    // 🔧 只有在真的没有任何响应时才发送fallback消息
                    if (onSendMessage && !hasSentSuggestions) {
                      console.log('⚠️ [警告] 没有收到任何Agent响应，可能有问题');
                    }
                  }
                  
                } catch (parseError) {
                  console.error('❌ [解析错误] 无法解析流式数据:', parseError);
                }
              }
            }
          }
        }
      } else {
        // 普通JSON响应处理（保持兼容性）
        const result = await response.json();
        
        // 🎯 UX优化：根据结果类型显示不同反馈
        if (result.success) {
          if (result.hasAIResponse) {
            // 有AI响应，显示最终状态
            if (onSendMessage) {
              // 🔧 检查result中是否有具体的响应内容
              const responseContent = result.data?.immediate_display?.reply || result.message;
              if (responseContent) {
                onSendMessage(responseContent, {
                  type: 'agent_response',
                  sender: 'assistant',
                  agent: 'system',
                  interaction: result.data?.interaction
                });
              }
            }
          } else {
            // 简单确认，显示成功状态  
            if (onSendMessage && result.message) {
              onSendMessage(result.message, {
                type: 'system_success',
                sender: 'assistant',
                agent: 'system'
              });
            }
          }
        }
        
        // 🔧 处理交互结果
        console.log('✅ 交互成功:', result);
      }
      
    } catch (error) {
      console.error('❌ 交互失败:', error);
      
      // 🎯 UX优化：显示友好的错误信息
      if (onSendMessage) {
        onSendMessage('抱歉，处理过程中出现了问题，请重试 😅', {
          type: 'system_error',
          sender: 'assistant', // 🔧 明确标识为助手消息
          agent: 'system'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (elementId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [elementId]: value
    }));
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-4 max-w-4xl mx-auto px-6 py-4 ${
        actualIsUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* 头像 - 简约设计 */}
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={actualIsUser ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}>
          {actualIsUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* 消息内容 */}
      <div className={`flex-1 ${actualIsUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-full ${
            actualIsUser
              ? "text-gray-800"
              : "text-gray-800"
          }`}
        >
          {/* 消息文本 */}
          <div className="whitespace-pre-wrap break-words">
            {/* 🎯 智能内容渲染 */}
            {(() => {
              // 优先级1：流式消息
              if (isStreamingMessage) {
                console.log('🌊 [流式渲染] 内容长度:', message.content?.length || 0);
                return (
                  <StreamingText
                    text={message.content || ''}
                    speed={30}
                    onComplete={() => {
                      setContentComplete(true);
                      if (message.metadata?.interaction) {
                        setTimeout(() => setShowInteraction(true), 500);
                      }
                    }}
                  />
                );
              }
              
              // 优先级2：等待响应
              if (isLast && !actualIsUser && isGenerating && !message.content) {
                return <ThinkingLoader text="正在思考中" size="sm" />;
              }
              
              // 优先级3：loading文本
              if (!actualIsUser && message.content && (
                message.content.includes('正在分析') ||
                message.content.includes('正在为您生成') ||
                message.content.includes('请稍候')
              )) {
                return <GeneratingLoader text={message.content.replace(/[。.…]+$/g, '')} size="sm" />;
              }
              
              // 优先级4：交互准备中
              if (message.metadata?.interaction && !contentComplete && !showInteraction && !actualIsUser) {
                return <GeneratingLoader text="正在准备个性化选项" size="sm" />;
              }
              
              // 优先级5：普通内容
              return <MarkdownRenderer content={message.content || ''} />;
            })()}
          </div>

          {/* 选项按钮 - 已禁用，使用新的交互表单系统 */}
          {/* 🔧 修复：不再使用老的快速选项按钮，避免发送不必要的用户消息 */}
          {/* {!actualIsUser && message.metadata?.options && onSendMessage && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.metadata.options.map((option: any, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSendMessage(option.label, option);
                  }}
                  className="text-sm rounded-lg border-gray-200 hover:border-emerald-300 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )} */}

          {/* 🔧 修复：智能确认表单 - 简约设计 */}
          {!actualIsUser && message.metadata?.interaction && (contentComplete || showInteraction) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              {/* 只有当交互标题与消息内容不同时才显示标题 */}
              {message.metadata.interaction.title && 
               message.metadata.interaction.title !== message.content && (
                <h4 className="font-medium text-gray-900 mb-3">
                  {message.metadata.interaction.title}
                </h4>
              )}
              
              {/* 如果表单正在准备中 */}
              {!showInteraction && message.metadata?.interaction && (
                <div className="flex items-center justify-center py-8">
                  <GeneratingLoader 
                    text="正在准备个性化选项"
                    size="md"
                  />
                </div>
              )}
              
              {/* 表单内容 */}
              {showInteraction && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  {message.metadata.interaction.elements?.map((element: any, index: number) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="space-y-2"
                    >
                      {/* 只有当标签与消息内容不同时才显示标签 */}
                      {element.label && 
                       !message.content.includes(element.label) && (
                        <label className="block text-sm font-medium text-gray-700">
                          {element.label}
                          {element.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      )}
                      
                      {element.type === 'select' && (
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 px-2.5 py-1 rounded-full">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI个性化建议</span>
                          </div>
                          
                          {/* 胶囊状毛玻璃按钮 - 更小更简洁 */}
                          <div className="flex flex-wrap gap-2">
                            {element.options?.map((option: any, optIndex: number) => {
                              const isSelected = formData[element.id] === option.value;
                              return (
                                <motion.button
                                  key={optIndex}
                                  type="button"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.05 * optIndex }}
                                  whileHover={{ scale: 1.05, y: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleInputChange(element.id, option.value)}
                                  className={`
                                    px-3 py-1.5 text-xs font-medium rounded-full 
                                    backdrop-blur-md border transition-all duration-300
                                    hover:shadow-lg hover:shadow-emerald-200/50
                                    ${isSelected 
                                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-800 shadow-md backdrop-blur-lg' 
                                      : 'bg-white/60 border-gray-200/60 text-gray-700 hover:bg-emerald-50/80 hover:border-emerald-300/60'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{option.label}</span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-1.5 h-1.5 bg-emerald-600 rounded-full"
                                      />
                                    )}
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                          
                          {/* 自定义输入选项 */}
                          <div className="space-y-2">
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, [`${element.id}_isCustom`]: !prev[`${element.id}_isCustom`] }));
                              }}
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                                rounded-full border-dashed backdrop-blur-md border transition-all duration-300
                                hover:shadow-lg hover:shadow-emerald-200/50
                                ${formData[`${element.id}_isCustom`] 
                                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-800 backdrop-blur-lg' 
                                  : 'border-gray-300/60 bg-white/60 text-gray-600 hover:border-emerald-300/60 hover:bg-emerald-50/80'
                                }
                              `}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>自定义</span>
                            </motion.button>
                            
                            {/* 自定义输入框 */}
                            {formData[`${element.id}_isCustom`] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden space-y-2"
                              >
                                <input
                                  type="text"
                                  value={formData[`${element.id}_customInput`] || ''}
                                  onChange={(e) => handleInputChange(`${element.id}_customInput`, e.target.value)}
                                  placeholder={`请输入您的${element.label.replace('？', '').replace('您', '')}...`}
                                  className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                                  autoFocus
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = formData[`${element.id}_customInput`];
                                      if (value && value.trim()) {
                                        const currentValues = formData[element.id] || [];
                                        if (!currentValues.includes(value.trim())) {
                                          handleInputChange(element.id, [...currentValues, value.trim()]);
                                          handleInputChange(`${element.id}_customInput`, '');
                                        }
                                      }
                                    }
                                  }}
                                />
                                <div className="flex justify-between items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const value = formData[`${element.id}_customInput`];
                                      if (value && value.trim()) {
                                        const currentValues = formData[element.id] || [];
                                        if (!currentValues.includes(value.trim())) {
                                          handleInputChange(element.id, [...currentValues, value.trim()]);
                                          handleInputChange(`${element.id}_customInput`, '');
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                  >
                                    添加
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => {
                                        const newData = { ...prev };
                                        delete newData[`${element.id}_isCustom`];
                                        delete newData[`${element.id}_customInput`];
                                        return newData;
                                      });
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    取消
                                  </button>
                                </div>
                              </motion.div>
                            )}
                            
                            {/* 显示已选择的自定义选项 */}
                            {formData[element.id] && Array.isArray(formData[element.id]) && (
                              <div className="space-y-1">
                                {(formData[element.id] as string[])
                                  .filter(value => !element.options?.some((opt: any) => opt.value === value))
                                  .map((customValue: string, index: number) => (
                                    <motion.div
                                      key={`custom-${index}`}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                                    >
                                      <span className="text-sm text-gray-700">{customValue}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentValues = formData[element.id] || [];
                                          handleInputChange(element.id, currentValues.filter((v: any) => v !== customValue));
                                        }}
                                        className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </motion.div>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {element.type === 'input' && (
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 px-2.5 py-1 rounded-full">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>请填写信息</span>
                          </div>
                          
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <input
                              type="text"
                              value={formData[element.id] || ''}
                              onChange={(e) => handleInputChange(element.id, e.target.value)}
                              placeholder={element.placeholder || `请输入您的${element.label.replace('？', '').replace('您', '')}...`}
                              className="w-full px-3 py-2 text-sm border border-gray-200/60 rounded-full focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/90 backdrop-blur-sm hover:border-gray-300/60"
                            />
                          </motion.div>
                        </div>
                      )}
                      
                      {element.type === 'checkbox' && (
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 px-2.5 py-1 rounded-full">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>可多选・AI建议</span>
                          </div>
                          
                          {/* 胶囊状毛玻璃多选按钮 */}
                          <div className="flex flex-wrap gap-2">
                            {element.options?.map((option: any, optIndex: number) => {
                              const currentValues = formData[element.id] || [];
                              const isSelected = currentValues.includes(option.value);
                              return (
                                <motion.button
                                  key={optIndex}
                                  type="button"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.05 * optIndex }}
                                  whileHover={{ scale: 1.05, y: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      handleInputChange(element.id, currentValues.filter((v: any) => v !== option.value));
                                    } else {
                                      handleInputChange(element.id, [...currentValues, option.value]);
                                    }
                                  }}
                                  className={`
                                    px-3 py-1.5 text-xs font-medium rounded-full 
                                    backdrop-blur-md border transition-all duration-300
                                    hover:shadow-lg hover:shadow-emerald-200/50
                                    ${isSelected 
                                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-800 shadow-md backdrop-blur-lg' 
                                      : 'bg-white/60 border-gray-200/60 text-gray-700 hover:bg-emerald-50/80 hover:border-emerald-300/60'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{option.label}</span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center justify-center w-3 h-3 bg-emerald-600 rounded-full"
                                      >
                                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </motion.div>
                                    )}
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                          
                          {/* 自定义输入选项 */}
                          <div className="space-y-2">
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, [`${element.id}_isCustom`]: !prev[`${element.id}_isCustom`] }));
                              }}
                              className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium 
                                rounded-full border-dashed backdrop-blur-md border transition-all duration-300
                                hover:shadow-lg hover:shadow-emerald-200/50
                                ${formData[`${element.id}_isCustom`] 
                                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-800 backdrop-blur-lg' 
                                  : 'border-gray-300/60 bg-white/60 text-gray-600 hover:border-emerald-300/60 hover:bg-emerald-50/80'
                                }
                              `}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>自定义</span>
                            </motion.button>
                            
                            {/* 自定义输入框 */}
                            {formData[`${element.id}_isCustom`] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden space-y-2"
                              >
                                <input
                                  type="text"
                                  value={formData[`${element.id}_customInput`] || ''}
                                  onChange={(e) => handleInputChange(`${element.id}_customInput`, e.target.value)}
                                  placeholder={`请输入您的${element.label.replace('？', '').replace('您', '')}...`}
                                  className="w-full p-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white"
                                  autoFocus
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = formData[`${element.id}_customInput`];
                                      if (value && value.trim()) {
                                        const currentValues = formData[element.id] || [];
                                        if (!currentValues.includes(value.trim())) {
                                          handleInputChange(element.id, [...currentValues, value.trim()]);
                                          handleInputChange(`${element.id}_customInput`, '');
                                        }
                                      }
                                    }
                                  }}
                                />
                                <div className="flex justify-between items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const value = formData[`${element.id}_customInput`];
                                      if (value && value.trim()) {
                                        const currentValues = formData[element.id] || [];
                                        if (!currentValues.includes(value.trim())) {
                                          handleInputChange(element.id, [...currentValues, value.trim()]);
                                          handleInputChange(`${element.id}_customInput`, '');
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                  >
                                    添加
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => {
                                        const newData = { ...prev };
                                        delete newData[`${element.id}_isCustom`];
                                        delete newData[`${element.id}_customInput`];
                                        return newData;
                                      });
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    取消
                                  </button>
                                </div>
                              </motion.div>
                            )}
                            
                            {/* 显示已选择的自定义选项 */}
                            {formData[element.id] && Array.isArray(formData[element.id]) && (
                              <div className="space-y-1">
                                {(formData[element.id] as string[])
                                  .filter(value => !element.options?.some((opt: any) => opt.value === value))
                                  .map((customValue: string, index: number) => (
                                    <motion.div
                                      key={`custom-${index}`}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                                    >
                                      <span className="text-sm text-gray-700">{customValue}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentValues = formData[element.id] || [];
                                          handleInputChange(element.id, currentValues.filter((v: any) => v !== customValue));
                                        }}
                                        className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </motion.div>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 flex gap-2"
                  >
                    <Button
                      onClick={handleInteractionSubmit}
                      disabled={isSubmitting}
                      size="sm"
                      className="bg-emerald-500/90 hover:bg-emerald-600 text-white backdrop-blur-md rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-emerald-200/50"
                    >
                      {isSubmitting ? (
                        <SimpleTextLoader text="提交中" className="text-white" />
                      ) : (
                        '确认提交'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onSendMessage?.('我需要重新考虑一下');
                      }}
                      disabled={isSubmitting}
                      size="sm"
                      className="text-gray-600 hover:text-gray-800 hover:bg-gray-100/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-105"
                    >
                      重新考虑
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}; 