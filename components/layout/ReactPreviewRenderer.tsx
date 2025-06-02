'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Maximize2, 
  Download, 
  ExternalLink,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Code2
} from 'lucide-react';

// 定义代码文件接口
interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
}

// 预览数据接口
interface PreviewData {
  files: CodeFile[];
  projectName: string;
  description?: string;
  dependencies?: Record<string, string>;
  assets?: Asset[];
}

// 资源文件接口
interface Asset {
  name: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'link';
  description?: string;
}

interface ReactPreviewRendererProps {
  data: PreviewData;
  onDownload?: () => void;
  onDeploy?: () => void;
  onEditCode?: (filename: string) => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function ReactPreviewRenderer({
  data,
  onDownload,
  onDeploy,
  onEditCode
}: ReactPreviewRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [previewKey, setPreviewKey] = useState(0);

  // 设备尺寸配置
  const deviceSizes = {
    desktop: { width: '100%', maxWidth: 'none' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' }
  };

  // 生成简单的预览HTML
  const generatePreviewHTML = () => {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.projectName} - 预览</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-gray-50 p-8">
    <div id="root"></div>
    
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">${data.projectName}</h1>
            <p class="text-gray-600 mb-6">${data.description || 'React 应用预览'}</p>
            
            <div class="grid md:grid-cols-2 gap-6">
                ${data.files.map(file => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-800 mb-2">${file.filename}</h3>
                    <p class="text-sm text-gray-600 mb-2">${file.description || file.type}</p>
                    <div class="text-xs text-gray-500">
                        ${file.language} • ${file.content.split('\\n').length} 行
                    </div>
                </div>
                `).join('')}
            </div>
            
            <div class="mt-8 text-center">
                <p class="text-gray-500">React 应用预览功能正在开发中</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  };

  // 刷新预览
  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* 简洁工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 设备切换 */}
          <div className="flex gap-1">
            {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => (
              <button
                key={device}
                onClick={() => setDeviceType(device)}
                className={`p-2 rounded transition-colors ${
                  deviceType === device
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {device === 'desktop' && <Monitor className="w-4 h-4" />}
                {device === 'tablet' && <Tablet className="w-4 h-4" />}
                {device === 'mobile' && <Smartphone className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          
          {onDeploy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeploy}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 预览内容 */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
        <div
          className="bg-white shadow-lg rounded-lg overflow-hidden mx-auto"
          style={{
            width: deviceSizes[deviceType].width,
            maxWidth: deviceSizes[deviceType].maxWidth,
            height: isFullscreen ? 'calc(100vh - 120px)' : '80vh'
          }}
        >
          {data && data.files.length > 0 ? (
            <iframe
              key={previewKey}
              srcDoc={generatePreviewHTML()}
              className="w-full h-full border-0"
              title="React Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">等待代码生成</p>
                <p className="text-sm">代码生成完成后将在此显示预览</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReactPreviewRenderer; 