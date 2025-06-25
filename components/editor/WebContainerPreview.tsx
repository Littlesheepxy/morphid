'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  RefreshCw, 
  ExternalLink, 
  Download,
  Monitor,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Terminal,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WebContainerService, type ContainerStatus, type CodeFile } from '@/lib/services/webcontainer-service';
import { StagewiseToolbar } from './StagewiseToolbar';

type DeviceType = 'desktop' | 'mobile';
type EditMode = 'none' | 'text' | 'ai';

interface WebContainerPreviewProps {
  files: CodeFile[];
  projectName: string;
  description?: string;
  isLoading: boolean;
  previewUrl: string | null;
  enableWebContainer: boolean;
  onPreviewReady: (url: string) => void;
  onLoadingChange: (loading: boolean) => void;
  isEditMode?: boolean;
  onContentChange?: (field: string, value: string) => void;
  deviceType?: DeviceType;
  editMode?: EditMode;
}

export function WebContainerPreview({
  files,
  projectName,
  description,
  isLoading,
  previewUrl,
  enableWebContainer,
  onPreviewReady,
  onLoadingChange,
  isEditMode,
  onContentChange,
  deviceType = 'desktop',
  editMode = 'none'
}: WebContainerPreviewProps) {
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>('idle');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [webcontainerService, setWebcontainerService] = useState<WebContainerService | null>(null);

  // 设备尺寸配置
  const deviceConfigs = {
    desktop: { width: '100%', height: '100%', label: '桌面' },
    mobile: { width: '375px', height: '667px', label: '手机' }
  };

  // 初始化WebContainer服务
  useEffect(() => {
    if (enableWebContainer && !webcontainerService) {
      console.log('🔧 开始初始化WebContainer服务...');
      
      const service = new WebContainerService({
        clientId: 'wc_api_littlesheepxy_33595e6cd89a5813663cd3f70b26e12d',
        workdirName: projectName.toLowerCase().replace(/\s+/g, '-')
      });

      // 监听状态变化
      service.onStatusChange((status) => {
        console.log('📊 WebContainer状态变化:', status);
        setContainerStatus(status);
      });

      // 监听日志
      service.onLog((log) => {
        console.log('📝 WebContainer日志:', log);
        setBuildLogs(prev => [...prev, log]);
      });

      setWebcontainerService(service);

      // 初始化认证
      console.log('🔐 开始WebContainer认证...');
      service.initAuth()
        .then(() => {
          console.log('✅ WebContainer认证初始化成功');
        })
        .catch(error => {
          console.error('❌ WebContainer认证初始化失败:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setBuildLogs(prev => [...prev, `❌ 认证失败: ${errorMessage}`]);
          setContainerStatus('error');
        });
    }
  }, [enableWebContainer, projectName, webcontainerService]);

  // 启动WebContainer
  const startContainer = useCallback(async () => {
    if (!webcontainerService || !enableWebContainer || files.length === 0) {
      console.log('⚠️ WebContainer启动条件不满足:', {
        hasService: !!webcontainerService,
        enableWebContainer,
        filesCount: files.length
      });
      return;
    }

    try {
      onLoadingChange(true);
      setBuildLogs(['🚀 开始启动WebContainer...']);
      console.log('🚀 开始启动WebContainer...');

      // 启动WebContainer实例
      console.log('📦 正在创建WebContainer实例...');
      await webcontainerService.boot();
      console.log('✅ WebContainer实例创建成功');

      // 挂载文件
      console.log('📁 正在挂载文件...');
      await webcontainerService.mountFiles(files);
      console.log('✅ 文件挂载成功');

      // 安装依赖
      console.log('📦 正在安装依赖...');
      await webcontainerService.installDependencies();
      console.log('✅ 依赖安装成功');

      // 启动开发服务器
      console.log('🏗️ 正在启动开发服务器...');
      await webcontainerService.startDevServer();
      console.log('✅ 开发服务器启动成功');

      // 监听服务器就绪事件
      webcontainerService.onStatusChange((status) => {
        if (status === 'running') {
          console.log('🌐 WebContainer服务器就绪');
          // 生成预览URL (这里应该从WebContainer获取实际URL)
          const previewUrl = generateMockPreviewUrl();
          onPreviewReady(previewUrl);
        }
      });

    } catch (error) {
      console.error('❌ WebContainer启动失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setBuildLogs(prev => [...prev, `❌ 启动失败: ${errorMessage}`]);
      setContainerStatus('error');
      
      // 回退到模拟预览
      console.log('🔄 回退到模拟预览模式');
      const mockPreviewUrl = generateMockPreviewUrl();
      onPreviewReady(mockPreviewUrl);
    } finally {
      onLoadingChange(false);
    }
  }, [webcontainerService, enableWebContainer, files, onPreviewReady, onLoadingChange]);

  // 生成模拟预览URL
  const generateMockPreviewUrl = () => {
    const htmlContent = generatePreviewHTML();
    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  };

  // 生成预览HTML
  const generatePreviewHTML = () => {
    // 查找主要的React组件文件
    const appFile = files.find(f => 
      f.filename.includes('App.') || 
      f.filename.includes('Resume.') || 
      f.filename.includes('main.') ||
      f.type === 'component'
    );
    
    // 查找CSS文件
    const cssFile = files.find(f => f.filename.includes('.css') || f.type === 'styles');
    
    let componentContent;
    let cssContent = '';
    
    if (appFile) {
      // 处理现有的React组件代码
      componentContent = processReactComponent(appFile.content);
    } else {
      // 使用默认组件
      componentContent = generateDefaultApp();
    }
    
    if (cssFile) {
      cssContent = cssFile.content;
    }

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - 预览</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      body { font-family: Inter, system-ui, sans-serif; }
      .editable-field {
        transition: all 0.2s ease;
        border-radius: 4px;
        padding: 2px 6px;
        margin: -2px -6px;
        cursor: ${isEditMode ? 'pointer' : 'default'};
      }
      .editable-field:hover {
        background-color: ${isEditMode ? 'rgb(239 246 255)' : 'transparent'};
        border: ${isEditMode ? '1px solid rgb(147 197 253)' : 'none'};
      }
      ${cssContent}
    </style>
</head>
<body class="bg-gray-50">
    <div id="root"></div>
    
    <script type="text/babel">
      const { useState, useEffect } = React;
      
      ${componentContent}
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    </script>
</body>
</html>`;
  };

  // 处理React组件代码，确保能在浏览器中运行
  const processReactComponent = (content: string) => {
    // 移除import语句，因为在浏览器环境中不需要
    let processedContent = content
      .replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '')
      .replace(/import\s+['"].*?['"];?\s*/g, '');
    
    // 移除export语句
    processedContent = processedContent.replace(/export\s+(default\s+)?/g, '');
    
    // 如果没有App函数，尝试将主要组件重命名为App
    if (!processedContent.includes('function App')) {
      // 查找主要的函数组件
      const componentMatch = processedContent.match(/function\s+(\w+)/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        processedContent = processedContent.replace(
          new RegExp(`function\\s+${componentName}`, 'g'),
          'function App'
        );
      }
    }
    
    return processedContent;
  };

  // 生成默认App组件
  const generateDefaultApp = () => `
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ${projectName}
          </h1>
          <p className="text-xl text-gray-600">
            ${description || '使用WebContainer技术构建的现代化应用'}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              ✨ 特性
            </h2>
            <ul className="space-y-2 text-gray-600">
              <li>• 实时预览</li>
              <li>• 响应式设计</li>
              <li>• 现代化UI</li>
              <li>• 高性能</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              🚀 技术栈
            </h2>
            <ul className="space-y-2 text-gray-600">
              <li>• React 18</li>
              <li>• TypeScript</li>
              <li>• Tailwind CSS</li>
              <li>• WebContainer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}`;

  // 刷新预览
  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
    // 总是先生成模拟预览，确保用户能看到内容
    const mockPreviewUrl = generateMockPreviewUrl();
    onPreviewReady(mockPreviewUrl);
    setContainerStatus('running');
    
    // 如果启用WebContainer，在后台尝试启动
    if (enableWebContainer && webcontainerService) {
      startContainer().catch(() => {
        console.log('WebContainer刷新失败，保持使用模拟预览');
      });
    }
  };

  // 处理可视化编辑请求
  const handleElementModificationRequest = useCallback(async (elementInfo: any, prompt: string) => {
    console.log('收到元素修改请求:', elementInfo, prompt);
    
    // 构建发送给 coding agent 的消息内容
    const visualEditMessage = `
🎯 **可视化编辑请求**

**选中元素：**
- 标签: \`${elementInfo.tagName}\`
- 选择器: \`${elementInfo.selector}\`
- 类名: \`${elementInfo.className}\`
- 文本内容: "${elementInfo.textContent?.slice(0, 100)}${elementInfo.textContent?.length > 100 ? '...' : ''}"

**修改需求：**
${prompt}

**项目上下文：**
- 项目名称: ${projectName}
- 框架: React
- 当前文件数: ${files.length}

请帮我修改代码来实现这个需求。
    `.trim();

    // 通过 onContentChange 回调将消息发送到聊天系统
    if (onContentChange) {
      // 使用特殊的字段名来标识这是可视化编辑请求
      onContentChange('visual_edit_request', visualEditMessage);
    } else {
      // 如果没有 onContentChange 回调，可以尝试其他方式
      console.log('可视化编辑消息:', visualEditMessage);
      
      // 可以尝试通过 postMessage 发送到父窗口
      window.parent.postMessage({
        type: 'VISUAL_EDIT_TO_CHAT',
        message: visualEditMessage,
        elementInfo,
        prompt
      }, '*');
    }
    
    // 显示反馈信息
    console.log('✅ 可视化编辑请求已发送到聊天系统');
  }, [files, projectName, onContentChange]);

  // 自动启动预览
  useEffect(() => {
    if (files.length > 0) {
      // 优先使用模拟预览，避免WebContainer初始化问题
      const mockPreviewUrl = generateMockPreviewUrl();
      onPreviewReady(mockPreviewUrl);
      setContainerStatus('running');
      
      // 如果启用WebContainer，可以在后台尝试启动
      if (enableWebContainer && webcontainerService && containerStatus === 'idle') {
        startContainer().catch(() => {
          // WebContainer启动失败时，保持使用模拟预览
          console.log('WebContainer启动失败，使用模拟预览');
        });
      }
    }
  }, [files, enableWebContainer, webcontainerService, onPreviewReady]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      <div className="flex-1 flex">
        {/* 预览区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 bg-gray-100">
            <div 
              className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
              style={{
                width: deviceConfigs[deviceType].width,
                height: deviceConfigs[deviceType].height,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {previewUrl ? (
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`${projectName} 预览`}
                />
              ) : (
                <PreviewPlaceholder status={containerStatus} />
              )}
            </div>
          </div>
        </div>

        {/* 日志面板 */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l bg-gray-900 text-green-400 font-mono text-xs overflow-hidden"
            >
              <div className="p-3 border-b border-gray-700">
                <h4 className="font-semibold text-white">构建日志</h4>
              </div>
              <div className="p-3 h-full overflow-y-auto">
                {buildLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* StagewiseIO 可视化编辑工具栏 - 只在AI设计模式下显示 */}
      {editMode === 'ai' && (
        <StagewiseToolbar
          iframeRef={iframeRef}
          onElementModificationRequest={handleElementModificationRequest}
          isEnabled={true}
          onToggle={() => {}} // 通过editMode控制，不需要单独的toggle
        />
      )}
    </div>
  );
}

// 状态指示器组件
function StatusIndicator({ status }: { status: ContainerStatus }) {
  const statusConfig = {
    idle: { color: 'bg-gray-400', label: '待启动', icon: Code },
    initializing: { color: 'bg-blue-400 animate-pulse', label: '初始化中', icon: Loader2 },
    installing: { color: 'bg-yellow-400 animate-pulse', label: '安装依赖', icon: Loader2 },
    building: { color: 'bg-orange-400 animate-pulse', label: '构建中', icon: Loader2 },
    running: { color: 'bg-green-400', label: '运行中', icon: CheckCircle2 },
    error: { color: 'bg-red-400', label: '错误', icon: AlertCircle }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", config.color)} />
      <Icon className="w-4 h-4 text-gray-600" />
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  );
}

// 预览占位符组件
function PreviewPlaceholder({ status }: { status: ContainerStatus }) {
  const messages = {
    idle: '点击启动按钮开始预览',
    initializing: '正在初始化WebContainer...',
    installing: '正在安装项目依赖...',
    building: '正在构建项目...',
    running: '正在加载预览...',
    error: '预览加载失败，请检查代码'
  };

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{messages[status]}</p>
        {status === 'error' && (
          <p className="text-sm text-red-500 mt-2">
            请检查控制台日志获取详细信息
          </p>
        )}
      </div>
    </div>
  );
}

export default WebContainerPreview; 