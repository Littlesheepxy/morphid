"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Plus, MessageSquare, Eye, Share, Download, Send, User, Bot, Mic } from "lucide-react"
import { useChatSystem } from "@/hooks/use-chat-system"
import PageRenderer from "@/components/page-renderer"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/contexts/theme-context"
import type { ChatMessage } from "@/types/chat"
import type { FlowPage } from "@/types/morphid"
import { ModelSelector } from "@/components/model-selector"

export default function ChatPage() {
  const { theme } = useTheme()
  const {
    sessions = [], // 添加默认值
    currentSession,
    isGenerating,
    generatedPage,
    selectedModel,
    setSelectedModel,
    createNewSession,
    selectSession,
    sendMessage,
  } = useChatSystem()
  const [inputValue, setInputValue] = useState("")
  const [viewMode, setViewMode] = useState<"chat" | "preview">("chat")

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    if (!currentSession) {
      createNewSession()
    }

    sendMessage(inputValue)
    setInputValue("")

    if (generatedPage) {
      setViewMode("preview")
    }
  }

  const handleOptionClick = (option: any) => {
    if (!currentSession) return

    sendMessage(option.label, option)

    if (option.value === "done" || generatedPage) {
      setViewMode("preview")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const previewPage: FlowPage | null = generatedPage
    ? {
        id: "preview",
        user_id: "preview",
        slug: "preview",
        title: generatedPage.title || "预览页面",
        theme: generatedPage.theme || "modern",
        layout: generatedPage.layout || "single-column",
        visibility: "private",
        is_featured: false,
        blocks: (generatedPage.blocks || []).map((block: any, index: number) => ({
          ...block,
          id: `block-${index}`,
          page_id: "preview",
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : null

  return (
    <div
      className={`h-screen flex flex-col transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-light" : "bg-gradient-dark"
      }`}
    >
      {/* 顶部导航 - 支持深色模式 */}
      <header
        className={`backdrop-blur-xl border-b px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-300 ${
          theme === "light" ? "bg-white/80 border-white/20" : "bg-gray-900/80 border-gray-700/20 text-white"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1
              className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                theme === "light" ? "from-gray-900 to-gray-600" : "from-white to-gray-300"
              }`}
            >
              MorphID
            </h1>
            <Badge variant="secondary" className="text-xs rounded-full">
              v0.1 MVP
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          <ThemeToggle />
          {generatedPage && (
            <>
              <div
                className={`flex items-center backdrop-blur-sm border rounded-2xl p-1 shadow-sm ${
                  theme === "light" ? "bg-white/60 border-white/30" : "bg-gray-800/60 border-gray-700/30"
                }`}
              >
                <Button
                  variant={viewMode === "chat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("chat")}
                  className="rounded-xl"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  对话
                </Button>
                <Button
                  variant={viewMode === "preview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("preview")}
                  className="rounded-xl"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  预览
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`rounded-2xl backdrop-blur-sm ${
                  theme === "light" ? "border-white/30 bg-white/60" : "border-gray-700/30 bg-gray-800/60"
                }`}
              >
                <Share className="w-4 h-4 mr-2" />
                分享
              </Button>
              <Button size="sm" className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <Download className="w-4 h-4 mr-2" />
                部署
              </Button>
            </>
          )}
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧会话列表 - 支持深色模式 */}
        <div
          className={`w-80 backdrop-blur-xl border-r flex flex-col transition-colors duration-300 ${
            theme === "light" ? "bg-white/60 border-white/20" : "bg-gray-900/60 border-gray-700/20"
          }`}
        >
          {/* 新建对话按钮 */}
          <div className="p-6">
            <Button
              onClick={createNewSession}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              新建对话
            </Button>
          </div>

          {/* 会话列表 */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-3 pb-6">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 cursor-pointer transition-all duration-300 rounded-2xl hover:scale-[1.02] ${
                      currentSession?.id === session.id
                        ? theme === "light"
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200/50 shadow-md"
                          : "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500/30 shadow-md"
                        : theme === "light"
                          ? "bg-white/40 backdrop-blur-sm border border-white/30 hover:bg-white/60"
                          : "bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 hover:bg-gray-800/60"
                    }`}
                    onClick={() => selectSession(session.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-semibold text-sm truncate ${
                            theme === "light" ? "text-gray-800" : "text-gray-200"
                          }`}
                        >
                          {session.title}
                        </h3>
                        <p className={`text-xs mt-1 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                          {session.created_at.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center p-4 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                  <p className="text-sm">暂无对话记录</p>
                  <p className="text-xs mt-1">点击上方按钮开始新对话</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 flex flex-col">
          {viewMode === "chat" ? (
            <>
              {currentSession ? (
                <>
                  {/* 消息列表 */}
                  <ScrollArea className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                      {(currentSession.messages || []).map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          onOptionClick={handleOptionClick}
                          isGenerating={isGenerating}
                          theme={theme}
                        />
                      ))}
                      {isGenerating && (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                          </div>
                          <div
                            className={`flex items-center gap-3 backdrop-blur-sm rounded-2xl px-4 py-3 border ${
                              theme === "light" ? "bg-white/60 border-white/30" : "bg-gray-800/60 border-gray-700/30"
                            }`}
                          >
                            <Sparkles className="w-5 h-5 animate-spin text-blue-500" />
                            <span className={`font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                              AI 正在思考...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* 输入区域 - 支持深色模式 */}
                  <div
                    className={`p-6 backdrop-blur-xl border-t transition-colors duration-300 ${
                      theme === "light" ? "bg-white/40 border-white/20" : "bg-gray-900/40 border-gray-700/20"
                    }`}
                  >
                    <div className="max-w-4xl mx-auto">
                      <div
                        className={`relative flex items-center gap-3 backdrop-blur-sm rounded-3xl border shadow-lg p-2 ${
                          theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
                        }`}
                      >
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="输入消息..."
                          className={`flex-1 border-0 bg-transparent focus:ring-0 px-4 py-3 text-base rounded-2xl ${
                            theme === "light"
                              ? "text-gray-800 placeholder:text-gray-500"
                              : "text-gray-200 placeholder:text-gray-400"
                          }`}
                          disabled={isGenerating}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-2xl w-10 h-10 p-0 ${
                            theme === "light"
                              ? "text-gray-500 hover:text-gray-700"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isGenerating}
                          className="rounded-2xl w-12 h-12 p-0 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // 空状态 - 支持深色模式
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-lg">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                      <Sparkles className="w-16 h-16 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold mb-3 ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}>
                      在时刻准备着。
                    </h3>
                    <p
                      className={`text-lg leading-relaxed mb-8 ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      告诉我你想要创建什么样的 MorphID 页面，我会帮你一步步完成
                    </p>
                    <div className="relative">
                      <div
                        className={`flex items-center gap-3 backdrop-blur-sm rounded-3xl border shadow-xl p-2 ${
                          theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
                        }`}
                      >
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="询问任何问题"
                          className={`flex-1 border-0 bg-transparent focus:ring-0 px-6 py-4 text-lg rounded-2xl ${
                            theme === "light"
                              ? "text-gray-800 placeholder:text-gray-500"
                              : "text-gray-200 placeholder:text-gray-400"
                          }`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-2xl w-12 h-12 p-0 ${
                            theme === "light"
                              ? "text-gray-500 hover:text-gray-700"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          <Mic className="w-6 h-6" />
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim()}
                          className="rounded-2xl w-14 h-14 p-0 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Send className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // 预览界面
            <div
              className={`flex-1 overflow-auto backdrop-blur-sm ${
                theme === "light" ? "bg-white/40" : "bg-gray-900/40"
              }`}
            >
              {previewPage ? (
                <PageRenderer page={previewPage} isPreview />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={`text-lg ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>暂无预览内容</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 更新消息气泡组件以支持深色模式
interface MessageBubbleProps {
  message: ChatMessage
  onOptionClick: (option: any) => void
  isGenerating: boolean
  theme: "light" | "dark"
}

function MessageBubble({ message, onOptionClick, isGenerating, theme }: MessageBubbleProps) {
  const isUser = message.type === "user"

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className="flex-shrink-0">
        {isUser ? (
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              theme === "light"
                ? "bg-gradient-to-br from-gray-400 to-gray-600"
                : "bg-gradient-to-br from-gray-500 to-gray-700"
            }`}
          >
            <User className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-3`}>
        <div
          className={`px-6 py-4 rounded-3xl shadow-lg backdrop-blur-sm border ${
            isUser
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-white/20"
              : theme === "light"
                ? "bg-white/80 text-gray-800 border-white/30"
                : "bg-gray-800/80 text-gray-200 border-gray-700/30"
          }`}
        >
          <div className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</div>
        </div>

        {/* 选项按钮 - 支持深色模式 */}
        {!isUser && message.metadata?.options && (
          <div className="flex flex-wrap gap-3 mt-2">
            {(message.metadata.options || []).map((option: any) => (
              <Button
                key={option.id}
                variant={option.type === "action" ? "default" : "outline"}
                size="sm"
                onClick={() => onOptionClick(option)}
                disabled={isGenerating}
                className={`rounded-2xl transition-all duration-300 hover:scale-105 ${
                  option.type === "action"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg text-white"
                    : theme === "light"
                      ? "bg-white/60 backdrop-blur-sm border-white/30 hover:bg-white/80"
                      : "bg-gray-800/60 backdrop-blur-sm border-gray-700/30 hover:bg-gray-800/80 text-gray-200"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        <div className={`text-xs px-2 ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  )
}
