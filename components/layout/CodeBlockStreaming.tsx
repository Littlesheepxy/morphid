'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Eye, Code2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeFile {
  filename: string;
  content: string;
  language: string;
  description?: string;
  type: 'page' | 'component' | 'styles' | 'config';
}

interface CodeBlockStreamingProps {
  files: CodeFile[];
  isStreaming?: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
}

export function CodeBlockStreaming({ 
  files, 
  isStreaming = false, 
  onPreview, 
  onDownload 
}: CodeBlockStreamingProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const currentFile = files[activeFileIndex];

  // 流式显示效果
  useEffect(() => {
    if (isStreaming && currentFile) {
      const lines = currentFile.content.split('\n');
      let lineIndex = 0;

      const timer = setInterval(() => {
        if (lineIndex >= lines.length) {
          clearInterval(timer);
          return;
        }
        setVisibleLines(lineIndex + 1);
        lineIndex++;
      }, 50); // 每50ms显示一行

      return () => clearInterval(timer);
    } else if (currentFile) {
      setVisibleLines(currentFile.content.split('\n').length);
    }
  }, [currentFile, isStreaming]);

  // 复制代码到剪贴板
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
    if (filename.endsWith('.css')) return '🎨';
    if (filename.endsWith('.js')) return '🟨';
    if (filename.endsWith('.json')) return '📋';
    return '📄';
  };

  // 获取文件类型徽章颜色
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'page': return 'bg-blue-100 text-blue-800';
      case 'component': return 'bg-green-100 text-green-800';
      case 'styles': return 'bg-purple-100 text-purple-800';
      case 'config': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!files || files.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center text-gray-500">
          <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无代码文件</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            生成的代码文件
          </CardTitle>
          <div className="flex gap-2">
            {onPreview && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
            )}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            )}
          </div>
        </div>

        {/* 文件标签页 */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => setActiveFileIndex(index)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                index === activeFileIndex
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{getLanguageIcon(file.filename)}</span>
              <span className="font-medium">{file.filename}</span>
              <Badge className={`text-xs ${getTypeBadgeColor(file.type)}`}>
                {file.type}
              </Badge>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {currentFile && (
            <motion.div
              key={activeFileIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 文件信息 */}
              <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{currentFile.filename}</h3>
                  {currentFile.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentFile.description}</p>
                  )}
                </div>
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

              {/* 代码内容 */}
              <div className="relative">
                <pre className="p-6 text-sm overflow-x-auto bg-gray-900 text-gray-100 min-h-[400px] max-h-[600px] overflow-y-auto">
                  <code className="block">
                    {isStreaming ? (
                      <StreamingCodeDisplay 
                        content={currentFile.content}
                        visibleLines={visibleLines}
                      />
                    ) : (
                      <SyntaxHighlighter content={currentFile.content} language={currentFile.language} />
                    )}
                  </code>
                </pre>

                {/* 流式显示指示器 */}
                {isStreaming && visibleLines < currentFile.content.split('\n').length && (
                  <div className="absolute bottom-4 right-4">
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                    >
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      正在生成...
                    </motion.div>
                  </div>
                )}

                {/* 完成指示器 */}
                {!isStreaming && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <FileText className="w-3 h-3 mr-1" />
                      {currentFile.content.split('\n').length} 行
                    </Badge>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// 流式代码显示组件
function StreamingCodeDisplay({ content, visibleLines }: { content: string; visibleLines: number }) {
  const lines = content.split('\n');
  const visibleContent = lines.slice(0, visibleLines).join('\n');

  return (
    <>
      <SyntaxHighlighter content={visibleContent} language="typescript" />
      {visibleLines < lines.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-5 bg-green-400 ml-1"
        />
      )}
    </>
  );
}

// 简单的语法高亮组件
function SyntaxHighlighter({ content, language }: { content: string; language: string }) {
  // 这里可以集成真正的语法高亮库，比如 Prism.js 或 highlight.js
  // 现在先用简单的颜色高亮
  const highlightedContent = content
    .replace(/(import|export|from|default|const|let|var|function|return|if|else|for|while|class|interface|type)/g, 
             '<span style="color: #569CD6;">$1</span>')
    .replace(/('.*?'|".*?")/g, '<span style="color: #CE9178;">$1</span>')
    .replace(/(\/\/.*$)/gm, '<span style="color: #6A9955;">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6A9955;">$1</span>')
    .replace(/(\{|\}|\[|\]|\(|\))/g, '<span style="color: #FFD700;">$1</span>');

  return <div dangerouslySetInnerHTML={{ __html: highlightedContent }} />;
}

export default CodeBlockStreaming; 