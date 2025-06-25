'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ExternalLink, Send, CheckCircle, Paperclip, Eye } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { MessageBubble } from './MessageBubble';
import { CodePreviewToggle } from '@/components/editor/CodePreviewToggle';

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
  getReactPreviewData
}: CodeModeViewProps) {
  const { theme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.conversationHistory]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 统一的顶部导航栏 */}
      <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${
        theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700"
      }`}>
        {/* 左侧：返回按钮和对话历史 */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回对话
          </Button>
          <div className="text-sm font-medium">对话历史</div>
        </div>

        {/* 中间：项目代码和预览 */}
        <div className="text-sm font-medium">项目代码和预览</div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDeploy}>
            <ExternalLink className="w-4 h-4 mr-2" />
            部署
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className={`rounded-lg border transition-all duration-300 h-8 px-3 text-sm ${
              theme === "light"
                ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
            }`}
          >
            <a href="/dashboard" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              工作台
            </a>
          </Button>
        </div>
      </div>

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

          {/* 底部对话输入框 */}
          <div className="border-t border-gray-100 bg-white p-4 shrink-0">
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
                    className={`ml-3 p-3 h-12 w-12 rounded-2xl transition-all duration-300 flex-shrink-0 ${
                      theme === "light"
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                        : "text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                    }`}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  {/* 输入框 */}
                  <div className="flex-1 relative">
                    <Input
                      id="code-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={onKeyPress}
                      placeholder="告诉我需要如何修改代码..."
                      className="px-4 py-4 w-full border-0 rounded-3xl text-base transition-all duration-300 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pr-16"
                      style={{ height: '72px' }}
                      disabled={isGenerating}
                    />
                    
                    {/* 发送按钮 - 内部右侧 */}
                    <Button
                      onClick={onSendMessage}
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
              </div>
            </div>
            
            {/* 快捷操作建议 */}
            <div className="mt-3 flex flex-wrap gap-2">
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
                  className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full border border-gray-200"
                >
                  {suggestion}
                </Button>
              ))}
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
    </div>
  );
} 