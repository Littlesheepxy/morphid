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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
}

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

// WebContainer状态
type ContainerStatus = 'idle' | 'initializing' | 'installing' | 'building' | 'running' | 'error';

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

  // 设备尺寸配置
  const deviceSizes = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' }
  };

  // 常用第三方库配置
  const popularLibraries = {
    'framer-motion': '^10.16.4',
    'lucide-react': '^0.263.1',
    '@radix-ui/react-slot': '^1.0.2',
    'class-variance-authority': '^0.7.0',
    'clsx': '^2.0.0',
    'tailwind-merge': '^1.14.0',
    '@emotion/react': '^11.11.1',
    '@emotion/styled': '^11.11.0',
    'react-spring': '^9.7.3',
    '@react-spring/web': '^9.7.3'
  };

  // 生成package.json
  const generatePackageJson = useCallback(() => {
    return {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        ...popularLibraries
      },
      devDependencies: {
        '@types/react': '^18.2.15',
        '@types/react-dom': '^18.2.7',
        '@vitejs/plugin-react': '^4.0.3',
        autoprefixer: '^10.4.14',
        postcss: '^8.4.24',
        tailwindcss: '^3.3.0',
        typescript: '^5.0.2',
        vite: '^4.4.5'
      }
    };
  }, [projectName]);

  // 生成Vite配置
  const generateViteConfig = () => `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})`;

  // 生成Tailwind配置
  const generateTailwindConfig = () => `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

  // 生成入口HTML
  const generateIndexHtml = () => `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  // 生成主入口文件
  const generateMainTsx = () => `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

  // 生成样式文件
  const generateIndexCss = () => `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

