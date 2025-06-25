'use client';

import React from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { FileCode, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  fileType?: 'component' | 'page' | 'styles' | 'config' | 'data';
  children?: FileTreeNode[];
  content?: string;
}

interface FileTreeProps {
  data: FileTreeNode[];
  selectedFileId?: string;
  onFileSelect: (fileId: string) => void;
  className?: string;
}

export function FileTree({ data, selectedFileId, onFileSelect, className }: FileTreeProps) {
  return (
    <div className={cn("h-full bg-gray-50 border-r", className)}>
      <div className="p-3 border-b bg-white">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Folder className="w-4 h-4" />
          项目文件
        </h3>
      </div>
      
      <div className="p-2">
        <Tree
          data={data}
          openByDefault={false}
          width="100%"
          height={400}
          indent={16}
          rowHeight={32}
          onSelect={(nodes) => {
            const node = nodes[0];
            if (node && node.data.type === 'file') {
              onFileSelect(node.data.id);
            }
          }}
          selection={selectedFileId}
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}

// 文件树节点渲染组件
function Node({ node, style, dragHandle }: { 
  node: NodeApi<FileTreeNode>; 
  style: React.CSSProperties;
  dragHandle?: (el: HTMLDivElement | null) => void;
}) {
  const data = node.data;
  const isSelected = node.isSelected;
  const isFolder = data.type === 'folder';
  
  // 获取文件图标
  const getFileIcon = () => {
    if (isFolder) {
      return node.isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />;
    }
    
    // 根据文件扩展名返回不同图标
    if (data.name.endsWith('.tsx') || data.name.endsWith('.ts')) return '⚛️';
    if (data.name.endsWith('.css') || data.name.endsWith('.scss')) return '🎨';
    if (data.name.endsWith('.js') || data.name.endsWith('.jsx')) return '🟨';
    if (data.name.endsWith('.json')) return '📋';
    if (data.name.endsWith('.md')) return '📝';
    return <FileCode className="w-4 h-4" />;
  };

  // 获取文件类型颜色
  const getFileTypeColor = (type?: string) => {
    switch (type) {
      case 'component': return 'bg-green-100 text-green-800 border-green-200';
      case 'page': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'styles': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'config': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'data': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer rounded-md mx-1 transition-all duration-150",
        isSelected 
          ? "bg-blue-100 text-blue-900 border border-blue-200" 
          : "hover:bg-gray-100 text-gray-700"
      )}
      onClick={() => {
        if (isFolder) {
          node.toggle();
        } else {
          node.select();
        }
      }}
    >
      {/* 展开/收起图标 */}
      {isFolder && (
        <span className="flex items-center justify-center w-4 h-4">
          {node.isOpen ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </span>
      )}
      
      {/* 文件/文件夹图标 */}
      <span className="flex items-center justify-center w-4 h-4">
        {getFileIcon()}
      </span>
      
      {/* 文件名 */}
      <span className="flex-1 truncate font-medium">
        {data.name}
      </span>
      
      {/* 文件类型标签 */}
      {!isFolder && data.fileType && (
        <Badge 
          variant="outline" 
          className={cn("text-xs px-1.5 py-0.5", getFileTypeColor(data.fileType))}
        >
          {data.fileType}
        </Badge>
      )}
    </div>
  );
} 