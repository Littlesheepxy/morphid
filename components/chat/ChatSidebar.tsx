'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, MoreHorizontal, Code } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';

interface ChatSidebarProps {
  sessions: any[];
  currentSession: any;
  isCodeMode: boolean;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onGenerateTestCode: () => void;
}

export function ChatSidebar({ 
  sessions, 
  currentSession, 
  isCodeMode, 
  onNewChat, 
  onSelectSession, 
  onGenerateTestCode 
}: ChatSidebarProps) {
  const { theme } = useTheme();

  return (
    <div
      className={`border-r flex flex-col transition-all duration-500 ${
        isCodeMode ? "w-0 overflow-hidden" : "w-64"
      } ${
        theme === "light" 
          ? "bg-gray-50 border-gray-200" 
          : "bg-gray-800 border-gray-700"
      }`}
    >
      {/* 新建对话按钮 */}
      <div className="p-3 shrink-0">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-3 h-11 border-gray-300 hover:bg-gray-100 mb-2"
        >
          <Plus className="w-4 h-4" />
          新建对话
        </Button>
        
        {/* 测试按钮 */}
        <Button
          onClick={onGenerateTestCode}
          variant="outline"
          className="w-full justify-start gap-3 h-11 border-blue-300 hover:bg-blue-50 text-blue-600"
        >
          <Code className="w-4 h-4" />
          生成测试代码
        </Button>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 space-y-2">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentSession?.id === session.id
                    ? theme === "light"
                      ? "bg-gray-200"
                      : "bg-gray-700"
                    : theme === "light"
                      ? "hover:bg-gray-100"
                      : "hover:bg-gray-700/50"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-medium text-sm truncate ${
                        theme === "light" ? "text-gray-900" : "text-gray-100"
                      }`}
                    >
                      {session.id}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className={`text-center p-6 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无对话</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 