'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Code2, 
  Download, 
  ExternalLink,
  RefreshCw,
  Monitor,
  Smartphone,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Copy,
  Play,
  Edit3,
  Save,
  X,
  Check,
  Sparkles,
  Zap,
  Settings,
  Share2,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';
import WebContainerPreview from './WebContainerPreview';
import { CodeEditorPanel } from './CodeEditorPanel';
import { Separator } from '@/components/ui/separator';

// 代码文件接口
interface CodeFile {
  filename: string;
  content: string;
  language: string;
  description?: string;
  type: 'page' | 'component' | 'styles' | 'config' | 'data';
}

// 预览数据接口
interface PreviewData {
  files: CodeFile[];
  projectName: string;
  description?: string;
  dependencies?: Record<string, string>;
}

interface CodePreviewToggleProps {
  files: CodeFile[];
  isStreaming?: boolean;
  previewData?: PreviewData;
  onDownload?: () => void;
  onDeploy?: () => void;
  onEditCode?: (filename: string) => void;
  onSendMessage?: (message: string, options?: any) => void;
}

type ViewMode = 'code' | 'preview';
type DeviceType = 'desktop' | 'mobile';
type EditMode = 'none' | 'text' | 'ai';

// 语法高亮函数
const highlightCode = (code: string, language: string) => {
  const keywords = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'interface', 'type', 'class', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'async', 'await', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'null', 'undefined', 'true', 'false'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'class', 'extends', 'async', 'await', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'null', 'undefined', 'true', 'false'],
    jsx: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'class', 'extends', 'async', 'await', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'null', 'undefined', 'true', 'false'],
    tsx: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'interface', 'type', 'class', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'async', 'await', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'null', 'undefined', 'true', 'false'],
    css: ['color', 'background', 'margin', 'padding', 'border', 'width', 'height', 'display', 'position', 'top', 'left', 'right', 'bottom', 'flex', 'grid', 'font', 'text', 'transform', 'transition', 'animation'],
    json: ['true', 'false', 'null']
  };

  const langKeywords = keywords[language as keyof typeof keywords] || [];
  
  let highlightedCode = code;
  
  // 预处理 - 转义HTML实体
  highlightedCode = highlightedCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 高亮字符串（使用 VS Code 绿色）
  highlightedCode = highlightedCode.replace(
    /(["'`])(?:(?=(\\?))\2.)*?\1/g,
    '<span style="color: #ce9178;">$&</span>'
  );
  
  // 高亮模板字符串
  highlightedCode = highlightedCode.replace(
    /(`[^`]*`)/g,
    '<span style="color: #ce9178;">$&</span>'
  );
  
  // 高亮注释（使用 VS Code 注释绿色）
  highlightedCode = highlightedCode.replace(
    /(\/\/.*$)/gm,
    '<span style="color: #6a9955; font-style: italic;">$&</span>'
  );
  highlightedCode = highlightedCode.replace(
    /(\/\*[\s\S]*?\*\/)/g,
    '<span style="color: #6a9955; font-style: italic;">$&</span>'
  );
  
  // 高亮关键字（使用 VS Code 蓝色）
  langKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlightedCode = highlightedCode.replace(
      regex,
      `<span style="color: #569cd6; font-weight: 500;">${keyword}</span>`
    );
  });
  
  // 高亮数字（使用 VS Code 浅绿色）
  highlightedCode = highlightedCode.replace(
    /\b\d+\.?\d*\b/g,
    '<span style="color: #b5cea8;">$&</span>'
  );

  // 高亮函数调用（黄色）
  highlightedCode = highlightedCode.replace(
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    '<span style="color: #dcdcaa;">$1</span>'
  );

  // JSX/TSX 特殊处理
  if (language === 'jsx' || language === 'tsx') {
    // 高亮JSX标签（红色）
    highlightedCode = highlightedCode.replace(
      /(&lt;\/?)([\w-]+)/g,
      '$1<span style="color: #f44747;">$2</span>'
    );
    
    // 高亮JSX属性（浅蓝色）
    highlightedCode = highlightedCode.replace(
      /(\w+)(?==)/g,
      '<span style="color: #9cdcfe;">$1</span>'
    );

    // 高亮JSX花括号
    highlightedCode = highlightedCode.replace(
      /[{}]/g,
      '<span style="color: #d4d4aa;">$&</span>'
    );
  }

  // CSS 特殊处理
  if (language === 'css') {
    // 高亮CSS属性（浅蓝色）
    highlightedCode = highlightedCode.replace(
      /([a-zA-Z-]+)(?=\s*:)/g,
      '<span style="color: #9cdcfe;">$1</span>'
    );
    
    // 高亮CSS值
    highlightedCode = highlightedCode.replace(
      /:\s*([^;]+);?/g,
      ': <span style="color: #ce9178;">$1</span>;'
    );
  }

  // 高亮类型注解（TypeScript）
  if (language === 'typescript' || language === 'tsx') {
    highlightedCode = highlightedCode.replace(
      /:\s*([A-Z][a-zA-Z0-9<>[\]|&]*)/g,
      ': <span style="color: #4ec9b0;">$1</span>'
    );
  }

  return highlightedCode;
};

// 文件树组件
const FileTree: React.FC<{
  files: CodeFile[];
  activeFile: string;
  onFileSelect: (filename: string) => void;
}> = ({ files, activeFile, onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components', 'styles']));

  // 组织文件结构
  const fileStructure = React.useMemo(() => {
    const structure: any = {};
    
    files.forEach(file => {
      const parts = file.filename.split('/');
      let current = structure;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // 这是文件
          current[part] = file;
        } else {
          // 这是文件夹
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    });
    
    return structure;
  }, [files]);

  const renderFileTree = (structure: any, prefix = '') => {
    return Object.keys(structure).map(key => {
      const item = structure[key];
      const fullPath = prefix ? `${prefix}/${key}` : key;
      
      if (item.filename) {
        // 这是文件
        const isActive = activeFile === item.filename;
        return (
          <motion.div
            key={item.filename}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer rounded-md mx-2 transition-all duration-200 file-tree-item",
              isActive 
                ? "bg-blue-600 text-white shadow-md" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
            onClick={() => onFileSelect(item.filename)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{key}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-auto text-xs font-mono",
                isActive ? "bg-blue-500 text-white" : "bg-gray-600 text-gray-300"
              )}
            >
              {item.language}
            </Badge>
          </motion.div>
        );
      } else {
        // 这是文件夹
        const isExpanded = expandedFolders.has(fullPath);
        
        return (
          <div key={fullPath}>
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer rounded-md mx-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors file-tree-item"
              onClick={() => {
                const newExpanded = new Set(expandedFolders);
                if (isExpanded) {
                  newExpanded.delete(fullPath);
                } else {
                  newExpanded.add(fullPath);
                }
                setExpandedFolders(newExpanded);
              }}
              whileHover={{ x: 2 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-yellow-500" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-500" />
              )}
              <span className="font-medium">{key}</span>
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-4"
                >
                  {renderFileTree(item, fullPath)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }
    });
  };

  return (
    <div className="space-y-1 py-2">
      {renderFileTree(fileStructure)}
    </div>
  );
};

// 代码查看器组件
const CodeViewer: React.FC<{
  file: CodeFile;
}> = ({ file }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 分割代码为行
  const codeLines = file.content.split('\n');
  
  return (
    <div className="h-full flex flex-col bg-vscode-bg">
      {/* 文件标签栏 - VS Code 风格 */}
      <div className="flex items-center bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center px-4 py-2 bg-vscode-panel border-r border-vscode-border text-vscode-text">
          <FileText className="w-4 h-4 mr-2" />
          <span className="text-sm">{file.filename}</span>
          <div className="ml-2 w-2 h-2 rounded-full bg-orange-500"></div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex items-center gap-2 text-vscode-text">
            <Badge variant="secondary" className="bg-vscode-panel text-vscode-text text-xs border border-vscode-border">
              {file.language.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-400">{file.description}</span>
          </div>
        </div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-vscode-text hover:text-white hover:bg-vscode-panel transition-colors border border-transparent hover:border-vscode-border"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? '已复制' : '复制代码'}
          </Button>
        </motion.div>
      </div>

      {/* 代码内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* 行号区域 */}
          <div className="bg-vscode-sidebar border-r border-vscode-border text-gray-500 text-sm font-mono select-none">
            <div className="px-4 py-4 space-y-0 leading-6">
              {codeLines.map((_, index) => (
                <div 
                  key={index} 
                  className="text-right hover:text-gray-300 transition-colors cursor-pointer code-line-number"
                  style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}
                >
                  {String(index + 1).padStart(String(codeLines.length).length, ' ')}
                </div>
              ))}
            </div>
          </div>

          {/* 代码内容区域 */}
          <div className="flex-1 overflow-auto bg-vscode-bg vscode-scrollbar">
            <div className="relative">
              <pre 
                className="text-sm font-mono text-vscode-text p-4 min-h-full leading-6 code-editor"
                style={{ 
                  fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, Courier New, monospace',
                  tabSize: 2
                }}
              >
                {codeLines.map((line, index) => (
                  <div 
                    key={index}
                    className="code-line"
                    style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(line, file.language)
                    }}
                  />
                ))}
              </pre>
              
              {/* 滚动指示器 */}
              <div className="absolute top-0 right-0 w-3 bg-gradient-to-b from-vscode-bg via-transparent to-vscode-bg pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="px-4 py-2 bg-vscode-panel border-t border-vscode-border flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>{file.language.toUpperCase()}</span>
          <span>{codeLines.length} 行</span>
          <span>{file.content.length} 字符</span>
        </div>
        <div className="flex items-center gap-2">
          <span>空格: 2</span>
          <span className="flex items-center gap-1">
            就绪
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </span>
        </div>
      </div>
    </div>
  );
};

export function CodePreviewToggle({
  files,
  isStreaming = false,
  previewData,
  onDownload,
  onDeploy,
  onEditCode,
  onSendMessage
}: CodePreviewToggleProps) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [activeFile, setActiveFile] = useState(files[0]?.filename || '');
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const currentFile = files.find(f => f.filename === activeFile);

  const handleContentChange = (field: string, value: string) => {
    // 处理内容变化
    console.log('Content changed:', field, value);
    
    // 如果是可视化编辑请求，发送到聊天系统
    if (field === 'visual_edit_request' && onSendMessage) {
      onSendMessage(value, { 
        type: 'visual_edit',
        context: 'stagewise'
      });
    }
  };

  const handlePreviewReady = (url: string) => {
    setPreviewUrl(url);
  };

  // 编辑模式配置
  const editModes = [
    { 
      key: 'none' as EditMode, 
      label: '查看', 
      icon: Eye, 
      description: '只读模式',
      color: 'gray'
    },
    { 
      key: 'text' as EditMode, 
      label: '文本编辑', 
      icon: Edit3, 
      description: '直接编辑代码',
      color: 'blue'
    },
    { 
      key: 'ai' as EditMode, 
      label: 'AI设计', 
      icon: Wand2, 
      description: '可视化AI编辑',
      color: 'purple'
    }
  ];

  const getFileIcon = (filename: string, type: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return <FileText className="w-4 h-4" />;
    if (filename.endsWith('.css')) return <FileText className="w-4 h-4" />;
    if (filename.endsWith('.json')) return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const deviceConfigs = {
    desktop: { width: '100%', height: '100%', label: '桌面' },
    mobile: { width: '375px', height: '667px', label: '手机' }
  };

  if (!files || files.length === 0) {
    return (
      <Card className={`w-full h-full flex items-center justify-center transition-all duration-300 ${
        theme === "light" 
          ? "bg-white/80 border-emerald-100/60 backdrop-blur-xl" 
          : "bg-gray-800/80 border-emerald-700/30 backdrop-blur-xl"
      }`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-brand-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-brand animate-brand-breathe">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <p className={`text-lg font-medium ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
            等待代码生成中...
          </p>
        </motion.div>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 🎨 顶部工具栏 - 品牌设计升级 */}
      <motion.div 
        className={`flex items-center justify-between px-4 py-2 border-b transition-all duration-300 ${
          theme === "light" 
            ? "bg-white/90 border-emerald-100/60 backdrop-blur-xl" 
            : "bg-gray-900/90 border-emerald-700/30 backdrop-blur-xl"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 左侧：视图切换 */}
        <div className="flex items-center gap-2">
          <motion.div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['preview', 'code'] as ViewMode[]).map((mode) => (
              <motion.button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  viewMode === mode
                    ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {mode === 'preview' ? <Eye className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                {mode === 'preview' ? '预览' : '代码'}
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* 右侧：编辑模式和设备切换 */}
        {viewMode === 'preview' && (
          <div className="flex items-center gap-3">
            {/* 编辑模式切换 */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <motion.button
                onClick={() => setEditMode('none')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  editMode === 'none'
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Eye className="w-4 h-4" />
                预览
              </motion.button>
              
              <motion.button
                onClick={() => setEditMode('text')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  editMode === 'text'
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Edit3 className="w-4 h-4" />
                文本编辑
              </motion.button>
              
              <motion.button
                onClick={() => setEditMode('ai')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                  editMode === 'ai'
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Wand2 className="w-4 h-4" />
                AI设计
                {editMode === 'ai' && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.button>
            </div>

            {/* 设备切换 */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {Object.entries(deviceConfigs).map(([key, config]) => (
                <motion.button
                  key={key}
                  onClick={() => setDeviceType(key as DeviceType)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    deviceType === key
                      ? "bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {key === 'desktop' && <Monitor className="w-3 h-3" />}
                  {key === 'mobile' && <Smartphone className="w-3 h-3" />}
                  {config.label}
                </motion.button>
              ))}
            </div>

            {/* 刷新按钮 */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className={`rounded-xl border-2 transition-all duration-300 ${
                  theme === "light"
                    ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                    : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        )}

        {/* 代码模式下的编辑提示 */}
        {viewMode === 'code' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Edit3 className="w-3 h-3 mr-1" />
              文本编辑模式
            </Badge>
          </div>
        )}

        {/* AI设计模式使用说明 */}
        {editMode === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  🎯 AI设计模式已激活
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span><strong>选择元素</strong>：点击预览中的任意元素（按钮、文本、图片等）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    <span><strong>描述需求</strong>：在弹出的输入框中描述你想要的修改</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span><strong>AI自动修改</strong>：AI将分析元素上下文并生成相应代码</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">💡 示例操作</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    "把这个按钮改成绿色" • "增加一个联系方式输入框" • "让标题更大一些"
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* 🎨 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'preview' ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WebContainerPreview
                files={files}
                projectName={previewData?.projectName || '项目预览'}
                description={previewData?.description}
                isLoading={false}
                previewUrl={previewUrl}
                enableWebContainer={true}
                onPreviewReady={handlePreviewReady}
                onLoadingChange={(loading) => console.log('Loading:', loading)}
                isEditMode={editMode === 'ai'}
                onContentChange={handleContentChange}
                deviceType={deviceType}
                editMode={editMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {/* 🎨 新版代码编辑器 */}
              <CodeEditorPanel
                files={files.map(file => ({
                  ...file,
                  editable: true
                }))}
                onFileUpdate={(filename, content) => {
                  // 这里可以添加文件更新逻辑
                  console.log('File updated:', filename, content);
                }}
                onFileAdd={(file) => {
                  // 这里可以添加文件添加逻辑
                  console.log('File added:', file);
                }}
                onFileDelete={(filename) => {
                  // 这里可以添加文件删除逻辑
                  console.log('File deleted:', filename);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🎨 底部操作栏 */}
      <motion.div 
        className={`flex items-center justify-between p-4 border-t transition-all duration-300 ${
          theme === "light" 
            ? "bg-white/90 border-emerald-100/60 backdrop-blur-xl" 
            : "bg-gray-900/90 border-emerald-700/30 backdrop-blur-xl"
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Badge className={`rounded-full ${
            theme === "light" 
              ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
              : "bg-emerald-900/30 text-emerald-400 border-emerald-700"
          }`}>
            {files.length} 个文件
          </Badge>
          
          {/* 编辑模式状态指示器 */}
          {editMode !== 'none' && (
            <Badge className={`rounded-full ${
              editMode === 'ai' 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                : editMode === 'text'
                  ? "bg-blue-500 text-white"
                  : "bg-gray-500 text-white"
            }`}>
              {editMode === 'ai' && <Wand2 className="w-3 h-3 mr-1" />}
              {editMode === 'text' && <Edit3 className="w-3 h-3 mr-1" />}
              {editMode === 'ai' ? 'AI设计中' : editMode === 'text' ? '文本编辑中' : '编辑中'}
            </Badge>
          )}
          
          {isStreaming && (
            <Badge className="rounded-full bg-brand-gradient text-white animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              生成中...
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className={`rounded-xl border-2 transition-all duration-300 ${
                theme === "light"
                  ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={onDeploy}
              className="rounded-xl text-white font-medium transition-all duration-300 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              部署
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default CodePreviewToggle; 