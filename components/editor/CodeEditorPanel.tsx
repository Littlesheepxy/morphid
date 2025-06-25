'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileCode, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileTree, FileTreeNode } from './FileTree';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/contexts/theme-context';

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
  editable?: boolean;
}

interface CodeEditorPanelProps {
  files: CodeFile[];
  onFileUpdate: (filename: string, content: string) => void;
  onFileAdd?: (file: CodeFile) => void;
  onFileDelete?: (filename: string) => void;
}

export function CodeEditorPanel({
  files,
  onFileUpdate,
  onFileAdd,
  onFileDelete
}: CodeEditorPanelProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.filename || '');
  const { theme } = useTheme();
  
  // 将CodeFile数组转换为FileTreeNode结构
  const treeData = useMemo((): FileTreeNode[] => {
    // 按文件夹分组
    const folders: { [key: string]: FileTreeNode[] } = {};
    const rootFiles: FileTreeNode[] = [];
    
    files.forEach(file => {
      const parts = file.filename.split('/');
      if (parts.length === 1) {
        // 根目录文件
        rootFiles.push({
          id: file.filename,
          name: file.filename,
          type: 'file',
          language: file.language,
          fileType: file.type,
          content: file.content
        });
      } else {
        // 文件夹中的文件
        const folderName = parts[0];
        if (!folders[folderName]) {
          folders[folderName] = [];
        }
        folders[folderName].push({
          id: file.filename,
          name: parts.slice(1).join('/'),
          type: 'file',
          language: file.language,
          fileType: file.type,
          content: file.content
        });
      }
    });
    
    // 构建树结构
    const result: FileTreeNode[] = [];
    
    // 添加文件夹
    Object.entries(folders).forEach(([folderName, folderFiles]) => {
      result.push({
        id: folderName,
        name: folderName,
        type: 'folder',
        children: folderFiles
      });
    });
    
    // 添加根文件
    result.push(...rootFiles);
    
    return result;
  }, [files]);

  // 获取当前选中的文件
  const currentFile = useMemo(() => {
    return files.find(file => file.filename === selectedFileId);
  }, [files, selectedFileId]);

  // 处理文件选择
  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  // 处理代码编辑
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (currentFile && value !== undefined) {
      onFileUpdate(currentFile.filename, value);
    }
  }, [currentFile, onFileUpdate]);

  // 获取Monaco编辑器语言
  const getMonacoLanguage = (filename: string, language: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) return 'typescript';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.scss')) return 'scss';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    return language.toLowerCase();
  };

  // 获取文件类型颜色
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
          <FileCode className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">暂无代码文件</p>
          {onFileAdd && (
            <button
              onClick={() => onFileAdd({
                filename: 'App.tsx',
                content: 'import React from "react";\n\nfunction App() {\n  return (\n    <div>\n      <h1>Hello World!</h1>\n    </div>\n  );\n}\n\nexport default App;',
                language: 'typescript',
                type: 'component'
              })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              添加文件
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      {/* 左侧文件树 */}
      <div className="w-80 flex-shrink-0">
        <FileTree
          data={treeData}
          selectedFileId={selectedFileId}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* 右侧代码编辑器 */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {currentFile && (
            <motion.div
              key={selectedFileId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1.5 py-0.5", getFileTypeColor(currentFile.type))}
                    >
                      {currentFile.type}
                    </Badge>
                  </div>
                  {currentFile.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentFile.description}</p>
                  )}
                </div>

                {/* 删除按钮 */}
                {onFileDelete && files.length > 1 && (
                  <button
                    onClick={() => onFileDelete(currentFile.filename)}
                    className="p-2 hover:bg-red-100 rounded text-red-500 transition-colors"
                    title="删除文件"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Monaco 编辑器 */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={getMonacoLanguage(currentFile.filename, currentFile.language)}
                  value={currentFile.content}
                  onChange={handleCodeChange}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    insertSpaces: true,
                    wordWrap: 'on',
                    folding: true,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    renderLineHighlight: 'line',
                    selectOnLineNumbers: true,
                    matchBrackets: 'always',
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    quickSuggestions: true,
                    parameterHints: { enabled: true },
                    hover: { enabled: true }
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">加载编辑器中...</div>
                    </div>
                  }
                />
              </div>

              {/* 状态栏 */}
              <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-4">
                  <span>行 {currentFile.content.split('\n').length}</span>
                  <span>字符 {currentFile.content.length}</span>
                  <span>{getMonacoLanguage(currentFile.filename, currentFile.language)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">● 已保存</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CodeEditorPanel; 