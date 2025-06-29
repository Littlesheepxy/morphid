'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ExternalLink, Send, CheckCircle, Paperclip, Eye, Share2 } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { MessageBubble } from './MessageBubble';
import { CodePreviewToggle } from '@/components/editor/CodePreviewToggle';
import { ShareDialog } from '@/components/dialogs/share-dialog';
import { UnifiedInputBox } from '@/components/ui/unified-input-box';

interface CodeModeViewProps {
  currentSession: any;
  generatedCode: any[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isGenerating: boolean;
  onBack: () => void;
  onSendMessage: () => void;
  onSendChatMessage?: (message: string, options?: any) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onDownload: () => void;
  onDeploy: () => void;
  onEditCode: (filename: string) => void;
  getReactPreviewData: () => any;
  onFileUpload?: (file: File) => void;
}

export function CodeModeView({
  currentSession,
  generatedCode,
  inputValue,
  setInputValue,
  isGenerating,
  onBack,
  onSendMessage,
  onSendChatMessage,
  onKeyPress,
  onDownload,
  onDeploy,
  onEditCode,
  getReactPreviewData,
  onFileUpload
}: CodeModeViewProps) {
  const { theme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.conversationHistory]);

  // 处理分享功能
  const handleShare = async (shareData: any) => {
    console.log('分享数据:', shareData);
    
    try {
      // 根据分享类型调用不同的API
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: shareData.type,
          config: shareData.config,
          pageId: currentSession?.id,
          pageTitle: getPageTitle(),
          pageContent: getReactPreviewData(),
          conversationHistory: currentSession?.conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error('分享失败');
      }

      const result = await response.json();
      
      if (result.success) {
        // 显示成功提示
        console.log('分享成功:', result);
        // TODO: 显示成功toast
      }
    } catch (error) {
      console.error('分享失败:', error);
      // TODO: 显示错误toast
    }
  };

  // 获取页面标题
  const getPageTitle = () => {
    if (currentSession?.conversationHistory?.length > 0) {
      const firstMessage = currentSession.conversationHistory[0];
      return firstMessage.content?.slice(0, 50) + '...' || '我的个人页面';
    }
    return '我的个人页面';
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // 清空input值，以便重复选择同一文件
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 主要内容区域 */}
      <div className="flex-1 flex h-full">
        {/* 左侧对话区域 */}
        <div className="w-1/3 flex flex-col border-r h-full">
          {/* 消息列表 */}
          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full">
              <div className="py-4">
                {currentSession?.conversationHistory?.map((message: any, index: number) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === (currentSession?.conversationHistory?.length || 0) - 1}
                    isGenerating={isGenerating}
                  />
                ))}
                
                {/* 如果是测试模式，显示生成信息 */}
                {generatedCode.length > 0 && (
                  <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-800">代码生成完成</span>
                      </div>
                      <p className="text-blue-700 text-sm">
                        已生成包含 React 组件、样式文件和配置的完整项目代码。
                        右侧可以查看代码和预览效果。
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* 底部对话输入框 - 优化布局 */}
          <div className={`border-t p-4 shrink-0 transition-all duration-300 ${
            theme === "light" 
              ? "bg-white border-gray-100" 
              : "bg-gray-900 border-gray-700"
          }`}>
            {/* 快捷操作建议 - 横向滚动一行显示 */}
            <div className="mb-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-1 min-w-max">
                {[
                  "修改配色方案",
                  "调整布局结构", 
                  "添加新功能",
                  "优化移动端显示",
                  "更新个人信息"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost" 
                    size="sm"
                    onClick={() => setInputValue(suggestion)}
                    className={`text-xs rounded-full border transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                      theme === "light"
                        ? "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-gray-600"
                    }`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* 输入框区域 */}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <div 
                  className={`flex items-center rounded-3xl transition-all duration-300 border-2 cursor-text ${
                    theme === "light" 
                      ? "bg-white shadow-sm border-emerald-200/80 hover:border-emerald-300/80" 
                      : "bg-gray-800 shadow-sm border-emerald-700/50 hover:border-emerald-600/50"
                  }`}
                  onClick={() => {
                    const input = document.querySelector('#code-input') as HTMLInputElement;
                    input?.focus();
                  }}
                >
                  {/* 文档上传图标 - 内部左侧 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFileUploadClick}
                    className={`ml-3 p-2 h-10 w-10 rounded-full transition-all duration-300 flex-shrink-0 ${
                      theme === "light"
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                        : "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                    }`}
                    title="上传文件"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  {/* 输入框 */}
                  <div className="flex-1 relative">
                    <Input
                      id="code-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={onKeyPress}
                      placeholder="输入修改需求..."
                      className={`px-4 py-3 w-full border-0 rounded-3xl text-base transition-all duration-300 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pr-14 ${
                        theme === "light"
                          ? "text-gray-900 placeholder-gray-400"
                          : "text-white placeholder-gray-500"
                      }`}
                      style={{ height: '56px' }}
                      disabled={isGenerating}
                    />
                    
                    {/* 发送按钮 - 内部右侧 */}
                    <Button
                      onClick={onSendMessage}
                      disabled={!inputValue.trim() || isGenerating}
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 p-0 rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 z-20"
                      style={{
                        background: !inputValue.trim() || isGenerating 
                          ? '#9CA3AF' 
                          : 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
                      }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧代码预览区域 */}
        <div className="w-2/3 flex flex-col h-full">
          {/* 代码和预览区域 */}
          <div className="flex-1">
            <CodePreviewToggle
              files={generatedCode}
              isStreaming={isGenerating}
              previewData={getReactPreviewData() || undefined}
              onDownload={onDownload}
              onDeploy={onDeploy}
              onEditCode={onEditCode}
              onSendMessage={onSendChatMessage}
            />
          </div>
        </div>
      </div>

      {/* 隐藏的文件上传输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
} 