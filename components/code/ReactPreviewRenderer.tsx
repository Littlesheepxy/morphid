'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  Monitor, 
  Tablet, 
  Smartphone,
  Code,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// 设备类型
type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface ReactPreviewRendererProps {
  data: PreviewData;
  onDownload?: () => void;
  onDeploy?: () => void;
  onEditCode?: (filename: string) => void;
}

export function ReactPreviewRenderer({
  data,
  onDownload,
  onDeploy,
  onEditCode
}: ReactPreviewRendererProps) {
  const [currentDevice, setCurrentDevice] = useState<DeviceType>('desktop');
  const [isRunning, setIsRunning] = useState(false);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 设备尺寸配置
  const deviceSizes = {
    desktop: { width: '100%', height: '700px', label: '桌面端' },
    tablet: { width: '768px', height: '700px', label: '平板端' },
    mobile: { width: '375px', height: '700px', label: '移动端' }
  };

  // 启动预览
  const startPreview = async () => {
    setIsRunning(true);
    setBuildStatus('building');
    setBuildError(null);

    try {
      // 模拟构建过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBuildStatus('success');
      setPreviewKey(prev => prev + 1);
    } catch (error) {
      setBuildStatus('error');
      setBuildError(error instanceof Error ? error.message : '构建失败');
      setIsRunning(false);
    }
  };

  // 停止预览
  const stopPreview = () => {
    setIsRunning(false);
    setBuildStatus('idle');
  };

  // 刷新预览
  const refreshPreview = () => {
    if (isRunning) {
      setPreviewKey(prev => prev + 1);
    }
  };

  // 生成完整的React应用HTML
  const generateReactAppHTML = () => {
    const mainComponent = data.files.find(f => f.type === 'component' || f.type === 'page');
    const stylesFile = data.files.find(f => f.type === 'styles');
    const dataFile = data.files.find(f => f.type === 'data');

    // 提取数据
    let userData = {};
    if (dataFile) {
      try {
        // 从代码中提取数据对象
        const dataMatch = dataFile.content.match(/export\s+const\s+\w+\s*=\s*({[\s\S]*?});?$/m);
        if (dataMatch) {
          userData = eval(`(${dataMatch[1]})`);
        }
      } catch (e) {
        console.warn('Failed to parse user data:', e);
      }
    }

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.projectName} - Preview</title>
    
    <!-- React & ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    
    <!-- Babel Standalone for JSX transformation -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide React Icons -->
    <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
    
    <!-- Framer Motion -->
    <script src="https://unpkg.com/framer-motion@latest/dist/framer-motion.js"></script>
    
    <style>
        ${stylesFile?.content || ''}
        
        /* 预览特定样式 */
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .preview-container {
            min-height: 100vh;
        }
        
        /* 链接样式增强 */
        .portfolio-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .portfolio-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        /* Iframe 样式 */
        .portfolio-iframe {
            width: 100%;
            border: none;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        /* 作品展示卡片 */
        .project-card {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            transition: all 0.3s ease;
        }
        
        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect } = React;
        const { motion, AnimatePresence } = window.Motion || window.FramerMotion || {};
        
        // 用户数据
        const userData = ${JSON.stringify(userData, null, 2)};
        
        // React组件定义
        ${generateReactComponent(mainComponent?.content || '', userData)}
        
        // 渲染到DOM
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
        
        // 预览增强功能
        window.addEventListener('load', function() {
            // 处理外部链接
            document.querySelectorAll('a[href^="http"]').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.parent.postMessage({
                        type: 'external-link',
                        url: this.href
                    }, '*');
                });
            });
            
            // 处理iframe加载
            document.querySelectorAll('iframe').forEach(iframe => {
                iframe.addEventListener('load', function() {
                    this.style.opacity = '1';
                });
            });
        });
    </script>
