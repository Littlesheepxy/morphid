'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, MoreHorizontal, Code, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useEffect, useState } from 'react';

interface ChatSidebarProps {
  sessions: any[];
  currentSession: any;
  isCodeMode: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onGenerateTestCode: () => void;
}

export function ChatSidebar({ 
  sessions, 
  currentSession, 
  isCodeMode, 
  isCollapsed,
  onToggleCollapse,
  onNewChat, 
  onSelectSession, 
  onGenerateTestCode 
}: ChatSidebarProps) {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 计算实际宽度
  const getWidth = () => {
    if (isCodeMode) return 0;
    if (isMobile) return isCollapsed ? 0 : 280;
    return isCollapsed ? 80 : 320;
  };

  return (
    <motion.div
      animate={{ 
        width: getWidth()
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeInOut"
      }}
      className={`border-r flex flex-col backdrop-blur-xl overflow-hidden sidebar-transition ${
        theme === "light" 
          ? "bg-emerald-50/50 border-emerald-100/60" 
          : "bg-emerald-950/20 border-emerald-700/30"
      } ${isCodeMode ? 'hidden' : ''}`}
      style={{
        minWidth: isCodeMode ? 0 : isCollapsed ? (isMobile ? 0 : 80) : (isMobile ? 280 : 320),
        maxWidth: isCodeMode ? 0 : isCollapsed ? (isMobile ? 0 : 80) : (isMobile ? 280 : 320)
      }}
    >
      {/* 🎨 顶部Logo区域 */}
      <div className="p-4 shrink-0">
        <div className="flex items-center justify-between">
          {/* Logo区域 */}
          <motion.div 
            className="flex items-center gap-3"
            animate={{ 
              x: isCollapsed && !isMobile ? 8 : 0,
              opacity: 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="w-10 h-10 bg-brand-gradient rounded-2xl flex items-center justify-center shadow-brand">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: (isCollapsed && !isMobile) ? 0 : 1, 
                x: (isCollapsed && !isMobile) ? -10 : 0,
                width: (isCollapsed && !isMobile) ? 0 : 'auto'
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col overflow-hidden"
            >
              <span 
                className={`text-xl font-bold whitespace-nowrap ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                HeysMe AI
              </span>
   
            </motion.div>
          </motion.div>

          {/* 折叠按钮 - 在展开状态下显示 */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Toggle sidebar clicked, current state:', isCollapsed);
                onToggleCollapse();
              }}
              className={`w-8 h-8 p-0 rounded-xl transition-all duration-300 ${
                theme === "light"
                  ? "hover:bg-emerald-100 text-emerald-600"
                  : "hover:bg-emerald-800 text-emerald-400"
              }`}
              title={`${isCollapsed ? '展开' : '折叠'}侧边栏 (Ctrl+B)`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 折叠状态下的展开按钮 - 独立显示 */}
        {isCollapsed && !isMobile && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mt-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Expand sidebar clicked');
                onToggleCollapse();
              }}
              className={`w-10 h-10 p-0 rounded-xl transition-all duration-300 hover:scale-110 ${
                theme === "light"
                  ? "hover:bg-emerald-100 text-emerald-600 bg-emerald-50/80"
                  : "hover:bg-emerald-800 text-emerald-400 bg-emerald-900/30"
              }`}
              title="展开侧边栏 (Ctrl+B)"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* 🎨 操作按钮区域 */}
      {(!isCollapsed || isMobile) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 shrink-0 space-y-3 sidebar-content-fade"
        >
          {/* 🎨 新建对话按钮 - 简约设计 */}
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-3 h-12 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105 z-10 relative"
            style={{
              background: 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
            }}
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-white font-medium">新建对话</span>
          </Button>
          
          {/* 🎨 测试按钮 */}
          <Button
            onClick={onGenerateTestCode}
            variant="outline"
            className={`w-full justify-start gap-3 h-11 rounded-xl border-2 transition-all duration-300 ${
              theme === "light"
                ? "border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-gray-50"
                : "border-gray-700 text-gray-400 hover:border-emerald-600 hover:bg-gray-700"
            }`}
          >
            <Code className="w-4 h-4" />
            生成测试代码
          </Button>
        </motion.div>
      )}

      {/* 🎨 折叠状态下的快捷按钮 */}
      {isCollapsed && !isMobile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-2 shrink-0 space-y-2"
        >
          <Button
            onClick={onNewChat}
            size="sm"
            className="w-full h-10 p-0 rounded-xl text-white font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
            }}
            title="新建对话"
          >
            <Plus className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={onGenerateTestCode}
            variant="outline"
            size="sm"
            className={`w-full h-10 p-0 rounded-xl border-2 transition-all duration-300 ${
              theme === "light"
                ? "border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-gray-50"
                : "border-gray-700 text-gray-400 hover:border-emerald-600 hover:bg-gray-700"
            }`}
            title="生成测试代码"
          >
            <Code className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* 🎨 会话列表 */}
      {(!isCollapsed || isMobile) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 min-h-0 sidebar-content-fade"
        >
          <div className={`px-4 py-2 ${
            theme === "light" ? "text-gray-600" : "text-gray-400"
          }`}>
            <span className="text-xs font-medium">最近对话</span>
          </div>
          
          <ScrollArea className="flex-1 brand-scrollbar">
            <div className="px-4 pb-4 space-y-2">
              {sessions.length > 0 ? (
                sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-300 session-item ${
                      currentSession?.id === session.id
                        ? `session-item-active ${theme === "light"
                          ? "bg-emerald-100/80 border-emerald-300/50 shadow-brand-sm border-2"
                          : "bg-emerald-900/30 border-emerald-600/50 shadow-brand-sm border-2"}`
                        : theme === "light"
                          ? "hover:bg-emerald-50/60 border-2 border-transparent hover:border-emerald-200/50"
                          : "hover:bg-emerald-900/20 border-2 border-transparent hover:border-emerald-700/30"
                    } card-hover-brand`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    {/* 🎨 当前会话指示器 */}
                    {currentSession?.id === session.id && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-brand-gradient rounded-r-full"></div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        currentSession?.id === session.id
                          ? "bg-emerald-200 text-emerald-700"
                          : theme === "light" 
                            ? "bg-emerald-100 text-emerald-600" 
                            : "bg-emerald-800 text-emerald-300"
                      }`}>
                        <MessageSquare className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-medium text-sm truncate ${
                            theme === "light" ? "text-gray-900" : "text-gray-100"
                          }`}
                        >
                          {session.id.length > 15 ? `${session.id.substring(0, 15)}...` : session.id}
                        </h3>
                        <p className={`text-xs mt-0.5 ${
                          theme === "light" ? "text-emerald-600" : "text-emerald-400"
                        }`}>
                          刚刚活跃
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`opacity-0 group-hover:opacity-100 w-6 h-6 p-0 rounded-lg transition-all duration-300 ${
                          theme === "light"
                            ? "hover:bg-emerald-100 text-emerald-600"
                            : "hover:bg-emerald-800 text-emerald-400"
                        }`}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className={`text-center p-8 ${theme === "light" ? "text-emerald-500" : "text-emerald-400"}`}>
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 opacity-60" />
                  </div>
                  <p className="text-sm font-medium">暂无对话</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}

      {/* 🎨 折叠状态下的会话指示器 */}
      {isCollapsed && !isMobile && sessions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center py-4 space-y-2"
        >
          {sessions.slice(0, 3).map((session, index) => (
            <motion.div
              key={session.id}
              whileHover={{ scale: 1.1 }}
              className={`w-8 h-8 rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center ${
                currentSession?.id === session.id
                  ? "bg-emerald-200 text-emerald-700 shadow-brand-sm"
                  : theme === "light"
                    ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                    : "bg-emerald-800 text-emerald-300 hover:bg-emerald-700"
              }`}
              onClick={() => onSelectSession(session.id)}
              title={session.id}
            >
              <MessageSquare className="w-4 h-4" />
            </motion.div>
          ))}
          
          {sessions.length > 3 && (
            <div className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
              +{sessions.length - 3}
            </div>
          )}
        </motion.div>
      )}
      
      {/* 🎨 底部装饰渐变 */}
      <div className="h-1 bg-brand-gradient opacity-60"></div>
    </motion.div>
  );
} 