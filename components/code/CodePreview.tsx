'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Download, 
  Share2, 
  Monitor, 
  Tablet, 
  Smartphone,
  RefreshCw,
  ExternalLink,
  Code2,
  Palette,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewData {
  htmlContent: string;
  cssContent: string;
  userData: any;
  previewUrl?: string;
  isLoading?: boolean;
}

interface CodePreviewProps {
  data: PreviewData;
  onDownload?: () => void;
  onDeploy?: () => void;
  onCustomize?: () => void;
  onRefresh?: () => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function CodePreview({ 
  data, 
  onDownload, 
  onDeploy, 
  onCustomize,
  onRefresh 
}: CodePreviewProps) {
  const [currentDevice, setCurrentDevice] = useState<DeviceType>('desktop');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // 设备尺寸配置
  const deviceSizes = {
    desktop: { width: '100%', height: '600px', label: '桌面端' },
    tablet: { width: '768px', height: '600px', label: '平板端' },
    mobile: { width: '375px', height: '600px', label: '移动端' }
  };

  // 刷新预览
  const handleRefresh = () => {
    setIsPreviewLoading(true);
    setPreviewKey(prev => prev + 1);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => setIsPreviewLoading(false), 1000);
  };

  // 生成预览HTML
  const generatePreviewHTML = () => {
    if (!data.htmlContent || !data.cssContent) return '';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>个人简历预览</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${data.cssContent}
        
        /* 额外的预览样式 */
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .preview-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
            body { padding: 10px; }
        }
        
        /* 加载动画 */
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    </style>
</head>
<body>
    <div class="preview-container">
        ${data.htmlContent}
    </div>
    
    <script>
        // 预览页面交互增强
        document.addEventListener('DOMContentLoaded', function() {
            // 添加平滑滚动
            document.documentElement.style.scrollBehavior = 'smooth';
            
            // 添加进入动画
            const elements = document.querySelectorAll('[class*="card"], [class*="section"]');
            elements.forEach((el, index) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'all 0.6s ease';
                
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });
    </script>
</body>
</html>`;
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            页面预览
          </CardTitle>
          
          {/* 操作按钮组 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isPreviewLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isPreviewLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            
            {onCustomize && (
              <Button variant="outline" size="sm" onClick={onCustomize}>
                <Settings className="w-4 h-4 mr-2" />
                定制
              </Button>
            )}
            
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            )}
            
            {onDeploy && (
              <Button size="sm" onClick={onDeploy} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                部署
              </Button>
            )}
          </div>
        </div>

        {/* 设备切换器 */}
        <div className="flex gap-1 mt-4">
          {(Object.keys(deviceSizes) as DeviceType[]).map((device) => (
            <button
              key={device}
              onClick={() => setCurrentDevice(device)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                currentDevice === device
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {device === 'desktop' && <Monitor className="w-4 h-4" />}
              {device === 'tablet' && <Tablet className="w-4 h-4" />}
              {device === 'mobile' && <Smartphone className="w-4 h-4" />}
              <span>{deviceSizes[device].label}</span>
            </button>
          ))}
        </div>

        {/* 信息栏 */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
          {data.userData?.personal?.fullName && (
            <div className="flex items-center gap-1">
              <span>👤</span>
              <span>{data.userData.personal.fullName}</span>
            </div>
          )}
          {data.userData?.professional?.currentTitle && (
            <div className="flex items-center gap-1">
              <span>💼</span>
              <span>{data.userData.professional.currentTitle}</span>
            </div>
          )}
          <Badge variant="secondary" className="text-xs">
            响应式设计
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 预览容器 */}
        <div className="border-t bg-gray-50">
          <div className="flex justify-center p-4">
            <motion.div
              key={`${currentDevice}-${previewKey}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white rounded-lg shadow-lg overflow-hidden border"
              style={{
                width: deviceSizes[currentDevice].width,
                maxWidth: '100%',
                height: deviceSizes[currentDevice].height,
              }}
            >
              {/* 加载状态 */}
              {(data.isLoading || isPreviewLoading) && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">正在生成预览...</p>
                  </div>
                </div>
              )}

              {/* 预览内容 */}
              {data.htmlContent && data.cssContent ? (
                <iframe
                  key={previewKey}
                  srcDoc={generatePreviewHTML()}
                  className="w-full h-full border-0"
                  title="Resume Preview"
                  sandbox="allow-same-origin"
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

              {/* 设备框架装饰 */}
              {currentDevice === 'mobile' && (
                <div className="absolute inset-x-0 top-0 h-6 bg-black rounded-t-lg flex items-center justify-center">
                  <div className="w-12 h-1 bg-gray-800 rounded-full"></div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* 统计信息 */}
        {data.userData && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {data.userData.professional?.skills?.length || 0}
                </div>
                <div className="text-xs text-gray-600">核心技能</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {data.userData.experience?.length || 0}
                </div>
                <div className="text-xs text-gray-600">工作经历</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {data.userData.projects?.length || 0}
                </div>
                <div className="text-xs text-gray-600">项目经历</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {data.userData.education?.length || 0}
                </div>
                <div className="text-xs text-gray-600">教育背景</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CodePreview;
