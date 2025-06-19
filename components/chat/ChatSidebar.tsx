'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, MoreHorizontal, Code, Sparkles, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useEffect, useState } from 'react';
import { UserButton, SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/nextjs';

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
  const { isLoaded, isSignedIn } = useAuth();

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
    if (isMobile) return isCollapsed ? 0 : 240;
    return isCollapsed ? 64 : 260;
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
          ? "bg-emerald-50/20 border-emerald-100/40" 
          : "bg-emerald-950/10 border-emerald-700/20"
      } ${isCodeMode ? 'hidden' : ''}`}
      style={{
        minWidth: isCodeMode ? 0 : isCollapsed ? (isMobile ? 0 : 64) : (isMobile ? 240 : 260),
        maxWidth: isCodeMode ? 0 : isCollapsed ? (isMobile ? 0 : 64) : (isMobile ? 240 : 260)
      }}
    >
      {/* 🎨 顶部Logo区域 */}
      <div className="p-3 shrink-0">
        <div className="flex items-center justify-between">
          {/* Logo区域 - 带悬停交互 */}
          <motion.div 
            className={`flex items-center gap-3 relative group ${
              isCollapsed && !isMobile ? 'cursor-pointer' : ''
            }`}
            onClick={isCollapsed && !isMobile ? onToggleCollapse : undefined}
          >
            <motion.div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md relative"
              style={{
                background: 'linear-gradient(135deg, #34D399 0%, #2DD4BF 50%, #22D3EE 100%)',
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
              
              {/* 折叠状态下的展开按钮 - 悬停时在logo位置显示 */}
              {isCollapsed && !isMobile && (
                                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-emerald-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </motion.div>
              )}
            </motion.div>
            
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
                className={`text-lg font-bold whitespace-nowrap ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                HeysMe AI
              </span>
            </motion.div>
          </motion.div>

          {/* 折叠按钮 - 仅在展开状态下显示，使用图标 */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('Toggle sidebar clicked, current state:', isCollapsed);
                  onToggleCollapse();
                }}
                className={`w-8 h-8 p-0 rounded-xl transition-all duration-300 hover:scale-110 ${
                  theme === "light"
                    ? "hover:bg-emerald-100 text-emerald-600"
                    : "hover:bg-emerald-800 text-emerald-400"
                }`}
                title="折叠侧边栏 (Ctrl+B)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* 🎨 操作按钮区域 */}
      <div className="px-3 pt-2 pb-3 shrink-0">
        {(!isCollapsed || isMobile) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 sidebar-content-fade"
          >
            {/* 🎨 新建对话按钮 - 透明悬停设计 */}
            <button
              onClick={onNewChat}
              className={`w-full flex items-center justify-start gap-2 h-8 px-2 rounded-lg font-medium transition-all duration-300 group ${
                theme === "light"
                  ? "text-gray-700 bg-transparent hover:bg-emerald-50 hover:text-emerald-700"
                  : "text-gray-300 bg-transparent hover:bg-emerald-900/20 hover:text-emerald-400"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">新建对话</span>
            </button>
            
            {/* 🎨 测试按钮 - 透明悬停设计 */}
            <button
              onClick={onGenerateTestCode}
              className={`w-full flex items-center justify-start gap-2 h-8 px-2 rounded-lg font-medium transition-all duration-300 ${
                theme === "light"
                  ? "text-gray-600 bg-transparent hover:bg-gray-50 hover:text-gray-700"
                  : "text-gray-400 bg-transparent hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              <Code className="w-4 h-4" />
              <span>生成测试代码</span>
            </button>
          </motion.div>
        )}

                  {/* 🎨 折叠状态下的快捷按钮 */}
          {isCollapsed && !isMobile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 flex flex-col items-center"
            >
              <button
                onClick={onNewChat}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${
                  theme === "light"
                    ? "text-gray-700 bg-transparent hover:bg-emerald-50 hover:text-emerald-700"
                    : "text-gray-300 bg-transparent hover:bg-emerald-900/20 hover:text-emerald-400"
                }`}
                title="新建对话"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <button
                onClick={onGenerateTestCode}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${
                  theme === "light"
                    ? "text-gray-600 bg-transparent hover:bg-gray-50 hover:text-gray-700"
                    : "text-gray-400 bg-transparent hover:bg-gray-800 hover:text-gray-300"
                }`}
                title="生成测试代码"
              >
                <Code className="w-4 h-4" />
              </button>
            </motion.div>
          )}
      </div>

      {/* 🎨 会话列表 */}
      {(!isCollapsed || isMobile) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 min-h-0 sidebar-content-fade"
        >
          <div className={`px-3 py-2 ${
            theme === "light" ? "text-gray-600" : "text-gray-400"
          }`}>
            <span className="text-xs font-medium pl-2">最近对话</span>
          </div>
          
          <ScrollArea className="flex-1 brand-scrollbar">
            <div className="px-3 pb-3 space-y-1">
              {sessions.length > 0 ? (
                sessions.map((session, index) => (
                                    <motion.button
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group w-full flex items-center justify-start gap-2 h-8 px-2 rounded-lg font-medium transition-all duration-300 ${
                      currentSession?.id === session.id
                        ? theme === "light"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-emerald-900/20 text-emerald-400"
                        : theme === "light"
                          ? "text-gray-700 bg-transparent hover:bg-emerald-50 hover:text-emerald-700"
                          : "text-gray-300 bg-transparent hover:bg-emerald-900/20 hover:text-emerald-400"
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <span className="text-sm truncate">
                      {session.id.length > 15 ? `${session.id.substring(0, 15)}...` : session.id}
                    </span>
                    <button
                      className={`opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg transition-all duration-300 flex items-center justify-center ml-auto ${
                        theme === "light"
                          ? "hover:bg-emerald-100 text-emerald-600"
                          : "hover:bg-emerald-800 text-emerald-400"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 这里可以添加更多操作的逻辑
                      }}
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </motion.button>
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
          className="flex flex-col items-center py-4 space-y-2"
        >
          {sessions.slice(0, 3).map((session, index) => (
            <motion.div
              key={session.id}
              whileHover={{ scale: 1.1 }}
              className={`w-8 h-8 rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center ${
                currentSession?.id === session.id
                  ? theme === "light"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-emerald-900/20 text-emerald-400"
                  : theme === "light"
                    ? "text-gray-700 bg-transparent hover:bg-emerald-50 hover:text-emerald-700"
                    : "text-gray-300 bg-transparent hover:bg-emerald-900/20 hover:text-emerald-400"
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
      
      {/* 🎨 折叠状态下的占位空间 - 确保用户按钮在底部 */}
      {isCollapsed && !isMobile && (
        <div className="flex-1"></div>
      )}
      
      {/* 🎨 用户信息区域 */}
      {isLoaded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`shrink-0 border-t p-3 ${
            theme === "light" 
              ? "border-emerald-100/40 bg-emerald-50/10" 
              : "border-emerald-700/20 bg-emerald-950/5"
          }`}
        >
          <SignedIn>
            {/* 展开状态下的用户信息 */}
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center gap-2">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: {
                        pointerEvents: "initial",
                        zIndex: 1000
                      }
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    theme === "light" ? "text-gray-900" : "text-gray-100"
                  }`}>
                    用户中心
                  </div>
                  <div className={`text-xs ${
                    theme === "light" ? "text-emerald-600" : "text-emerald-400"
                  }`}>
                    点击头像管理账户
                  </div>
                </div>
              </div>
            )}
            
            {/* 折叠状态下的用户按钮 */}
            {isCollapsed && !isMobile && (
              <div className="flex justify-center">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: {
                        pointerEvents: "initial",
                        zIndex: 1000
                      }
                    }
                  }}
                />
              </div>
            )}
          </SignedIn>
          
          <SignedOut>
            {/* 未登录状态 */}
            {(!isCollapsed || isMobile) && (
              <div className="space-y-2">
                <SignInButton mode="modal">
                  <Button 
                    className="w-full justify-start gap-3 h-10 rounded-xl"
                    variant="outline"
                  >
                    <User className="w-4 h-4" />
                    登录账户
                  </Button>
                </SignInButton>
              </div>
            )}
            
            {/* 折叠状态下的登录按钮 */}
            {isCollapsed && !isMobile && (
              <div className="flex justify-center">
                <SignInButton mode="modal">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="w-8 h-8 p-0 rounded-lg"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </SignInButton>
              </div>
            )}
          </SignedOut>
        </motion.div>
      )}
      
      {/* 🎨 底部装饰渐变 */}
      <div className="h-1 bg-brand-gradient opacity-60"></div>
    </motion.div>
  );
} 