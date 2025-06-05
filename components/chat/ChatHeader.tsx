'use client';

import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

export function ChatHeader() {
  const { theme } = useTheme();

  return (
    <header 
      className={`transition-all duration-300 backdrop-blur-xl ${
        theme === "light" 
          ? "bg-white/90 shadow-brand-sm" 
          : "bg-gray-900/90 shadow-brand-sm"
      }`}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 移除标题内容，保持简洁 */}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className={`rounded-2xl border-2 transition-all duration-300 ${
                theme === "light"
                  ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              <a href="/dashboard" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                工作台
              </a>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-2xl transition-all duration-300 ${
                theme === "light"
                  ? "hover:bg-emerald-50 text-emerald-600"
                  : "hover:bg-emerald-900/20 text-emerald-400"
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 