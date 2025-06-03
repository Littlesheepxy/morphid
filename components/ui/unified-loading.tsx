'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UnifiedLoadingProps {
  text?: string;
  className?: string;
  variant?: 'thinking' | 'generating' | 'processing' | 'analyzing';
  size?: 'sm' | 'md' | 'lg';
  autoHide?: boolean;
  onComplete?: () => void;
}

const variantConfig = {
  thinking: {
    text: 'AI 正在思考中',
    color: 'text-gray-600'
  },
  generating: {
    text: '正在生成内容',
    color: 'text-gray-600'
  },
  processing: {
    text: '正在处理请求',
    color: 'text-gray-600'
  },
  analyzing: {
    text: '正在分析数据',
    color: 'text-gray-600'
  }
};

const sizeConfig = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export function UnifiedLoading({
  text,
  className = '',
  variant = 'thinking',
  size = 'md',
  autoHide = false,
  onComplete
}: UnifiedLoadingProps) {
  const config = variantConfig[variant];
  const sizeClass = sizeConfig[size];
  const displayText = text || config.text;

  React.useEffect(() => {
    if (autoHide && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, onComplete]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'relative inline-block overflow-hidden',
        config.color,
        sizeClass,
        className
      )}
    >
      {displayText}
      
      {/* 文字光照扫描效果 */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"
        style={{
          width: '30%',
          height: '100%'
        }}
      />
    </motion.span>
  );
}

// 预设的快捷组件
export function ThinkingLoader(props: Omit<UnifiedLoadingProps, 'variant'>) {
  return <UnifiedLoading {...props} variant="thinking" />;
}

export function GeneratingLoader(props: Omit<UnifiedLoadingProps, 'variant'>) {
  return <UnifiedLoading {...props} variant="generating" />;
}

export function ProcessingLoader(props: Omit<UnifiedLoadingProps, 'variant'>) {
  return <UnifiedLoading {...props} variant="processing" />;
}

export function AnalyzingLoader(props: Omit<UnifiedLoadingProps, 'variant'>) {
  return <UnifiedLoading {...props} variant="analyzing" />;
}

// 简单的文本loader，用于替换现有的LoadingText
export function SimpleTextLoader({ 
  text, 
  className = '' 
}: { 
  text: string; 
  className?: string; 
}) {
  return (
    <span className={cn('relative inline-block overflow-hidden text-gray-600', className)}>
      {text}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </span>
  );
} 