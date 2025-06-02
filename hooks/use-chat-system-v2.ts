"use client"

import { useState, useCallback } from "react"
import { AgentOrchestrator } from "@/lib/utils/agent-orchestrator"
import { SessionData } from "@/lib/types/session"
import { StreamableAgentResponse } from "@/lib/types/streaming"
import { DEFAULT_MODEL } from "@/types/models"

export function useChatSystemV2() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [agentOrchestrator] = useState(() => new AgentOrchestrator())
  const [streamingResponses, setStreamingResponses] = useState<StreamableAgentResponse[]>([])
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const createNewSession = useCallback(() => {
    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      status: 'active',
      userIntent: {
        type: 'career_guidance',
        target_audience: 'internal_review',
        urgency: 'exploring',
        primary_goal: '创建个人页面'
      },
      personalization: {
        identity: {
          profession: 'other',
          experience_level: 'mid'
        },
        preferences: {
          style: 'modern',
          tone: 'professional',
          detail_level: 'detailed'
        },
        context: {}
      },
      collectedData: {
        personal: {},
        professional: { skills: [] },
        experience: [],
        education: [],
        projects: [],
        achievements: [],
        certifications: []
      },
      conversationHistory: [],
      agentFlow: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
        version: '1.0.0',
        progress: {
          currentStage: 'welcome',
          completedStages: [],
          totalStages: 4,
          percentage: 0
        },
        metrics: {
          totalTime: 0,
          userInteractions: 0,
          agentTransitions: 0,
          errorsEncountered: 0
        },
        settings: {
          autoSave: true,
          reminderEnabled: false,
          privacyLevel: 'private'
        }
      }
    }

    setSessions((prev) => [newSession, ...prev])
    setCurrentSession(newSession)
    setGeneratedPage(null)
    setCurrentError(null)
    setRetryCount(0)

    return newSession
  }, [])

  const selectSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        setCurrentSession(session)
        setCurrentError(null)
        setRetryCount(0)
      }
    },
    [sessions],
  )

  const sendMessage = useCallback(
    async (content: string, option?: any) => {
      try {
        setCurrentError(null)
        
        if (!currentSession) {
          // 如果没有当前会话，创建一个新的
          const newSession = createNewSession()
          return await processMessage(newSession, content, option)
        }

        return await processMessage(currentSession, content, option)
      } catch (error) {
        console.error("发送消息失败:", error)
        const errorMessage = error instanceof Error ? error.message : "未知错误"
        setCurrentError(errorMessage)
        
        // 增加错误计数
        if (currentSession) {
          currentSession.metadata.metrics.errorsEncountered++
          setCurrentSession({ ...currentSession })
        }
        
        // 如果重试次数少于3次，可以自动重试
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1)
          console.log(`自动重试 (${retryCount + 1}/3)...`)
          setTimeout(() => sendMessage(content, option), 1000 * (retryCount + 1))
        }
      }
    },
    [currentSession, createNewSession, retryCount],
  )

  const processMessage = async (session: SessionData, content: string, option?: any) => {
    try {
      // 记录用户消息到对话历史
      const userMessage = {
        id: `msg-${Date.now()}-user`,
        agent: 'user',
        type: 'user_message' as const,
        content,
        timestamp: new Date(),
        metadata: option ? { userOption: option } : undefined
      }

      session.conversationHistory.push(userMessage)
      session.metadata.updatedAt = new Date()
      session.metadata.lastActive = new Date()
      session.metadata.metrics.userInteractions++

      // 更新会话状态
      setCurrentSession({ ...session })
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))

      // 处理用户交互
      if (option) {
        const interactionResult = await agentOrchestrator.handleUserInteraction(
          session.id,
          'interaction',
          option,
          session
        )

        if (interactionResult?.action === 'advance') {
          // 推进到下一个Agent
          return await startAgentProcessing(session)
        }
      } else {
        // 常规消息处理
        return await startAgentProcessing(session, content)
      }
    } catch (error) {
      console.error("处理消息失败:", error)
      throw error
    }
  }

  const startAgentProcessing = async (session: SessionData, userInput?: string) => {
    try {
      setStreamingResponses([])
      
      // 使用 AgentOrchestrator 的流式处理
      const responseGenerator = agentOrchestrator.processUserInputStreaming(
        session.id,
        userInput || '',
        session
      )

      const responses: StreamableAgentResponse[] = []
      
      for await (const response of responseGenerator) {
        responses.push(response)
        setStreamingResponses([...responses])

        // 记录Agent响应到对话历史
        if (response.immediate_display) {
          const agentMessage = {
            id: `msg-${Date.now()}-agent`,
            agent: response.immediate_display.agent_name || 'system',
            type: 'agent_response' as const,
            content: response.immediate_display.reply,
            timestamp: new Date(),
            metadata: { 
              systemState: response.system_state,
              interaction: response.interaction
            }
          }

          session.conversationHistory.push(agentMessage)
          session.metadata.updatedAt = new Date()
        }

        // 检查是否需要生成页面
        if (response.system_state?.metadata?.readyToGenerate) {
          generatePage(session)
        }

        // 如果流程完成
        if (response.system_state?.intent === 'done' && response.system_state?.done) {
          session.status = 'completed'
          setCurrentSession({ ...session })
          setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
        }
      }

      // 更新最终状态
      setCurrentSession({ ...session })
      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
      setRetryCount(0) // 重置重试计数

    } catch (error) {
      console.error("Agent处理失败:", error)
      throw error
    }
  }

  const generatePage = useCallback(
    async (session: SessionData) => {
      setIsGenerating(true)

      try {
        // 🔧 修复：从 agentFlow 中获取设计数据，统一Agent名称匹配
        const designEntry = session.agentFlow
          .filter(entry => 
            (entry.agent === 'PromptOutputAgent' || entry.agent === 'prompt_output') && 
            entry.status === 'completed'
          )
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]

        if (!designEntry?.output) {
          console.log('❌ agentFlow内容:', session.agentFlow.map(e => ({ agent: e.agent, status: e.status })));
          throw new Error('未找到页面设计方案')
        }

        console.log('✅ 找到设计数据:', designEntry.agent);

        const response = await fetch("/api/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            designStrategy: (designEntry.output as any).designStrategy,
            collectedData: session.collectedData,
            model_id: selectedModel 
          }),
        })

        const result = await response.json()

        if (result.success) {
          setGeneratedPage(result.data)

          // 记录成功消息
          const successMessage = {
            id: `msg-${Date.now()}-success`,
            agent: 'system',
            type: 'system_event' as const,
            content: `🎉 太棒了！使用 ${result.model || selectedModel} 生成的 HeysMe 页面已经完成！`,
            timestamp: new Date(),
            metadata: { generatedPageData: result.data }
          }

          session.conversationHistory.push(successMessage)
          setCurrentSession({ ...session })
          setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
        } else {
          throw new Error(result.error || "生成页面失败")
        }
      } catch (error) {
        console.error("生成页面失败:", error)
        const errorMessage = error instanceof Error ? error.message : "生成页面失败"
        setCurrentError(errorMessage)
        
        session.metadata.metrics.errorsEncountered++
        setCurrentSession({ ...session })
      } finally {
        setIsGenerating(false)
      }
    },
    [selectedModel],
  )

  const retryCurrentOperation = useCallback(() => {
    if (currentSession && currentError) {
      const lastUserMessage = currentSession.conversationHistory
        .filter(msg => msg.agent === 'user')
        .slice(-1)[0]
      
      if (lastUserMessage) {
        setCurrentError(null)
        sendMessage(lastUserMessage.content)
      }
    }
  }, [currentSession, currentError, sendMessage])

  const resetToStage = useCallback((stageName: string) => {
    if (currentSession) {
      agentOrchestrator.resetToStage(currentSession, stageName)
      setCurrentSession({ ...currentSession })
      setSessions((prev) => prev.map((s) => (s.id === currentSession.id ? currentSession : s)))
      setCurrentError(null)
      setRetryCount(0)
    }
  }, [currentSession, agentOrchestrator])

  const clearChat = useCallback(() => {
    setCurrentSession(null)
    setGeneratedPage(null)
    setCurrentError(null)
    setRetryCount(0)
    setStreamingResponses([])
  }, [])

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setGeneratedPage(null)
        setCurrentError(null)
        setRetryCount(0)
      }
    },
    [currentSession],
  )

  return {
    sessions,
    currentSession,
    isGenerating,
    generatedPage,
    selectedModel,
    streamingResponses,
    currentError,
    retryCount,
    setSelectedModel,
    createNewSession,
    selectSession,
    sendMessage,
    generatePage,
    retryCurrentOperation,
    resetToStage,
    clearChat,
    deleteSession,
  }
} 