'use client';

import React from 'react'
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SimpleTextLoader } from './unified-loading';

interface LoadingTextProps {
  text?: string
  variant?: 'default' | 'brand' | 'typing' | 'shimmer'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingText({ 
  text = "正在加载...", 
  variant = 'default',
  size = 'md',
  className = '' 
}: LoadingTextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg'
  }

  const variants = {
    default: 'text-gray-500 animate-pulse',
    brand: 'text-brand-primary animate-brand-pulse',
    typing: 'text-emerald-600',
    shimmer: 'text-emerald-500 animate-brand-shimmer'
  }

  if (variant === 'typing') {
    return (
      <div className={`flex items-center gap-2 ${sizeClasses[size]} ${className}`}>
        <span className="text-emerald-600">{text}</span>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-brand-loading-dots"></div>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-brand-loading-dots" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-brand-loading-dots" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    )
  }

  if (variant === 'shimmer') {
    return (
      <div className={`relative overflow-hidden ${sizeClasses[size]} ${className}`}>
        <span className="text-emerald-600">{text}</span>
        <div className="absolute inset-0 -translate-x-full animate-brand-shimmer bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      </div>
    )
  }

  return (
    <span className={`${variants[variant]} ${sizeClasses[size]} ${className}`}>
      {text}
    </span>
  )
}

// 品牌加载点组件
export function BrandLoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-brand-loading-dots"></div>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-brand-loading-dots" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-brand-loading-dots" style={{ animationDelay: '0.4s' }}></div>
    </div>
  )
}

// 品牌打字光标
export function BrandTypingCursor({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block w-0.5 h-4 bg-emerald-500 animate-brand-blink ${className}`}>|</span>
  )
}

// 品牌骨架屏
export function BrandSkeleton({ 
  className = '',
  width = 'w-full',
  height = 'h-4'
}: { 
  className?: string
  width?: string
  height?: string
}) {
  return (
    <div className={`${width} ${height} skeleton-brand rounded ${className}`} />
  )
}

// 品牌进度条
export function BrandProgressBar({ 
  progress = 0,
  className = '',
  showPercentage = false
}: {
  progress?: number
  className?: string
  showPercentage?: boolean
}) {
  return (
    <div className={`w-full bg-emerald-100 rounded-full h-2 ${className}`}>
      <div 
        className="progress-brand h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
      {showPercentage && (
        <span className="text-xs text-emerald-600 mt-1 block">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}

// 预设的Loading文本样式 - 使用新的统一效果
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <span 
          key={index}
          className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" 
          style={{ animationDelay: `${index * 0.3}s` }} 
        />
      ))}
    </span>
  );
}

// 流式文本组件保持原有逻辑
interface StreamingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function StreamingText({ 
  text, 
  speed = 50, 
  onComplete, 
  className = '' 
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={cn('relative', className)}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
      )}
    </span>
  );
} 