'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Code, 
  MessageCircle, 
  Settings, 
  FileText,
  Palette,
  Database
} from 'lucide-react';
import { ReactPreviewRenderer } from './ReactPreviewRenderer';
import { CodeBlockStreaming } from './CodeBlockStreaming';

interface ResumeData {
  personal?: any;
  experience?: any[];
  projects?: any[];
  skills?: any[];
  education?: any[];
}

interface GeneratedCode {
  htmlContent: string;
  cssContent: string;
  files?: Array<{
    filename: string;
    content: string;
    language: string;
    type: string;
  }>;
}

interface ResumeBuilderProps {
  userData?: ResumeData;
  generatedCode?: GeneratedCode;
  onUserDataChange?: (data: ResumeData) => void;
  onGenerateCode?: () => void;
  onDownload?: () => void;
  onDeploy?: () => void;
  children?: React.ReactNode; // 用于传入聊天组件
}

type ViewMode = 'preview' | 'code';

export function ResumeBuilder({
  userData,
  generatedCode,
  onUserDataChange,
  onGenerateCode,
  onDownload,
  onDeploy,
  children
}: ResumeBuilderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* 左侧边栏 */}
      <div className={`bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* 侧边栏头部 */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-semibold text-gray-900">简历生成器</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>

        {/* 侧边栏内容 */}
        <div className="flex-1 overflow-hidden">
          {!sidebarCollapsed ? (
            <div className="h-full flex flex-col">
              {/* 导航标签 */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="flex-1 justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    AI对话
                  </Button>
                </div>
              </div>

              {/* 主要内容区域 */}
              <div className="flex-1 overflow-y-auto">
                {children || (
                  <div className="p-4">
                    {/* 快速配置 */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">快速配置</h3>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <FileText className="w-4 h-4 mr-2" />
                          选择模板
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Palette className="w-4 h-4 mr-2" />
                          修改主题
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Database className="w-4 h-4 mr-2" />
                          导入数据
                        </Button>
                      </div>
                    </div>

                    {/* 数据统计 */}
                    {userData && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">内容统计</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-semibold text-blue-600">
                              {userData.experience?.length || 0}
                            </div>
                            <div className="text-xs text-blue-800">工作经历</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-semibold text-green-600">
                              {userData.projects?.length || 0}
                            </div>
                            <div className="text-xs text-green-800">项目经历</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-semibold text-purple-600">
                              {userData.skills?.length || 0}
                            </div>
                            <div className="text-xs text-purple-800">技能标签</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg font-semibold text-orange-600">
                              {userData.education?.length || 0}
                            </div>
                            <div className="text-xs text-orange-800">教育背景</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="space-y-2">
                      {onGenerateCode && (
                        <Button 
                          onClick={onGenerateCode}
                          className="w-full"
                          size="sm"
                        >
                          生成简历
                        </Button>
                      )}
                      {onDownload && generatedCode && (
                        <Button 
                          onClick={onDownload}
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          下载简历
                        </Button>
                      )}
                      {onDeploy && generatedCode && (
                        <Button 
                          onClick={onDeploy}
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          部署上线
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2">
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部标签栏 */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'preview'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'code'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Code className="w-4 h-4" />
              Code
            </button>
          </div>

          {/* 状态信息 */}
          <div className="flex items-center gap-3">
            {generatedCode && (
              <Badge variant="secondary" className="text-xs">
                已生成
              </Badge>
            )}
            {userData?.personal?.fullName && (
              <span className="text-sm text-gray-600">
                {userData.personal.fullName}
              </span>
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {viewMode === 'preview' ? (
            <ReactPreviewRenderer 
              data={{
                files: (generatedCode?.files || []).map(file => ({
                  ...file,
                  type: file.type as 'component' | 'page' | 'styles' | 'config' | 'data'
                })),
                projectName: userData?.personal?.fullName || '简历项目',
                description: '基于AI生成的个人简历'
              }}
              onDownload={onDownload}
              onDeploy={onDeploy}
            />
          ) : (
            <CodeBlockStreaming 
              files={(generatedCode?.files || []).map(file => ({
                ...file,
                type: file.type as 'component' | 'page' | 'styles' | 'config'
              }))}
              isStreaming={false}
              onDownload={onDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumeBuilder; 