'use client';

import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

export function ChatHeader() {
  const { theme } = useTheme();

  return (
    <header 
      className={`transition-all duration-300 backdrop-blur-xl ${
        theme === "light" 
          ? "bg-white/90" 
          : "bg-gray-900/90"
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 移除标题内容，保持简洁 */}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className={`rounded-lg border transition-all duration-300 h-8 px-3 text-sm ${
                theme === "light"
                  ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              <a href="/dashboard" className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                工作台
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 