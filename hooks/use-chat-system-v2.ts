"use client"

import { useState, useCallback } from "react"
import { agentOrchestrator } from "@/lib/utils/agent-orchestrator"
import { SessionData } from "@/lib/types/session"
import { StreamableAgentResponse } from "@/lib/types/streaming"
import { DEFAULT_MODEL } from "@/types/models"

export function useChatSystemV2() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [streamingResponses, setStreamingResponses] = useState<StreamableAgentResponse[]>([])
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const createNewSession = useCallback(async () => {
    try {
      // 🔧 修复：通过API调用后端创建会话
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { sessionId } = await response.json();
      console.log(`✅ [前端会话创建] 后端sessionId: ${sessionId}`);
      
      // 创建前端会话数据结构，使用后端返回的sessionId
      const newSession: SessionData = {
        id: sessionId, // 🔧 使用后端返回的sessionId
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

      // 🔧 修复：将会话数据同步到后端AgentOrchestrator
      try {
        const syncResponse = await fetch('/api/session/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            sessionData: newSession
          })
        });
        
        if (syncResponse.ok) {
          console.log(`✅ [会话同步] 前端会话数据已同步到后端`);
        } else {
          console.warn(`⚠️ [会话同步] 同步失败，但继续使用本地会话`);
        }
      } catch (syncError) {
        console.warn(`⚠️ [会话同步] 同步请求失败:`, syncError);
      }

      // 确保不会有重复的session
      setSessions((prev) => {
        const filtered = prev.filter(s => s.id !== sessionId)
        return [newSession, ...filtered]
      })
      setCurrentSession(newSession)
      setGeneratedPage(null)
      setCurrentError(null)
      setRetryCount(0)

      return newSession

    } catch (error) {
      console.error('❌ [会话创建失败]', error);
      setCurrentError('创建会话失败，请刷新页面重试');
      
      // 如果API调用失败，回退到本地会话创建（保持兼容性）
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const fallbackSession: SessionData = {
        id: sessionId,
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
      
      setSessions((prev) => {
        const filtered = prev.filter(s => s.id !== sessionId)
        return [fallbackSession, ...filtered]
      })
      setCurrentSession(fallbackSession)
      setGeneratedPage(null)
      setRetryCount(0)

      return fallbackSession;
    }
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
      // 🔧 修复异步处理：如果没有会话，先创建会话
      let targetSession = currentSession;
      
      if (!targetSession) {
        console.log('🔄 [发送消息] 没有当前会话，创建新会话');
        try {
          targetSession = await createNewSession();
        } catch (error) {
          console.error('❌ [创建会话失败]', error);
          setCurrentError('创建会话失败，请重试');
          return;
        }
      }

      // 🔧 检查是否为系统消息
      const isSystemMessage = option?.sender === 'assistant' || option?.agent === 'system' || option?.type?.startsWith('system_');
      
      // 🔧 如果是系统消息，直接添加到历史记录，不需要触发Agent处理
      if (isSystemMessage) {
        const systemMessage = {
          id: `msg-${Date.now()}-system`,
          agent: option?.agent || 'system',
          sender: option?.sender || 'assistant',
          type: 'system_event' as const,
          content,
          timestamp: new Date(),
          metadata: option || {}
        };

        targetSession.conversationHistory.push(systemMessage);
        targetSession.metadata.updatedAt = new Date();
        
        // 立即更新会话状态以显示系统消息
        setCurrentSession({ ...targetSession });
        setSessions((prev) => prev.map((s) => (s.id === targetSession!.id ? targetSession : s)));
        return;
      }

      // 🔧 修复：设置加载状态
      setIsGenerating(true);
      setCurrentError(null);

      try {
        // 记录用户消息到对话历史
        const userMessage = {
          id: `msg-${Date.now()}-user`,
          agent: 'user',
          sender: 'user', // 🔧 确保有sender字段
          type: 'user_message' as const,
          content,
          timestamp: new Date(),
          metadata: option ? { userOption: option } : undefined
        }

        targetSession.conversationHistory.push(userMessage)
        targetSession.metadata.updatedAt = new Date()
        targetSession.metadata.lastActive = new Date()
        targetSession.metadata.metrics.userInteractions++

        // 立即更新会话状态以显示用户消息
        setCurrentSession({ ...targetSession })
        setSessions((prev) => prev.map((s) => (s.id === targetSession!.id ? targetSession : s)))

        // 处理用户交互
        if (option) {
          const interactionResult = await agentOrchestrator.handleUserInteraction(
            targetSession.id,
            'interaction',
            option,
            targetSession
          )

          if (interactionResult?.action === 'advance') {
            // 推进到下一个Agent
            return await startAgentProcessing(targetSession)
          }
        } else {
          // 常规消息处理
          return await startAgentProcessing(targetSession, content)
        }
        
      } catch (error) {
        console.error("发送消息失败:", error)
        const errorMessage = error instanceof Error ? error.message : "未知错误"
        setCurrentError(errorMessage)
        
        // 增加错误计数
        if (targetSession) {
          targetSession.metadata.metrics.errorsEncountered++
          setCurrentSession({ ...targetSession })
        }
        
        // 如果重试次数少于3次，可以自动重试
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1)
          console.log(`自动重试 (${retryCount + 1}/3)...`)
          setTimeout(() => sendMessage(content, option), 1000 * (retryCount + 1))
        } else {
          // 🔧 修复：显示系统错误消息
          if (targetSession) {
            const systemErrorMessage = {
              id: `msg-${Date.now()}-error`,
              agent: 'system',
              sender: 'assistant', // 🔧 明确标识为助手消息
              type: 'system_event' as const,
              content: '抱歉，处理过程中出现了问题，请重试 😅',
              timestamp: new Date(),
              metadata: { error: errorMessage, retryCount }
            }

            targetSession.conversationHistory.push(systemErrorMessage)
            setCurrentSession({ ...targetSession })
            setSessions((prev) => prev.map((s) => (s.id === targetSession!.id ? targetSession : s)))
          }
        }
      } finally {
        // 🔧 修复：确保在处理完成后关闭加载状态
        setIsGenerating(false);
      }
    },
    [currentSession, createNewSession, agentOrchestrator, retryCount]
  )

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
            sender: 'assistant', // 🔧 确保有sender字段用于MessageBubble识别
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
          
          // 🔧 立即更新会话状态以显示Agent消息
          setCurrentSession({ ...session })
          setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)))
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
    } finally {
      // 🔧 确保在Agent处理完成后关闭加载状态
      setIsGenerating(false);
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
      agentOrchestrator.resetSessionToStage(currentSession.id, stageName)
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