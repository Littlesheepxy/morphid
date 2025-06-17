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
  Tablet,
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
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

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
  onContentChange
}: WebContainerPreviewProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>('idle');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [webcontainerService, setWebcontainerService] = useState<WebContainerService | null>(null);

  // 设备尺寸配置
  const deviceConfigs = {
    desktop: { width: '100%', height: '100%', label: '桌面' },
    tablet: { width: '768px', height: '1024px', label: '平板' },
    mobile: { width: '375px', height: '667px', label: '手机' }
  };

  // 初始化WebContainer服务
  useEffect(() => {
    if (enableWebContainer && !webcontainerService) {
      const service = new WebContainerService({
        clientId: 'wc_api_littlesheepxy_33595e6cd89a5813663cd3f70b26e12d',
        workdirName: projectName.toLowerCase().replace(/\s+/g, '-')
      });

      // 监听状态变化
      service.onStatusChange((status) => {
        setContainerStatus(status);
      });

      // 监听日志
      service.onLog((log) => {
        setBuildLogs(prev => [...prev, log]);
      });

      setWebcontainerService(service);

      // 初始化认证
      service.initAuth().catch(console.error);
    }
  }, [enableWebContainer, projectName, webcontainerService]);

  // 启动WebContainer
  const startContainer = useCallback(async () => {
    if (!webcontainerService || !enableWebContainer || files.length === 0) return;

    try {
      onLoadingChange(true);
      setBuildLogs(['🚀 开始启动WebContainer...']);

      // 启动WebContainer实例
      await webcontainerService.boot();

      // 挂载文件
      await webcontainerService.mountFiles(files);

      // 安装依赖
      await webcontainerService.installDependencies();

      // 启动开发服务器
      await webcontainerService.startDevServer();

      // 监听服务器就绪事件
      webcontainerService.onStatusChange((status) => {
        if (status === 'running') {
          // 生成预览URL (这里应该从WebContainer获取实际URL)
          const previewUrl = generateMockPreviewUrl();
          onPreviewReady(previewUrl);
        }
      });

    } catch (error) {
      console.error('WebContainer启动失败:', error);
      setBuildLogs(prev => [...prev, `❌ 启动失败: ${error}`]);
      setContainerStatus('error');
      
      // 回退到模拟预览
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
    const appFile = files.find(f => f.filename.includes('App.') || f.filename.includes('main.'));
    const componentContent = appFile ? appFile.content : generateDefaultApp();

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
    if (enableWebContainer && webcontainerService) {
      startContainer();
    } else {
      const mockPreviewUrl = generateMockPreviewUrl();
      onPreviewReady(mockPreviewUrl);
    }
  };

  // 自动启动WebContainer
  useEffect(() => {
    if (enableWebContainer && files.length > 0 && webcontainerService && containerStatus === 'idle') {
      startContainer();
    }
  }, [enableWebContainer, files, webcontainerService, containerStatus, startContainer]);

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg overflow-hidden">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <StatusIndicator status={containerStatus} />
          <div>
            <h3 className="font-semibold text-sm">{projectName}</h3>
            <p className="text-xs text-gray-500">
              {enableWebContainer ? 'WebContainer预览' : '静态预览'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 设备切换 */}
          <div className="flex bg-white border rounded-md">
            {Object.entries(deviceConfigs).map(([key, config]) => (
              <Button
                key={key}
                variant={deviceType === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setDeviceType(key as DeviceType)}
                className="px-2 py-1 text-xs"
              >
                {key === 'desktop' && <Monitor className="w-3 h-3" />}
                {key === 'tablet' && <Tablet className="w-3 h-3" />}
                {key === 'mobile' && <Smartphone className="w-3 h-3" />}
              </Button>
            ))}
          </div>

          {/* 控制按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPreview}
            disabled={isLoading}
            className="px-3"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="px-3"
          >
            <Terminal className="w-4 h-4" />
          </Button>

          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
              className="px-3"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

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