@media (prefers-color-scheme: light) {
  body {
    color: #213547;
    background-color: #ffffff;
  }
}`;

  // 启动WebContainer
  const startContainer = useCallback(async () => {
    if (!enableWebContainer || files.length === 0) return;

    setContainerStatus('initializing');
    onLoadingChange(true);
    setBuildLogs(['🚀 初始化WebContainer...']);

    try {
      // 模拟WebContainer初始化过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      setContainerStatus('installing');
      setBuildLogs(prev => [...prev, '📦 安装依赖包...']);

      await new Promise(resolve => setTimeout(resolve, 2000));
      setContainerStatus('building');
      setBuildLogs(prev => [...prev, '🏗️ 构建项目...']);

      await new Promise(resolve => setTimeout(resolve, 1500));
      setContainerStatus('running');
      setBuildLogs(prev => [...prev, '✅ 项目启动成功!', '🌐 预览地址: http://localhost:3000']);

      // 生成模拟预览URL
      const mockPreviewUrl = `data:text/html;charset=utf-8,${encodeURIComponent(generatePreviewHTML())}`;
      onPreviewReady(mockPreviewUrl);

    } catch (error) {
      setContainerStatus('error');
      setBuildLogs(prev => [...prev, `❌ 错误: ${error}`]);
    } finally {
      onLoadingChange(false);
    }
  }, [files, enableWebContainer, onPreviewReady, onLoadingChange]);

  // 生成预览HTML
  const generatePreviewHTML = () => {
    const appFile = files.find(f => f.filename.includes('App.'));
    const componentContent = appFile ? appFile.content : generateEditableResumeApp();

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - 实时预览</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/framer-motion@10/dist/framer-motion.js"></script>
    <style>
      body { font-family: Inter, system-ui, sans-serif; }
      .editable-field {
        transition: all 0.2s ease;
        border-radius: 4px;
        padding: 2px 6px;
        margin: -2px -6px;
      }
      .editable-field:hover {
        background-color: rgb(239 246 255);
        border: 1px solid rgb(147 197 253);
      }
      .editing {
        background-color: white;
        border: 2px solid rgb(59 130 246);
        outline: none;
      }
    </style>
</head>
<body class="bg-gray-50">
    <div id="root"></div>
    
    <script type="text/babel">
      const { useState, useEffect, useRef } = React;
      const { motion, AnimatePresence } = Motion;
      
      ${componentContent}
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    </script>
</body>
</html>`;
  };

  // 生成可编辑的简历App组件
  const generateEditableResumeApp = () => `
function App() {
  const [isEditMode, setIsEditMode] = useState(${isEditMode || false});
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  
  // 简历数据
  const [resumeData, setResumeData] = useState({
    name: '张三',
    title: '前端开发工程师',
    bio: '热爱技术，专注于前端开发和用户体验设计。拥有5年Web开发经验，熟悉React、Vue、Node.js等技术栈。',
    email: 'zhangsan@example.com',
    phone: '+86 138 0000 0000',
    location: '北京',
    github: 'https://github.com/zhangsan',
    linkedin: 'https://linkedin.com/in/zhangsan',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'Vue.js', 'GraphQL'],
    experience: [
      {
        company: '腾讯科技',
        position: '高级前端工程师',
        duration: '2021年3月 - 至今',
        description: '负责Web应用前端开发，参与架构设计，优化用户体验，提升页面性能。带领团队完成多个重要项目。'
      },
      {
        company: '阿里巴巴',
        position: '前端工程师',
        duration: '2019年6月 - 2021年2月',
        description: '参与电商平台前端架构设计和开发，负责组件库建设，优化构建流程。'
      }
    ],
    projects: [
      {
        title: '电商平台前端',
        description: '基于React的现代电商平台，支持移动端和桌面端',
        tech: ['React', 'TypeScript', 'Redux'],
        liveUrl: 'https://demo.example.com',
        githubUrl: 'https://github.com/example/project'
      },
      {
        title: '数据可视化平台',
        description: '企业级数据分析和可视化解决方案',
        tech: ['Vue.js', 'D3.js', 'Node.js'],
        liveUrl: 'https://viz.example.com'
      }
    ]
  });

  // 监听父窗口的编辑模式变化
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'toggleEditMode') {
        setIsEditMode(event.data.enabled);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 处理编辑开始
  const startEdit = (field, currentValue) => {
    if (!isEditMode) return;
    setEditingField(field);
    setTempValue(currentValue);
  };

  // 处理保存编辑
  const saveEdit = () => {
    if (!editingField) return;
    
    const fieldPath = editingField.split('.');
    let newData = { ...resumeData };
    
    if (fieldPath.length === 1) {
      newData[fieldPath[0]] = tempValue;
    } else if (fieldPath.length === 3 && fieldPath[0] === 'experience') {
      const index = parseInt(fieldPath[1]);
      newData.experience[index] = {
        ...newData.experience[index],
        [fieldPath[2]]: tempValue
      };
    } else if (fieldPath.length === 3 && fieldPath[0] === 'projects') {
      const index = parseInt(fieldPath[1]);
      newData.projects[index] = {
        ...newData.projects[index],
        [fieldPath[2]]: tempValue
      };
    }
    
    setResumeData(newData);
    setEditingField(null);
    setTempValue('');
    
    // 通知父窗口内容变化
    window.parent.postMessage({
      type: 'contentChange',
      field: editingField,
      value: tempValue
    }, '*');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  // 可编辑文本组件
  const EditableText = ({ field, value, multiline = false, className = '' }) => {
    const isEditing = editingField === field;
    const inputRef = useRef(null);
    
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    if (isEditing) {
      return multiline ? (
        <textarea
          ref={inputRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              saveEdit();
            } else if (e.key === 'Escape') {
              cancelEdit();
            }
          }}
          className={\`editing resize-none min-h-[80px] w-full \${className}\`}
          style={{ lineHeight: '1.5' }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveEdit();
            } else if (e.key === 'Escape') {
              cancelEdit();
            }
          }}
          className={\`editing w-full \${className}\`}
        />
      );
    }

    return (
      <span
        className={\`\${isEditMode ? 'editable-field cursor-pointer' : ''} \${className}\`}
        onClick={() => startEdit(field, value)}
        title={isEditMode ? '点击编辑' : ''}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto max-w-4xl p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* 编辑模式指示器 */}
          {isEditMode && (
            <div className="bg-blue-100 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="text-sm font-medium">🎨 编辑模式</span>
                <span className="text-xs">点击任意文本进行编辑</span>
              </div>
            </div>
          )}

          {/* 头部区域 */}
          <div className="text-center p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <EditableText
              field="name"
              value={resumeData.name}
              className="text-4xl font-bold mb-2 block"
            />
            <EditableText
              field="title"
              value={resumeData.title}
              className="text-xl mb-4 block"
            />
            <EditableText
              field="bio"
              value={resumeData.bio}
              multiline
              className="text-lg leading-relaxed max-w-2xl mx-auto block"
            />
            
            {/* 联系信息 */}
            <div className="flex justify-center gap-6 mt-6 text-sm">
              <EditableText field="email" value={resumeData.email} />
              <EditableText field="phone" value={resumeData.phone} />
              <EditableText field="location" value={resumeData.location} />
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* 技能部分 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">技能专长</h2>
              <div className="flex flex-wrap gap-3">
                {resumeData.skills.map((skill, index) => (
                  <EditableText
                    key={index}
                    field={\`skills.\${index}\`}
                    value={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm inline-block"
                  />
                ))}
              </div>
            </section>

            {/* 工作经历 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">工作经历</h2>
              <div className="space-y-6">
                {resumeData.experience.map((exp, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-l-4 border-blue-500 pl-6"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <EditableText
                        field={\`experience.\${index}.position\`}
                        value={exp.position}
                        className="text-xl font-semibold text-gray-900"
                      />
                      <EditableText
                        field={\`experience.\${index}.duration\`}
                        value={exp.duration}
                        className="text-sm text-gray-600"
                      />
                    </div>
                    <EditableText
                      field={\`experience.\${index}.company\`}
                      value={exp.company}
                      className="text-lg text-blue-600 mb-3 block"
                    />
                    <EditableText
                      field={\`experience.\${index}.description\`}
                      value={exp.description}
                      multiline
                      className="text-gray-700 leading-relaxed"
                    />
                  </motion.div>
                ))}
              </div>
            </section>

            {/* 项目经历 */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">项目经历</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {resumeData.projects.map((project, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-6"
                  >
                    <EditableText
                      field={\`projects.\${index}.title\`}
                      value={project.title}
                      className="text-lg font-semibold text-gray-900 mb-2 block"
                    />
                    <EditableText
                      field={\`projects.\${index}.description\`}
                      value={project.description}
                      multiline
                      className="text-gray-600 mb-4"
                    />
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tech.map((tech, techIndex) => (
                        <span key={techIndex} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex gap-4">
                      {project.liveUrl && (
                        <a 
                          href={project.liveUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          🔗 查看项目
                        </a>
                      )}
                      {project.githubUrl && (
                        <a 
                          href={project.githubUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          📁 源代码
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}`;

  // 生成默认App组件
  const generateDefaultApp = () => `
function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🎉 ${projectName}
        </h1>
        <p className="text-gray-600 mb-6">
          ${description || '基于React + TypeScript的现代应用'}
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCount(count + 1)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          点击次数: {count}
        </motion.button>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>✨ 支持实时编辑</p>
          <p>🎨 集成Tailwind CSS</p>
          <p>🚀 包含Framer Motion动画</p>
        </div>
      </motion.div>
    </div>
  );
}`;

  // 刷新预览
  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
    startContainer();
  };

  // 自动启动
  useEffect(() => {
    if (files.length > 0 && enableWebContainer) {
      startContainer();
    }
  }, [files, enableWebContainer, startContainer]);

  // 监听编辑模式变化
  useEffect(() => {
    if (iframeRef.current && previewUrl) {
      // 向iframe发送编辑模式变化消息
      iframeRef.current.contentWindow?.postMessage({
        type: 'toggleEditMode',
        enabled: isEditMode
      }, '*');
    }
  }, [isEditMode, previewUrl]);

  // 监听iframe消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'contentChange') {
        onContentChange?.(event.data.field, event.data.value);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onContentChange]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 预览工具栏 */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">实时预览</h3>
            <div className="flex items-center gap-2 text-xs">
              <StatusIndicator status={containerStatus} />
              {containerStatus === 'running' && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  运行中
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 设备切换 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((device) => (
              <button
                key={device}
                onClick={() => setDeviceType(device)}
                className={cn(
                  "p-2 rounded-md transition-all duration-200",
                  deviceType === device
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                )}
                title={device === 'desktop' ? '桌面端' : device === 'tablet' ? '平板端' : '移动端'}
              >
                {device === 'desktop' && <Monitor className="w-4 h-4" />}
                {device === 'tablet' && <Tablet className="w-4 h-4" />}
                {device === 'mobile' && <Smartphone className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* 操作按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
          >
            日志
          </Button>
        </div>
      </div>

      {/* 预览内容 */}
      <div className="flex-1 flex">
        {/* 主预览区域 */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
          <div
            className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
            style={{
              width: deviceSizes[deviceType].width,
              height: deviceSizes[deviceType].height,
              maxWidth: deviceType === 'desktop' ? '100%' : deviceSizes[deviceType].width,
              maxHeight: deviceType === 'desktop' ? '100%' : deviceSizes[deviceType].height
            }}
          >
            {previewUrl && containerStatus === 'running' ? (
              <iframe
                key={refreshKey}
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <PreviewPlaceholder status={containerStatus} />
              </div>
            )}
          </div>
        </div>

        {/* 构建日志侧边栏 */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-900 text-gray-100 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700">
                <h4 className="font-semibold">构建日志</h4>
              </div>
              <div className="p-4 text-sm font-mono space-y-1 overflow-y-auto">
                {buildLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {log}
                  </motion.div>
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
    idle: { color: 'text-gray-500', icon: '⚪', text: '待启动' },
    initializing: { color: 'text-blue-500', icon: '🔄', text: '初始化中' },
    installing: { color: 'text-yellow-500', icon: '📦', text: '安装依赖' },
    building: { color: 'text-orange-500', icon: '🏗️', text: '构建中' },
    running: { color: 'text-green-500', icon: '✅', text: '运行中' },
    error: { color: 'text-red-500', icon: '❌', text: '错误' }
  };

  const config = statusConfig[status];

  return (
    <span className={cn('flex items-center gap-1', config.color)}>
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </span>
  );
}

// 预览占位符组件
function PreviewPlaceholder({ status }: { status: ContainerStatus }) {
  if (status === 'error') {
    return (
      <div className="text-center text-red-600">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">预览启动失败</p>
        <p className="text-sm text-gray-600">请检查代码或重新启动</p>
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="inline-block mb-4"
      >
        <Sparkles className="w-12 h-12" />
      </motion.div>
      <p className="text-lg font-medium mb-2">
        {status === 'idle' ? '准备启动预览' : '正在启动预览...'}
      </p>
      <p className="text-sm">
        支持React、TypeScript、Tailwind CSS等现代技术栈
      </p>
    </div>
  );
}

export default WebContainerPreview; 