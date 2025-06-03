"use client"

import { useState, useEffect, useRef } from "react"
import { useChatSystemV2 } from "@/hooks/use-chat-system-v2"
import { useTheme } from "@/contexts/theme-context"
import { generateMockResumeCode } from "@/lib/utils/mockCodeGenerator"

// 导入新的组件
import { ChatHeader } from "@/components/chat/ChatHeader"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { WelcomeScreen } from "@/components/chat/WelcomeScreen"
import { ChatModeView } from "@/components/chat/ChatModeView"
import { CodeModeView } from "@/components/chat/CodeModeView"

export default function ChatPage() {
  const { theme } = useTheme()
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

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    if (!hasStartedChat) {
      setHasStartedChat(true)
      if (!currentSession) {
        await createNewSession()
      }
    }

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

  return (
    <div
      className={`h-screen flex flex-col transition-colors duration-300 ${
        theme === "light" 
          ? "bg-white" 
          : "bg-gray-900"
      }`}
    >
      {/* 顶部导航栏 */}
      <ChatHeader />

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧侧边栏 */}
        <ChatSidebar 
          sessions={sessions}
          currentSession={currentSession}
          isCodeMode={isCodeMode}
          onNewChat={handleNewChat}
          onSelectSession={selectSession}
          onGenerateTestCode={generateTestCode}
        />

        {/* 主内容区域 */}
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
            /* 欢迎模式 */
            <WelcomeScreen
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  )
}
