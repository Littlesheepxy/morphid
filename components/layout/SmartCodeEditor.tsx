'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Eye, 
  Edit3, 
  Play, 
  Download, 
  RefreshCw,
  Copy,
  Save,
  Wand2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 导入WebContainer相关组件
import WebContainerPreview from './WebContainerPreview';
import CodeEditorPanel from './CodeEditorPanel';
import SmartToggleBar from './SmartToggleBar';

export interface CodeFile {
  filename: string;
  content: string;
  language: string;
  type: 'component' | 'page' | 'styles' | 'config' | 'data';
  description?: string;
  editable?: boolean;
}

export interface SmartCodeEditorProps {
  initialFiles: CodeFile[];
  projectName?: string;
  description?: string;
  onFilesChange?: (files: CodeFile[]) => void;
  onPreviewReady?: (url: string) => void;
  className?: string;
  enableWebContainer?: boolean;
}

export type ViewMode = 'code' | 'preview' | 'split';
export type EditMode = 'view' | 'edit';

export function SmartCodeEditor({
  initialFiles,
  projectName = 'React项目',
  description,
  onFilesChange,
  onPreviewReady,
  className,
  enableWebContainer = true
}: SmartCodeEditorProps) {
  // 状态管理
  const [files, setFiles] = useState<CodeFile[]>(initialFiles);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentFile = files[activeFileIndex];

  // 文件更新处理
  const handleFileUpdate = useCallback((filename: string, content: string) => {
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.map(file => 
        file.filename === filename ? { ...file, content } : file
      );
      return updatedFiles;
    });
    setHasUnsavedChanges(true);
  }, []);

  // 保存更改
  const handleSave = useCallback(() => {
    onFilesChange?.(files);
    setHasUnsavedChanges(false);
  }, [files, onFilesChange]);

  // 智能切换逻辑
  const handleSmartToggle = useCallback(() => {
    if (editMode === 'edit') {
      // 如果正在编辑，先保存然后切换到预览
      handleSave();
      setEditMode('view');
      if (viewMode === 'code') {
        setViewMode('preview');
      }
    } else {
      // 根据当前视图模式智能切换
      switch (viewMode) {
        case 'code':
          setViewMode('preview');
          break;
        case 'preview':
          setEditMode('edit');
          setViewMode('split');
          break;
        case 'split':
          setEditMode('edit');
          break;
      }
    }
  }, [editMode, viewMode, handleSave]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'e':
            e.preventDefault();
            setEditMode(editMode === 'edit' ? 'view' : 'edit');
            break;
          case '\\':
            e.preventDefault();
            handleSmartToggle();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, handleSave, handleSmartToggle]);

  return (
    <Card className={cn("w-full h-full flex flex-col shadow-lg", className)}>
      {/* 智能切换工具栏 */}
      <SmartToggleBar
        viewMode={viewMode}
        editMode={editMode}
        hasUnsavedChanges={hasUnsavedChanges}
        projectName={projectName}
        onViewModeChange={setViewMode}
        onEditModeChange={setEditMode}
        onSave={handleSave}
        onSmartToggle={handleSmartToggle}
      />

      <Separator />

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'code' && (
            <motion.div
              key="code-only"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <CodeEditorPanel
                files={files}
                activeFileIndex={activeFileIndex}
                editMode={editMode}
                onActiveFileChange={setActiveFileIndex}
                onFileUpdate={handleFileUpdate}
              />
            </motion.div>
          )}

          {viewMode === 'preview' && (
            <motion.div
              key="preview-only"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full"
            >
              <WebContainerPreview
                files={files}
                projectName={projectName}
                description={description}
                isLoading={isPreviewLoading}
                previewUrl={previewUrl}
                enableWebContainer={enableWebContainer}
                onPreviewReady={setPreviewUrl}
                onLoadingChange={setIsPreviewLoading}
              />
            </motion.div>
          )}

          {viewMode === 'split' && (
            <motion.div
              key="split-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex"
            >
              <div className="w-1/2 border-r">
                <CodeEditorPanel
                  files={files}
                  activeFileIndex={activeFileIndex}
                  editMode={editMode}
                  onActiveFileChange={setActiveFileIndex}
                  onFileUpdate={handleFileUpdate}
                />
              </div>
              <div className="w-1/2">
                <WebContainerPreview
                  files={files}
                  projectName={projectName}
                  description={description}
                  isLoading={isPreviewLoading}
                  previewUrl={previewUrl}
                  enableWebContainer={enableWebContainer}
                  onPreviewReady={setPreviewUrl}
                  onLoadingChange={setIsPreviewLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>文件: {files.length}</span>
          <span>行数: {currentFile?.content.split('\n').length || 0}</span>
          <span>字符: {currentFile?.content.length || 0}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">
              <Save className="w-3 h-3 mr-1" />
              未保存
            </Badge>
          )}
          
          <span className="text-gray-400">
            按 Cmd+\ 智能切换 • Cmd+S 保存 • Cmd+E 编辑模式
          </span>
        </div>
      </div>
    </Card>
  );
}

export default SmartCodeEditor; 