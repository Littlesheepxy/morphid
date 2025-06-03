'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Eye, MoreHorizontal } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

export function ChatHeader() {
  const { theme } = useTheme();

  return (
    <header className={`border-b px-6 py-4 ${
      theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
            HeysMe AI
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-lg"
          >
            <a href="/dashboard">
              <Eye className="w-4 h-4 mr-2" />
              工作台
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
} 