</body>
</html>`;
  };

  // 生成React组件代码
  const generateReactComponent = (componentCode: string, userData: any) => {
    // 如果没有组件代码，生成默认的简历组件
    if (!componentCode) {
      return `
        function App() {
          return (
            <div className="preview-container bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
              <div className="max-w-4xl mx-auto">
                <PersonalProfile data={userData} />
                <ProjectShowcase data={userData} />
                <ContactSection data={userData} />
              </div>
            </div>
          );
        }
        
        function PersonalProfile({ data }) {
          return (
            <div className="project-card p-8 mb-8 text-center">
              <img 
                src={data.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"} 
                alt="Profile" 
                className="w-32 h-32 rounded-full mx-auto mb-6 object-cover"
              />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                {data.name || "Your Name"}
              </h1>
              <p className="text-xl text-blue-600 mb-4">
                {data.title || "Your Title"}
              </p>
              <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {data.bio || "Your professional bio will appear here."}
              </p>
            </div>
          );
        }
        
        function ProjectShowcase({ data }) {
          const projects = data.projects || [];
          
          return (
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">作品展示</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {projects.map((project, index) => (
                  <ProjectCard key={index} project={project} />
                ))}
              </div>
            </div>
          );
        }
        
        function ProjectCard({ project }) {
          return (
            <div className="project-card overflow-hidden">
              {project.iframe ? (
                <div className="relative" style={{ height: '300px' }}>
                  <iframe
                    src={project.iframe}
                    className="portfolio-iframe w-full h-full"
                    title={project.title}
                    loading="lazy"
                    style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                  />
                </div>
              ) : (
                <img 
                  src={project.image || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop"} 
                  alt={project.title}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {project.title || "Project Title"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {project.description || "Project description"}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {(project.technologies || []).map((tech, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  {project.liveUrl && (
                    <a href={project.liveUrl} className="portfolio-link text-sm">
                      <span>查看项目</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {project.githubUrl && (
                    <a href={project.githubUrl} className="portfolio-link bg-gray-800 text-sm">
                      <span>源代码</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        }
        
        function ContactSection({ data }) {
          return (
            <div className="project-card p-8 text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">联系我</h2>
              <div className="flex flex-wrap justify-center gap-4">
                {data.email && (
                  <a href={\`mailto:\${data.email}\`} className="portfolio-link">
                    <span>邮箱联系</span>
                  </a>
                )}
                {data.linkedin && (
                  <a href={data.linkedin} className="portfolio-link bg-blue-600">
                    <span>LinkedIn</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {data.github && (
                  <a href={data.github} className="portfolio-link bg-gray-800">
                    <span>GitHub</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        }
      `;
    }

    // 处理现有的组件代码
    return componentCode.replace(/export\s+default\s+/g, '').replace(/export\s+/g, '');
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            React 应用预览
          </CardTitle>
          
          {/* 控制按钮 */}
          <div className="flex gap-2 flex-wrap">
            {!isRunning ? (
              <Button onClick={startPreview} size="sm" className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                启动预览
              </Button>
            ) : (
              <Button onClick={stopPreview} variant="outline" size="sm">
                <Square className="w-4 h-4 mr-2" />
                停止
              </Button>
            )}
            
            <Button 
              onClick={refreshPreview} 
              variant="outline" 
              size="sm"
              disabled={!isRunning}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            
            {onDownload && (
              <Button onClick={onDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                下载项目
              </Button>
            )}
            
            {onDeploy && (
              <Button onClick={onDeploy} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                部署上线
              </Button>
            )}
          </div>
        </div>

        {/* 项目信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
          <div className="flex items-center gap-1">
            <span>📦</span>
            <span>{data.projectName}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            React + TypeScript
          </Badge>
          <Badge variant="outline" className="text-xs">
            {data.files.length} 个文件
          </Badge>
        </div>

        {/* 构建状态 */}
        {buildStatus !== 'idle' && (
          <div className="mt-3 flex items-center gap-2">
            {buildStatus === 'building' && (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-blue-600">正在构建...</span>
              </>
            )}
            {buildStatus === 'success' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">构建成功</span>
              </>
            )}
            {buildStatus === 'error' && (
              <>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">构建失败: {buildError}</span>
              </>
            )}
          </div>
        )}

        {/* 设备切换器 */}
        {isRunning && (
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
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* 预览容器 */}
        <div className="border-t bg-gray-50">
          {isRunning && buildStatus === 'success' ? (
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
                <iframe
                  ref={iframeRef}
                  key={previewKey}
                  srcDoc={generateReactAppHTML()}
                  className="w-full h-full border-0"
                  title="React App Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
                
                {/* 设备框架装饰 */}
                {currentDevice === 'mobile' && (
                  <div className="absolute inset-x-0 top-0 h-6 bg-black rounded-t-lg flex items-center justify-center">
                    <div className="w-12 h-1 bg-gray-800 rounded-full"></div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                {buildStatus === 'building' ? (
                  <>
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
                    <p className="text-lg font-medium mb-2">正在构建 React 应用</p>
                    <p className="text-sm">请稍候，正在编译组件...</p>
                  </>
                ) : buildStatus === 'error' ? (
                  <>
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-medium mb-2">构建失败</p>
                    <p className="text-sm text-red-600">{buildError}</p>
                  </>
                ) : (
                  <>
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">点击启动预览</p>
                    <p className="text-sm">将构建并运行 React 应用</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 文件列表和资源 */}
        {data.files.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* 文件列表 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">项目文件</h4>
                <div className="space-y-2">
                  {data.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{file.filename}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                      {onEditCode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditCode(file.filename)}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 资源列表 */}
              {data.assets && data.assets.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">项目资源</h4>
                  <div className="space-y-2">
                    {data.assets.map((asset, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{asset.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {asset.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={asset.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 