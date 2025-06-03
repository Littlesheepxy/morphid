'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, 
  FileText, 
  Plus,
  X,
  Edit3,
  Code2,
  Folder,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
  editable?: boolean;
}

export type EditMode = 'view' | 'edit';

interface CodeEditorPanelProps {
  files: CodeFile[];
  activeFileIndex: number;
  editMode: EditMode;
  onActiveFileChange: (index: number) => void;
  onFileUpdate: (filename: string, content: string) => void;
  onFileAdd?: (file: CodeFile) => void;
  onFileDelete?: (index: number) => void;
}

export function CodeEditorPanel({
  files,
  activeFileIndex,
  editMode,
  onActiveFileChange,
  onFileUpdate,
  onFileAdd,
  onFileDelete
}: CodeEditorPanelProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isContentEditableActive, setIsContentEditableActive] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  
  const currentFile = files[activeFileIndex];

  // ContentEditable处理
  const handleContentEditableChange = useCallback(() => {
    if (contentEditableRef.current && currentFile) {
      const newContent = contentEditableRef.current.textContent || '';
      onFileUpdate(currentFile.filename, newContent);
    }
  }, [currentFile, onFileUpdate]);

  // 激活ContentEditable编辑
  const activateContentEditable = () => {
    setIsContentEditableActive(true);
    setTimeout(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.focus();
        // 将光标置于末尾
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, 100);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setIsContentEditableActive(false);
        handleContentEditableChange();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsContentEditableActive(false);
        // 重置内容
        if (contentEditableRef.current && currentFile) {
          contentEditableRef.current.textContent = currentFile.content;
        }
      }
    }
  };

  // 复制代码
  const copyToClipboard = async (content: string, filename: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(filename);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 获取语言图标
  const getLanguageIcon = (filename: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return '⚛️';
    if (filename.endsWith('.css') || filename.endsWith('.scss')) return '🎨';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return '🟨';
    if (filename.endsWith('.json')) return '📋';
    if (filename.endsWith('.md')) return '📝';
    return '📄';
  };

  // 获取文件类型样式
  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'component': return 'bg-green-100 text-green-800 border-green-200';
      case 'page': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'styles': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'config': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'data': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!files || files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Folder className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">暂无代码文件</p>
          {onFileAdd && (
            <Button variant="outline" onClick={() => onFileAdd({
              filename: 'App.tsx',
              content: 'import React from "react";\n\nfunction App() {\n  return (\n    <div>\n      <h1>Hello World!</h1>\n    </div>\n  );\n}\n\nexport default App;',
              language: 'typescript',
              type: 'component'
            })}>
              <Plus className="w-4 h-4 mr-2" />
              添加文件
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 文件标签页 */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b overflow-x-auto">
        <div className="flex gap-1 min-w-0 flex-1">
          {files.map((file, index) => (
            <motion.button
              key={index}
              onClick={() => onActiveFileChange(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-all duration-200 min-w-0",
                index === activeFileIndex
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-base">{getLanguageIcon(file.filename)}</span>
              <span className="font-medium truncate max-w-[120px]">{file.filename}</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs px-1.5 py-0.5", getFileTypeColor(file.type))}
              >
                {file.type}
              </Badge>
              
              {/* 删除按钮 */}
              {onFileDelete && files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(index);
                  }}
                  className="ml-1 p-0.5 hover:bg-red-100 rounded text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.button>
          ))}
        </div>

        {/* 添加文件按钮 */}
        {onFileAdd && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileAdd({
              filename: 'NewFile.tsx',
              content: '',
              language: 'typescript',
              type: 'component'
            })}
            className="ml-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 文件内容区域 */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {currentFile && (
            <motion.div
              key={activeFileIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {/* 文件信息栏 */}
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">{currentFile.filename}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {currentFile.language}
                    </Badge>
                  </div>
                  {currentFile.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentFile.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* 编辑按钮 */}
                  {editMode === 'edit' && !isContentEditableActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={activateContentEditable}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      编辑
                    </Button>
                  )}

                  {/* 复制按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(currentFile.content, currentFile.filename)}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess === currentFile.filename ? '已复制!' : '复制'}
                  </Button>
                </div>
              </div>

              {/* 代码内容 */}
              <div className="flex-1 relative">
                {editMode === 'edit' && isContentEditableActive ? (
                  /* ContentEditable 编辑模式 */
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    onInput={handleContentEditableChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      setIsContentEditableActive(false);
                      handleContentEditableChange();
                    }}
                    className="p-6 text-sm font-mono leading-relaxed outline-none bg-white border-2 border-blue-200 min-h-full whitespace-pre-wrap"
                    style={{
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      tabSize: 2
                    }}
                    suppressContentEditableWarning={true}
                  >
                    {currentFile.content}
                  </div>
                ) : (
                  /* 只读代码显示 */
                  <pre className="p-6 text-sm overflow-auto bg-gray-900 text-gray-100 min-h-full font-mono leading-relaxed">
                    <code>
                      <SyntaxHighlighter 
                        content={currentFile.content} 
                        language={currentFile.language} 
                      />
                    </code>
                  </pre>
                )}

                {/* 编辑提示 */}
                {editMode === 'edit' && isContentEditableActive && (
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-3 h-3" />
                        <span>编辑模式</span>
                      </div>
                      <div className="mt-1 text-blue-200">
                        Cmd+Enter 保存 • Esc 取消
                      </div>
                    </div>
                  </div>
                )}

                {/* 行数指示器 */}
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                    <FileText className="w-3 h-3 mr-1" />
                    {currentFile.content.split('\n').length} 行
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 简单语法高亮组件
function SyntaxHighlighter({ content, language }: { content: string; language: string }) {
  const highlightedContent = content
    // 关键字
    .replace(/(import|export|from|default|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements)/g, 
             '<span style="color: #569CD6;">$1</span>')
    // 字符串
    .replace(/('.*?'|".*?"|`.*?`)/g, '<span style="color: #CE9178;">$1</span>')
    // 注释
    .replace(/(\/\/.*$)/gm, '<span style="color: #6A9955;">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6A9955;">$1</span>')
    // 符号
    .replace(/(\{|\}|\[|\]|\(|\))/g, '<span style="color: #FFD700;">$1</span>')
    // JSX标签
    .replace(/(<\/?[a-zA-Z][^>]*>)/g, '<span style="color: #4EC9B0;">$1</span>');

  return <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />;
}

export default CodeEditorPanel; 