"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Send, 
  User, 
  Bot,
  Paperclip,
  Sparkles,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowLeft,
  Code,
  Download,
  Eye,
  CheckCircle
} from "lucide-react"
import { useChatSystem } from "@/hooks/use-chat-system"
import { useTheme } from "@/contexts/theme-context"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CodeBlockStreaming } from "@/components/code/CodeBlockStreaming"
import { ReactPreviewRenderer } from "@/components/code/ReactPreviewRenderer"
import { generateMockResumeCode } from "@/lib/utils/mockCodeGenerator"

export default function ChatPage() {
  const { theme } = useTheme()
  const {
    sessions = [],
    currentSession,
    isGenerating,
    createNewSession,
    selectSession,
    sendMessage,
  } = useChatSystem()
  
  const [inputValue, setInputValue] = useState("")
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [isCodeMode, setIsCodeMode] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<any[]>([])
  const [showReactPreview, setShowReactPreview] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const welcomeText = "你好！我是 HeysMe AI 助手，我可以帮助你创建专业的个人简历和作品集。"

  // 打字机效果
  useEffect(() => {
    if (!hasStartedChat) {
      let index = 0
      const timer = setInterval(() => {
        if (index < welcomeText.length) {
          setTypingText(welcomeText.slice(0, index + 1))
          index++
        } else {
          clearInterval(timer)
        }
      }, 50)
      return () => clearInterval(timer)
    }
  }, [hasStartedChat])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentSession?.messages])

  // 监听当前会话变化，如果有会话且有消息，则显示对话模式
  useEffect(() => {
    if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
      setHasStartedChat(true)
    }
  }, [currentSession])

  // 监听当前会话变化，检查是否进入代码生成阶段
  useEffect(() => {
    if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
      setHasStartedChat(true)
      
      // 检查是否有代码生成相关的消息
      const hasCodeGeneration = currentSession.messages.some(message => 
        message.metadata?.system_state?.current_stage === '代码生成中' ||
        message.metadata?.codeBlocks
      )
      
      if (hasCodeGeneration && !isCodeMode) {
        setIsCodeMode(true)
        // 提取生成的代码
        const codeMessages = currentSession.messages.filter(msg => msg.metadata?.codeBlocks)
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
  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    if (!hasStartedChat) {
      setHasStartedChat(true)
      if (!currentSession) {
        createNewSession()
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
  const handleNewChat = () => {
    setHasStartedChat(false)
    setTypingText("")
    setInputValue("")
    createNewSession()
  }

  // 处理React预览
  const handleReactPreview = () => {
    if (generatedCode.length > 0) {
      setShowReactPreview(true)
    }
  }

  // 处理代码下载
  const handleCodeDownload = () => {
    // 创建下载逻辑
    const projectData = {
      name: currentSession?.title || 'HeysMe项目',
      files: generatedCode
    }
    
    // 这里可以实现实际的下载功能
    console.log('下载项目:', projectData)
  }

  // 处理部署
  const handleDeploy = () => {
    // 这里可以实现部署到Vercel/Netlify等平台
    console.log('部署项目')
  }

  // 处理代码编辑
  const handleEditCode = (filename: string) => {
    // 这里可以打开代码编辑器
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
      projectName: currentSession?.title || 'HeysMe项目',
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
  const generateTestCode = () => {
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

    // 如果还没有会话，创建一个
    if (!currentSession) {
      createNewSession()
    }
  }

  const MessageBubble = ({ message, isLast }: { message: any; isLast: boolean }) => {
    const isUser = message.type === "user"
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-4 max-w-4xl mx-auto px-6 py-4 ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        {/* 头像 */}
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className={isUser ? "bg-blue-500 text-white" : "bg-gray-100"}>
            {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        {/* 消息内容 */}
        <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
          <div
            className={`inline-block max-w-full ${
              isUser
                ? "text-gray-800"
                : "text-gray-800"
            }`}
          >
            {/* 消息文本 */}
            <div className="whitespace-pre-wrap break-words">
              {isLast && !isUser && isGenerating ? (
                <div className="flex items-center gap-2">
                  <span>{message.content}</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              ) : (
                message.content
              )}
            </div>

            {/* 选项按钮 */}
            {!isUser && message.metadata?.options && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.metadata.options.map((option: any, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      sendMessage(option.label, option)
                    }}
                    className="text-sm rounded-full border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}

            {/* 智能确认表单 */}
            {!isUser && message.metadata?.interaction && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-3">
                  {message.metadata.interaction.title}
                </h4>
                <div className="space-y-4">
                  {message.metadata.interaction.elements?.map((element: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {element.label}
                        {element.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {element.type === 'select' && (
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          defaultValue={element.value || ''}
                        >
                          <option value="">请选择...</option>
                          {element.options?.map((option: any, optIndex: number) => (
                            <option key={optIndex} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {element.type === 'input' && (
                        <input
                          type="text"
                          placeholder={element.placeholder || '请输入...'}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      
                      {element.type === 'checkbox' && (
                        <div className="space-y-2">
                          {element.options?.map((option: any, optIndex: number) => (
                            <label key={optIndex} className="flex items-center space-x-2">
                              <input type="checkbox" value={option.value} className="rounded" />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={() => {
                        // 收集表单数据并发送
                        const formData: any = {};
                        const form = document.querySelector(`form[data-message-id="${message.id}"]`) as HTMLFormElement;
                        if (form) {
                          const formElements = form.elements;
                          for (let i = 0; i < formElements.length; i++) {
                            const element = formElements[i] as HTMLInputElement | HTMLSelectElement;
                            if (element.name && element.value) {
                              formData[element.name] = element.value;
                            }
                          }
                        }
                        sendMessage('确认信息', { type: 'interaction', ...formData });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      确认提交
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sendMessage('我需要重新考虑一下');
                      }}
                    >
                      重新考虑
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div
      className={`h-screen flex transition-colors duration-300 ${
        theme === "light" 
          ? "bg-white" 
          : "bg-gray-900"
      }`}
    >
      {/* 左侧侧边栏 - 代码模式时收起 */}
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
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            variant="outline"
            className="w-full justify-start gap-3 h-11 border-gray-300 hover:bg-gray-100 mb-2"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </Button>
          
          {/* 测试按钮 */}
          <Button
            onClick={generateTestCode}
            variant="outline"
            className="w-full justify-start gap-3 h-11 border-blue-300 hover:bg-blue-50 text-blue-600"
          >
            <Code className="w-4 h-4" />
            生成测试代码
          </Button>
        </div>

        {/* 会话列表 */}
        <ScrollArea className="flex-1">
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
                  onClick={() => selectSession(session.id)}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium text-sm truncate ${
                          theme === "light" ? "text-gray-900" : "text-gray-100"
                        }`}
                      >
                        {session.title}
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

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {isCodeMode ? (
          /* 代码编辑模式 */
          <div className="flex-1 flex">
            {/* 聊天区域 - 代码模式时变窄 */}
            <div className="w-1/2 flex flex-col border-r">
              {/* 头部工具栏 */}
              <div className={`flex items-center justify-between p-4 border-b ${
                theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700"
              }`}>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCodeMode(false)
                      setGeneratedCode([])
                      setShowReactPreview(false)
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回对话
                  </Button>
                  <div className="text-sm font-medium">对话历史</div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="py-4">
                    {currentSession?.messages?.map((message, index) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isLast={index === (currentSession?.messages?.length || 0) - 1}
                      />
                    ))}
                    
                    {/* 如果是测试模式，显示生成信息 */}
                    {generatedCode.length > 0 && (
                      <div className="max-w-4xl mx-auto px-6 py-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-800">代码生成完成</span>
                          </div>
                          <p className="text-blue-700 text-sm">
                            已生成包含 React 组件、样式文件和配置的完整项目代码。
                            点击右侧的"React预览"按钮查看实时效果。
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* 底部输入框 */}
              <div className="border-t border-gray-100 bg-white p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="继续对话或请求修改..."
                      className="pr-12 py-3 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isGenerating}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isGenerating}
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧代码预览区域 */}
            <div className="w-1/2 flex flex-col">
              <div className={`flex items-center justify-between p-4 border-b ${
                theme === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700"
              }`}>
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-blue-500" />
                  <div className="text-sm font-medium">
                    {showReactPreview ? "React 应用预览" : "生成的代码"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!showReactPreview ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleCodeDownload}
                        disabled={generatedCode.length === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        下载
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleReactPreview}
                        disabled={generatedCode.length === 0}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        React预览
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowReactPreview(false)}
                    >
                      <Code className="w-4 h-4 mr-2" />
                      返回代码
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {showReactPreview ? (
                  /* React预览模式 */
                  getReactPreviewData() ? (
                    <ReactPreviewRenderer
                      data={getReactPreviewData()!}
                      onDownload={handleCodeDownload}
                      onDeploy={handleDeploy}
                      onEditCode={handleEditCode}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">暂无预览数据</p>
                        <p className="text-sm">请先生成代码</p>
                      </div>
                    </div>
                  )
                ) : (
                  /* 代码查看模式 */
                  generatedCode.length > 0 ? (
                    <CodeBlockStreaming
                      files={generatedCode}
                      isStreaming={isGenerating}
                      onPreview={handleReactPreview}
                      onDownload={handleCodeDownload}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">等待代码生成</p>
                        <p className="text-sm">代码生成完成后将在此显示</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : hasStartedChat ? (
          /* 正常对话模式 */
          <>
            {/* 消息列表 */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="py-8">
                  {currentSession?.messages?.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLast={index === (currentSession?.messages?.length || 0) - 1}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* 底部输入框 */}
            <div className="border-t border-gray-100 bg-white p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-auto text-gray-400 hover:text-gray-600"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="发送消息..."
                      className="pr-12 py-3 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isGenerating}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isGenerating}
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 欢迎模式 */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-2xl mx-auto text-center">
              {/* 欢迎文本 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  HeysMe AI
                </h1>
                
                <div className="text-xl text-gray-600 h-16 flex items-center justify-center">
                  {typingText}
                  <span className="ml-1 animate-pulse">|</span>
                </div>
              </motion.div>

              {/* 输入框 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full"
              >
                <div className="relative">
                  <div className="flex items-end gap-3 p-4 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 h-auto text-gray-400 hover:text-gray-600"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex-1 relative">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="告诉我你想要什么样的简历..."
                        className="border-0 p-0 text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoFocus
                      />
                    </div>

                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      size="sm"
                      className="w-8 h-8 p-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* 示例提示 */}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "我想创建一份软件工程师简历",
                    "帮我设计一个设计师作品集",
                    "制作一份学生求职简历"
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => setInputValue(example)}
                      className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full border border-gray-200"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
