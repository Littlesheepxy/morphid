"use client"

import { useState, useEffect, useRef } from "react"
import { useChatSystemV2 } from "@/hooks/use-chat-system-v2"
import { useTheme } from "@/contexts/theme-context"
import { generateMockResumeCode } from "@/lib/utils/mockCodeGenerator"
import { useAuthCheck, usePendingAuthAction } from "@/hooks/use-auth-check"
import { AuthPromptDialog } from "@/components/dialogs"

// 导入新的组件
import { ChatHeader } from "@/components/chat/ChatHeader"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { WelcomeScreen } from "@/components/chat/WelcomeScreen"
import { ChatModeView } from "@/components/chat/ChatModeView"
import { CodeModeView } from "@/components/chat/CodeModeView"

export default function ChatPage() {
  const { theme } = useTheme()
  
  // 认证状态
  const { isAuthenticated, isLoading: authLoading, userId } = useAuthCheck()
  const { executePendingAction } = usePendingAuthAction()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string>('')
  
  const {
    sessions = [],
    currentSession,
    isGenerating,
    createNewSession,
    selectSession,
    sendMessage,
  } = useChatSystemV2()
  
  const [inputValue, setInputValue] = useState("")
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [isCodeMode, setIsCodeMode] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<any[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 监听当前会话变化，如果有会话且有消息，则显示对话模式
  useEffect(() => {
    if (currentSession && currentSession.conversationHistory && currentSession.conversationHistory.length > 0) {
      setHasStartedChat(true)
    }
  }, [currentSession])

  // 监听当前会话变化，检查是否进入代码生成阶段
  useEffect(() => {
    if (currentSession && currentSession.conversationHistory && currentSession.conversationHistory.length > 0) {
      setHasStartedChat(true)
      
      // 检查是否有代码生成相关的消息
      const hasCodeGeneration = currentSession.conversationHistory.some(message => 
        message.metadata?.systemState?.current_stage === '代码生成中' ||
        message.metadata?.codeBlocks
      )
      
      if (hasCodeGeneration && !isCodeMode) {
        setIsCodeMode(true)
        // 提取生成的代码
        const codeMessages = currentSession.conversationHistory.filter(msg => msg.metadata?.codeBlocks)
        if (codeMessages.length > 0) {
          const latestCodeMessage = codeMessages[codeMessages.length - 1]
          if (latestCodeMessage.metadata?.codeBlocks) {
            setGeneratedCode(latestCodeMessage.metadata.codeBlocks)
          }
        }
      }
    }
  }, [currentSession, isCodeMode])

  // 处理登录成功后的继续操作
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // 检查是否有待执行的操作
      const executed = executePendingAction(() => {
        // 登录成功后继续发送消息
        if (pendingMessage) {
          setTimeout(() => {
            sendMessage(pendingMessage)
            setPendingMessage('')
            setHasStartedChat(true)
          }, 500)
        }
      })
      
      if (executed) {
        console.log('✅ 登录成功，继续执行聊天操作')
      }
    }
  }, [isAuthenticated, authLoading, pendingMessage, executePendingAction, sendMessage])

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B 切换侧边栏
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setIsSidebarCollapsed(!isSidebarCollapsed)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarCollapsed])

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // 检查认证状态
    if (!authLoading && !isAuthenticated) {
      // 未登录，显示登录提示
      setPendingMessage(inputValue)
      setShowAuthDialog(true)
      return
    }

    // 🔧 修复：立即设置为已开始聊天状态，确保界面立即切换
    if (!hasStartedChat) {
      setHasStartedChat(true)
    }

    // 🔧 修复：先发送消息，让用户消息立即显示，会话创建在 sendMessage 内部处理
    sendMessage(inputValue)
    setInputValue("")
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 开始新对话
  const handleNewChat = async () => {
    setHasStartedChat(false)
    setInputValue("")
    setIsCodeMode(false)
    setGeneratedCode([])
    await createNewSession()
  }

  // 处理代码下载
  const handleCodeDownload = () => {
    const projectData = {
      name: currentSession?.id || 'HeysMe项目',
      files: generatedCode
    }
    console.log('下载项目:', projectData)
  }

  // 处理部署
  const handleDeploy = () => {
    console.log('部署项目')
  }

  // 处理代码编辑
  const handleEditCode = (filename: string) => {
    console.log('编辑文件:', filename)
  }

  // 转换代码为React预览格式
  const getReactPreviewData = () => {
    if (!generatedCode.length) return null

    return {
      files: generatedCode.map(code => ({
        filename: code.filename,
        content: code.content,
        language: code.language,
        type: code.type || 'component',
        description: code.description
      })),
      projectName: currentSession?.id || 'HeysMe项目',
      description: '基于AI生成的个人简历和作品集',
      assets: extractAssetsFromCode(generatedCode)
    }
  }

  // 从代码中提取资源
  const extractAssetsFromCode = (codeFiles: any[]) => {
    const assets: any[] = []
    
    codeFiles.forEach(file => {
      // 提取图片链接
      const imageMatches = file.content.match(/src=["']([^"']*\.(jpg|jpeg|png|gif|webp|svg))["']/gi)
      if (imageMatches) {
        imageMatches.forEach((match: string) => {
          const url = match.match(/src=["']([^"']+)["']/)?.[1]
          if (url && url.startsWith('http')) {
            assets.push({
              name: url.split('/').pop() || 'image',
              url,
              type: 'image',
              description: '项目图片资源'
            })
          }
        })
      }

      // 提取iframe链接
      const iframeMatches = file.content.match(/src=["']([^"']+)["']/gi)
      if (iframeMatches && file.content.includes('iframe')) {
        iframeMatches.forEach((match: string) => {
          const url = match.match(/src=["']([^"']+)["']/)?.[1]
          if (url && url.startsWith('http') && !url.includes('image')) {
            assets.push({
              name: '作品展示',
              url,
              type: 'link',
              description: '作品链接或演示'
            })
          }
        })
      }
    })

    return assets
  }

  // 生成测试代码用于演示
  const generateTestCode = async () => {
    const mockUserData = {
      name: "张三",
      title: "前端开发工程师",
      bio: "热爱技术，专注于前端开发和用户体验设计。拥有5年Web开发经验，熟悉React、Vue、Node.js等技术栈。",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      email: "zhangsan@example.com",
      linkedin: "https://linkedin.com/in/zhangsan",
      github: "https://github.com/zhangsan"
    }

    const mockCode = generateMockResumeCode(mockUserData)
    setGeneratedCode(mockCode)
    setIsCodeMode(true)
    setHasStartedChat(true)

    if (!currentSession) {
      await createNewSession()
    }
  }

  // 返回对话模式
  const handleBackToChat = () => {
    setIsCodeMode(false)
    setGeneratedCode([])
  }

  // 处理侧边栏折叠切换
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <div
      className={`h-screen flex transition-all duration-300 ${
        theme === "light" 
          ? "bg-page-gradient-light" 
          : "bg-page-gradient-dark"
      }`}
    >
      {/* 🎨 左侧侧边栏 - 全高度布局 */}
      <ChatSidebar 
        sessions={sessions}
        currentSession={currentSession}
        isCodeMode={isCodeMode}
        onNewChat={handleNewChat}
        onSelectSession={selectSession}
        onGenerateTestCode={generateTestCode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 🎨 主内容区域 - 包含header和内容 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 🎨 顶部导航栏 - 品牌色 - 只在非代码模式下显示 */}
        {!isCodeMode && <ChatHeader />}

        {/* 🎨 主内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isCodeMode ? (
            /* 代码模式 */
            <CodeModeView
              currentSession={currentSession}
              generatedCode={generatedCode}
              inputValue={inputValue}
              setInputValue={setInputValue}
              isGenerating={isGenerating}
              onBack={handleBackToChat}
              onSendMessage={handleSendMessage}
              onSendChatMessage={sendMessage}
              onKeyPress={handleKeyPress}
              onDownload={handleCodeDownload}
              onDeploy={handleDeploy}
              onEditCode={handleEditCode}
              getReactPreviewData={getReactPreviewData}
            />
          ) : hasStartedChat ? (
            /* 正常对话模式 */
            <ChatModeView
              currentSession={currentSession}
              inputValue={inputValue}
              setInputValue={setInputValue}
              isGenerating={isGenerating}
              onSendMessage={sendMessage}
              onKeyPress={handleKeyPress}
              sessionId={currentSession?.id}
            />
          ) : (
            /* 欢迎屏幕 */
            <WelcomeScreen
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>

      {/* 未登录提醒对话框 */}
      <AuthPromptDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        title="需要登录才能开始对话"
        message="请先登录您的账户来使用AI助手和创建个人页面"
        action="开始对话"
        onLoginSuccess={() => {
          // 登录成功回调会在useEffect中处理
          setShowAuthDialog(false);
        }}
      />
    </div>
  )
}
