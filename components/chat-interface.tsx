/**
 * 聊天界面组件 - 重构版
 *
 * 功能：
 * - 支持新建和编辑两种模式
 * - 集成Agent工作流系统
 * - 实时数据源集成
 * - 智能消息处理
 *
 * TODO:
 * - [ ] 添加消息搜索功能
 * - [ ] 支持消息导出
 * - [ ] 实现语音输入
 * - [ ] 添加快捷回复
 */

"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
  Sparkles,
  User,
  Bot,
  Mic,
  Paperclip,
  MoreHorizontal,
  ArrowLeft,
  Database,
  Brain,
  Palette,
} from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { DataSourceIntegration } from "@/components/data-source-integration"
import { ModelSelector } from "@/components/model-selector"
import type { ChatMessage, ChatSession } from "@/types/chat"
import type { FlowPage } from "@/types/HeysMe"

interface ChatInterfaceProps {
  session?: ChatSession | null
  project?: FlowPage
  projectId?: string
  isGenerating?: boolean
  onSendMessage?: (message: string, option?: any) => void
  onDataIntegration?: (sourceId: string, data: any) => void
  onProjectUpdate?: (project: FlowPage) => void
  showBackButton?: boolean
  backUrl?: string
  className?: string
}

export default function ChatInterface({
  session,
  project,
  projectId,
  isGenerating = false,
  onSendMessage,
  onDataIntegration,
  onProjectUpdate,
  showBackButton = false,
  backUrl = "/dashboard",
  className = "",
}: ChatInterfaceProps) {
  const { theme } = useTheme()
  const [inputValue, setInputValue] = useState("")
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [activeTab, setActiveTab] = useState("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.messages])

  // 发送消息
  const handleSendMessage = () => {
    if (!inputValue.trim() || isGenerating) return

    onSendMessage?.(inputValue)
    setInputValue("")
  }

  // 处理选项点击
  const handleOptionClick = (option: any) => {
    onSendMessage?.(option.label, option)
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 获取当前Agent状态
  const getCurrentAgentInfo = () => {
    if (!session?.metadata?.workflow) return null

    const { currentAgent, step } = session.metadata.workflow
    const agentInfo = {
      data_collection: { name: "信息收集助手", icon: Database, color: "text-blue-500" },
      summary: { name: "分析总结助手", icon: Brain, color: "text-purple-500" },
      page_creation: { name: "页面创建助手", icon: Palette, color: "text-green-500" },
    }

    return agentInfo[currentAgent as keyof typeof agentInfo]
  }

  const currentAgent = getCurrentAgentInfo()

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 聊天头部 */}
      <div
        className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${
          theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
        }`}
      >
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button variant="ghost" size="sm" asChild>
              <a href={backUrl}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </a>
            </Button>
          )}

          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div>
            <h2 className={`font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
              {project ? `编辑 ${project.title}` : "HeysMe AI 助手"}
            </h2>
            {currentAgent && (
              <div className="flex items-center gap-2 mt-1">
                <currentAgent.icon className={`w-3 h-3 ${currentAgent.color}`} />
                <span className={`text-xs ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  当前：{currentAgent.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* 标签栏 */}
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="chat">对话</TabsTrigger>
            <TabsTrigger value="data">数据源</TabsTrigger>
          </TabsList>

          {/* 标签内容 */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0">
            {/* 消息列表 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {session?.messages?.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onOptionClick={handleOptionClick}
                    isGenerating={isGenerating}
                    theme={theme}
                  />
                ))}

                {isGenerating && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex items-center gap-2 backdrop-blur-sm rounded-2xl px-4 py-3 border ${
                        theme === "light" ? "bg-white/60 border-white/30" : "bg-gray-800/60 border-gray-700/30"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
                      <span className={`text-sm ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                        AI 正在思考...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div
              className={`p-4 border-t transition-colors duration-300 ${
                theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
              }`}
            >
              <div
                className={`relative flex items-center gap-3 backdrop-blur-sm rounded-3xl border shadow-sm p-2 ${
                  theme === "light" ? "bg-white/80 border-gray-200" : "bg-gray-800/80 border-gray-700"
                }`}
              >
                <Button variant="ghost" size="sm" className="rounded-2xl w-10 h-10 p-0">
                  <Paperclip className="w-4 h-4" />
                </Button>

                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={project ? "描述你想要的修改..." : "告诉我你想创建什么样的页面..."}
                  className="flex-1 border-0 bg-transparent focus:ring-0 px-2"
                  disabled={isGenerating}
                />

                <Button variant="ghost" size="sm" className="rounded-2xl w-10 h-10 p-0">
                  <Mic className="w-4 h-4" />
                </Button>

                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isGenerating}
                  className="rounded-2xl w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="flex-1 m-0 p-4">
            <DataSourceIntegration
              onDataIntegrated={(sourceId, data) => {
                onDataIntegration?.(sourceId, data)
                setActiveTab("chat") // 切换回聊天标签
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// 消息气泡组件
interface MessageBubbleProps {
  message: ChatMessage
  onOptionClick: (option: any) => void
  isGenerating: boolean
  theme: "light" | "dark"
}

function MessageBubble({ message, onOptionClick, isGenerating, theme }: MessageBubbleProps) {
  const isUser = message.type === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        {isUser ? (
          <AvatarFallback className="bg-gray-100">
            <User className="w-4 h-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-blue-100">
            <Bot className="w-4 h-4 text-blue-600" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <Card
          className={`p-3 ${
            isUser ? "bg-blue-500 text-white" : theme === "light" ? "bg-gray-50" : "bg-gray-800 text-gray-200"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        </Card>

        {/* 选项按钮 */}
        {!isUser && message.metadata?.options && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.metadata.options.map((option: any) => (
              <Button
                key={option.id}
                variant={option.type === "action" ? "default" : "outline"}
                size="sm"
                onClick={() => onOptionClick(option)}
                disabled={isGenerating}
                className="rounded-2xl text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* 数据源集成提示 */}
        {!isUser && message.metadata?.needsDataSource && (
          <div
            className={`text-xs p-2 rounded-lg ${
              theme === "light" ? "bg-blue-50 text-blue-700" : "bg-blue-900/20 text-blue-300"
            }`}
          >
            💡 你可以切换到"数据源"标签来导入更多信息
          </div>
        )}

        <div className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  )
}
