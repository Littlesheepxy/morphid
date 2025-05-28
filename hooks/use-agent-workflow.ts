"use client"

import { useState, useCallback } from "react"
import type { ChatMessage, ChatSession } from "@/types/chat"
import { AgentWorkflowManager } from "@/lib/agents/workflow-manager"

export function useAgentWorkflow() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [workflowManager] = useState(() => new AgentWorkflowManager())

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "新的 MorphID 创建",
      messages: [],
      userInput: {},
      currentStep: "initial",
      created_at: new Date(),
      updated_at: new Date(),
    }

    workflowManager.resetWorkflow()
    setSessions((prev) => [newSession, ...prev])
    setCurrentSession(newSession)
    setGeneratedPage(null)

    // 添加欢迎消息
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "assistant",
      content:
        "👋 你好！我是 MorphID 的智能助手团队，我们将通过三个专业助手为你创建完美的职业主页：\n\n🔍 **信息收集助手** - 收集你的个人和职业信息\n📊 **分析总结助手** - 分析整理你的信息\n🎨 **页面创建助手** - 生成个性化页面\n\n让我们开始吧！",
      timestamp: new Date(),
    }

    newSession.messages.push(welcomeMessage)
    setCurrentSession(newSession)

    return newSession
  }, [workflowManager])

  const selectSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        setCurrentSession(session)
      }
    },
    [sessions],
  )

  const sendMessage = useCallback(
    async (content: string, option?: any) => {
      if (!currentSession) return

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        type: "user",
        content,
        timestamp: new Date(),
      }

      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updated_at: new Date(),
      }

      setCurrentSession(updatedSession)
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)))

      setIsGenerating(true)

      try {
        // 使用 Agent 工作流处理消息
        const result = await workflowManager.processMessage(content, selectedModel)

        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          type: "assistant",
          content: result.content,
          timestamp: new Date(),
          metadata: {
            options: result.options,
            needsDataSource: result.needsDataSource,
            workflow: result.workflow,
          },
        }

        const finalSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, aiMessage],
          currentStep: result.nextStep || updatedSession.currentStep,
        }

        setCurrentSession(finalSession)
        setSessions((prev) => prev.map((s) => (s.id === finalSession.id ? finalSession : s)))

        // 如果生成了页面，设置生成的页面
        if (result.generatedPage) {
          setGeneratedPage(result.generatedPage)
        }
      } catch (error) {
        console.error("Agent 处理失败:", error)
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          type: "assistant",
          content: "抱歉，处理您的请求时出现了错误，请重试。",
          timestamp: new Date(),
        }

        const errorSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, errorMessage],
        }

        setCurrentSession(errorSession)
        setSessions((prev) => prev.map((s) => (s.id === errorSession.id ? errorSession : s)))
      } finally {
        setIsGenerating(false)
      }
    },
    [currentSession, selectedModel, workflowManager],
  )

  const integrateDataSource = useCallback(
    async (sourceId: string, data: any) => {
      if (!currentSession) return

      try {
        await workflowManager.integrateDataSource(sourceId, data)

        const integrationMessage: ChatMessage = {
          id: `msg-${Date.now()}-integration`,
          type: "assistant",
          content: `✅ 已成功集成 ${sourceId} 数据源的信息！`,
          timestamp: new Date(),
        }

        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, integrationMessage],
          updated_at: new Date(),
        }

        setCurrentSession(updatedSession)
        setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)))
      } catch (error) {
        console.error("数据源集成失败:", error)
      }
    },
    [currentSession, workflowManager],
  )

  return {
    sessions,
    currentSession,
    isGenerating,
    generatedPage,
    selectedModel,
    setSelectedModel,
    createNewSession,
    selectSession,
    sendMessage,
    integrateDataSource,
    workflow: workflowManager.getWorkflow(),
  }
}
