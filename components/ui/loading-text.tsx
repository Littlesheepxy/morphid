'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SimpleTextLoader } from './unified-loading';

interface LoadingTextProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export function LoadingText({ 
  text, 
  className = '', 
  duration = 2000,
  delay = 0 
}: LoadingTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) return null;

  // 使用新的统一loading效果
  return <SimpleTextLoader text={text} className={className} />;
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