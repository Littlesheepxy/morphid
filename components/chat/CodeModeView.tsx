'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Download, ExternalLink, Send, CheckCircle } from 'lucide-react';
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
    <div className="flex-1 flex h-full">
      {/* 左侧对话区域 */}
      <div className="w-1/3 flex flex-col border-r h-full">
        {/* 对话头部 */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
          theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700"
        }`}>
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
        </div>

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
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="告诉我需要如何修改代码..."
                className="pr-12 py-3 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
              <Button
                onClick={onSendMessage}
                disabled={!inputValue.trim() || isGenerating}
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
              >
                <Send className="w-4 h-4" />
              </Button>
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
        {/* 代码预览工具栏 */}
        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${
          theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700"
        }`}>
          <div className="text-sm font-medium">项目代码和预览</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              下载项目
            </Button>
            <Button variant="outline" size="sm" onClick={onDeploy}>
              <ExternalLink className="w-4 h-4 mr-2" />
              部署
            </Button>
          </div>
        </div>

        {/* 代码和预览区域 */}
        <div className="flex-1">
          <CodePreviewToggle
            files={generatedCode}
            isStreaming={isGenerating}
            previewData={getReactPreviewData() || undefined}
            onDownload={onDownload}
            onDeploy={onDeploy}
            onEditCode={onEditCode}
          />
        </div>
      </div>
    </div>
  );
} 