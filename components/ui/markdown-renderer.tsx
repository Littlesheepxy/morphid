'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/contexts/theme-context';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          // 标题样式
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 border-b border-emerald-200 dark:border-emerald-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200 mt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium mb-2 text-gray-700 dark:text-gray-300 mt-3">
              {children}
            </h4>
          ),
          
          // 段落样式
          p: ({ children }) => (
            <p className="mb-4 text-gray-900 dark:text-gray-100 leading-relaxed font-normal">
              {children}
            </p>
          ),
          
          // 列表样式
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 space-y-1 text-gray-900 dark:text-gray-100">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 space-y-1 text-gray-900 dark:text-gray-100 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              <span className="text-emerald-500 mr-2">•</span>
              {children}
            </li>
          ),
          
          // 代码块样式
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return (
                <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    {language}
                  </div>
                  <SyntaxHighlighter
                    style={theme === 'dark' ? oneDark : oneLight}
                    language={language}
                    PreTag="div"
                    className="!m-0 !bg-transparent"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code 
                className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // 引用块样式
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-900/20 py-2 rounded-r">
              {children}
            </blockquote>
          ),
          
          // 链接样式
          a: ({ href, children }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-300 hover:decoration-emerald-500 transition-colors"
            >
              {children}
            </a>
          ),
          
          // 表格样式
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-emerald-50 dark:bg-emerald-900/30">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              {children}
            </td>
          ),
          
          // 分割线样式
          hr: () => (
            <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
          ),
          
          // 强调样式
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      
      <style jsx global>{`
        .markdown-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: rgb(17, 24, 39);
        }
        
        .dark .markdown-content {
          color: rgb(243, 244, 246);
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          font-weight: 600;
          line-height: 1.25;
        }
        
        .markdown-content p {
          margin-bottom: 1rem;
        }
        
        .markdown-content ul li::marker {
          color: rgb(16, 185, 129);
        }
        
        .markdown-content ol li::marker {
          color: rgb(16, 185, 129);
          font-weight: 600;
        }
        
        /* 优化代码块滚动条 */
        .markdown-content pre {
          scrollbar-width: thin;
          scrollbar-color: rgb(16, 185, 129) transparent;
        }
        
        .markdown-content pre::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        
        .markdown-content pre::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .markdown-content pre::-webkit-scrollbar-thumb {
          background-color: rgb(16, 185, 129);
          border-radius: 3px;
        }
        
        .markdown-content pre::-webkit-scrollbar-thumb:hover {
          background-color: rgb(5, 150, 105);
        }
      `}</style>
    </div>
  );
} 