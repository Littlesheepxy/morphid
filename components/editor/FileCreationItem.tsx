'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, FileCode, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FileCreationItemProps {
  filename: string;
  status: 'pending' | 'creating' | 'created' | 'error';
  content: string;
  progress?: number;
  size?: number;
  onFileCreated?: () => void;
}

export function FileCreationItem({ 
  filename, 
  status, 
  content, 
  progress = 0,
  size = 0,
  onFileCreated 
}: FileCreationItemProps) {
  const [streamedContent, setStreamedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(progress);
  
  // 🔧 模拟流式文件创建
  useEffect(() => {
    if (status === 'creating' && content) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < content.length) {
          const chunkSize = Math.random() * 30 + 5; // 随机块大小 5-35
          const chunk = content.slice(currentIndex, currentIndex + chunkSize);
          setStreamedContent(prev => prev + chunk);
          
          const newProgress = Math.min(100, (currentIndex / content.length) * 100);
          setCurrentProgress(newProgress);
          currentIndex += chunkSize;
        } else {
          clearInterval(interval);
          setCurrentProgress(100);
          if (onFileCreated) {
            setTimeout(onFileCreated, 300); // 延迟一点显示完成状态
          }
        }
      }, 80); // 80ms 间隔，更平滑的流式效果
      
      return () => clearInterval(interval);
    } else if (status === 'created') {
      setStreamedContent(content);
      setCurrentProgress(100);
    }
  }, [status, content, onFileCreated]);
  
  // 同步外部传入的progress
  useEffect(() => {
    if (status === 'creating') {
      setCurrentProgress(progress);
    }
  }, [progress, status]);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'pending': 
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'creating': 
        return (
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <FileCode className="w-4 h-4 text-blue-500" />
          </motion.div>
        );
      case 'created': 
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': 
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'bg-gray-50 border-gray-200';
      case 'creating': return 'bg-blue-50 border-blue-200';
      case 'created': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
    }
  };
  
  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx': case 'jsx': return 'React';
      case 'ts': return 'TypeScript';
      case 'js': return 'JavaScript';
      case 'css': return 'CSS';
      case 'json': return 'JSON';
      case 'md': return 'Markdown';
      default: return 'Text';
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-3 transition-all duration-300 ${getStatusColor()}`}
    >
      {/* 文件头部信息 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm font-mono truncate" title={filename}>
            {filename}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {getLanguage(filename)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {(size > 0 || streamedContent.length > 0) && (
            <span className="text-xs text-gray-500">
              {formatFileSize(size || streamedContent.length)}
            </span>
          )}
          
          {streamedContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-6 w-6 p-0"
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </div>
      
      {/* 进度条 */}
      {status === 'creating' && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{status === 'creating' ? '创建中...' : '准备中...'}</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
      
      {/* 状态消息 */}
      {status === 'created' && (
        <div className="text-xs text-green-600 mb-1">
          ✓ 文件创建完成
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-xs text-red-600 mb-1">
          ✗ 创建失败
        </div>
      )}
      
      {/* 流式内容预览 */}
      <AnimatePresence>
        {showPreview && streamedContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2 bg-gray-900 rounded text-xs font-mono text-green-400 max-h-32 overflow-auto"
          >
            <div className="whitespace-pre-wrap">
              {status === 'creating' ? (
                <>
                  {streamedContent}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="bg-green-400 text-gray-900 px-0.5"
                  >
                    |
                  </motion.span>
                </>
              ) : (
                streamedContent.slice(0, 500) + (streamedContent.length > 500 ? '\n...' : '')
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 