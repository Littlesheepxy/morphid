'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image, FileText, Video, Music, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileWithProgress {
  file: File;
  progress: number;
  id: string;
  preview?: string;
}

interface FileDropzoneProps {
  onFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string[];
  className?: string;
  disabled?: boolean;
}

// 文件类型图标映射
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.startsWith('text/') || fileType.includes('document')) return FileText;
  if (fileType.includes('zip') || fileType.includes('rar')) return Archive;
  return File;
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileDropzone({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = [],
  className,
  disabled = false
}: FileDropzoneProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => {
      const updated = [...prev, ...newFiles].slice(0, maxFiles);
      onFilesChange?.(updated.map(f => f.file));
      return updated;
    });

    // 模拟上传进度
    newFiles.forEach((fileWithProgress, index) => {
      simulateUpload(fileWithProgress.id);
    });
  }, [maxFiles, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.length > 0 ? accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : undefined,
    maxSize,
    maxFiles,
    disabled,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false)
  });

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ));
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesChange?.(updated.map(f => f.file));
      return updated;
    });
  };

  return (
    <div className={cn("w-full", className)}>
      {/* 拖拽区域 */}
      <div
        {...getRootProps()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer overflow-hidden",
          "min-h-[200px] flex flex-col items-center justify-center p-8",
          isDragActive || isDragOver
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
            : isHovered
            ? "border-emerald-400 bg-emerald-25 dark:bg-emerald-950/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {/* 蒙版覆盖层 */}
        <AnimatePresence>
          {(isHovered || isDragActive) && !disabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm z-10"
            />
          )}
        </AnimatePresence>

        {/* 内容区域 */}
        <div className="relative z-20 text-center">
          <motion.div
            animate={{ 
              scale: isDragActive ? 1.1 : isHovered ? 1.05 : 1,
              rotate: isDragActive ? 5 : 0 
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Upload className={cn(
              "mx-auto mb-4 transition-colors",
              isDragActive || isDragOver
                ? "text-emerald-500 w-12 h-12"
                : "text-gray-400 dark:text-gray-500 w-10 h-10"
            )} />
          </motion.div>
          
          <div className="space-y-2">
            <p className={cn(
              "font-medium transition-colors",
              isDragActive || isDragOver
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-700 dark:text-gray-300"
            )}>
              {isDragActive ? '释放文件到这里' : '拖拽文件到这里'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              或点击选择文件
            </p>
            {maxFiles > 1 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                最多可上传 {maxFiles} 个文件，单个文件不超过 {formatFileSize(maxSize)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            {files.map((fileWithProgress) => {
              const FileIcon = getFileIcon(fileWithProgress.file.type);
              const isCompleted = fileWithProgress.progress >= 100;
              
              return (
                <motion.div
                  key={fileWithProgress.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {/* 文件图标或预览 */}
                  <div className="flex-shrink-0">
                    {fileWithProgress.preview ? (
                      <img
                        src={fileWithProgress.preview}
                        alt={fileWithProgress.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <FileIcon className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {fileWithProgress.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileWithProgress.file.size)}
                    </p>
                    
                    {/* 进度条 */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <motion.div
                          className={cn(
                            "h-1.5 rounded-full transition-colors",
                            isCompleted
                              ? "bg-emerald-500"
                              : "bg-blue-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${fileWithProgress.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {isCompleted ? '上传完成' : `${Math.round(fileWithProgress.progress)}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeFile(fileWithProgress.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 