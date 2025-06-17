"use client"

import { useState, useCallback } from "react"
// 移除对agentOrchestrator的导入，客户端应该通过API调用后端
// import { agentOrchestrator } from "@/lib/utils/agent-orchestrator"
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
      console.log('🔄 [会话创建] 开始创建新会话...');
      
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
      
      // 🔧 检查是否已存在相同ID的会话，避免重复创建
      const existingSession = sessions.find(s => s.id === sessionId);
      if (existingSession) {
        console.log(`⚠️ [会话创建] 会话 ${sessionId} 已存在，返回现有会话`);
        setCurrentSession(existingSession);
        return existingSession;
      }
      
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

      console.log(`✅ [会话创建] 新会话创建完成: ${sessionId}`);
      return newSession

    } catch (error) {
      console.error('❌ [会话创建失败]', error);
      setCurrentError('创建会话失败，请刷新页面重试');
      
      // 如果API调用失败，回退到本地会话创建（保持兼容性）
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      console.log(`🔄 [会话创建] 回退到本地会话: ${sessionId}`);
      
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
  }, [sessions])

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
        setIsGenerating(true)
        setCurrentError(null)

        // 🔧 确保有当前会话 - 优化逻辑，避免重复创建
        let targetSession = currentSession;
        
        // 🆕 严格检查会话存在性
        console.log('📋 [发送消息] 检查会话状态:', {
          hasCurrentSession: !!currentSession,
          sessionId: currentSession?.id,
          sessionStatus: currentSession?.status
        });

        if (!targetSession || targetSession.status === 'abandoned') {
          console.log('📝 [发送消息] 当前无有效会话，创建新会话...');
          targetSession = await createNewSession();
          if (!targetSession) {
            throw new Error("无法创建或获取会话")
          }
        } else {
          console.log('✅ [发送消息] 使用现有会话:', targetSession.id);
        }

        // 添加用户消息到会话历史
        const userMessage = {
          id: `msg-${Date.now()}-user`,
          agent: 'user',
          sender: 'user',
          type: 'user_message' as const,
          content,
          timestamp: new Date(),
          metadata: { option }
        }

        targetSession.conversationHistory.push(userMessage)
        targetSession.metadata.lastActive = new Date()
        targetSession.metadata.metrics.userInteractions++

        setCurrentSession({ ...targetSession })
        setSessions((prev) => prev.map((s) => (s.id === targetSession!.id ? targetSession : s)))

        // 🔧 修复：通过API调用后端进行消息处理
        if (option) {
          // 处理用户交互
          const response = await fetch('/api/chat/interact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: targetSession.id,
              interactionType: 'interaction',
              data: option
            })
          });

          if (!response.ok) {
            throw new Error(`交互API调用失败: ${response.status}`);
          }

          // 检查是否是流式响应
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('text/event-stream')) {
            await handleStreamingResponse(response, targetSession);
          } else {
            const result = await response.json();
            if (result.success) {
              console.log('✅ 交互处理成功:', result);
            } else {
              throw new Error(result.error || '交互处理失败');
            }
          }
        } else {
          // 常规消息处理
          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: targetSession.id,
              message: content
            })
          });

          if (!response.ok) {
            throw new Error(`消息API调用失败: ${response.status}`);
          }

          // 处理流式响应
          await handleStreamingResponse(response, targetSession);
        }
        
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
        } else {
          // 🔧 修复：显示系统错误消息
          if (currentSession) {
            const systemErrorMessage = {
              id: `msg-${Date.now()}-error`,
              agent: 'system',
              sender: 'assistant', // 🔧 明确标识为助手消息
              type: 'system_event' as const,
              content: '抱歉，处理过程中出现了问题，请重试 😅',
              timestamp: new Date(),
              metadata: { error: errorMessage, retryCount }
            }

            currentSession.conversationHistory.push(systemErrorMessage)
            setCurrentSession({ ...currentSession })
            setSessions((prev) => prev.map((s) => (s.id === currentSession!.id ? currentSession : s)))
          }
        }
      } finally {
        // 🔧 修复：确保在处理完成后关闭加载状态
        setIsGenerating(false);
      }
    },
    [currentSession, createNewSession, retryCount]
  )

  // 新增：处理流式响应的辅助函数
  const handleStreamingResponse = async (response: Response, session: SessionData) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    let buffer = '';
    let messageReceived = false;
    let streamingMessageId: string | null = null; // 🆕 跟踪流式消息ID
    let streamingMessageIndex: number = -1; // 🆕 跟踪流式消息在数组中的位置
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('🔄 [流式响应] 读取完成');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              console.log('✅ [流式完成] 所有数据接收完毕');
              break;
            }
            
            try {
              const chunk = JSON.parse(data);
              console.log('📦 [流式数据]', {
                type: chunk.type || 'unknown',
                hasImmediate: !!chunk.immediate_display,
                hasReply: !!chunk.immediate_display?.reply,
                replyLength: chunk.immediate_display?.reply?.length || 0,
                isUpdate: chunk.system_state?.metadata?.is_update,
                messageId: chunk.system_state?.metadata?.message_id,
                streamType: chunk.system_state?.metadata?.stream_type
              });
              
              // 🔧 修复：处理流式更新逻辑
              let shouldProcessResponse = false;
              let agentMessage: any = null;

              // 检查是否是流式更新消息
              const isStreamUpdate = chunk.system_state?.metadata?.is_update;
              const messageId = chunk.system_state?.metadata?.message_id;
              const streamType = chunk.system_state?.metadata?.stream_type;

              if (chunk.type === 'agent_response' && chunk.immediate_display?.reply) {
                shouldProcessResponse = true;
                
                if (isStreamUpdate && messageId) {
                  // 🔄 这是一个流式更新，查找并更新现有消息
                  if (streamingMessageId === messageId && streamingMessageIndex >= 0) {
                    // 更新现有消息
                    console.log(`🔄 [流式更新] 更新消息 ${messageId} 在位置 ${streamingMessageIndex}`);
                    // 找到消息在conversation history中的位置并更新
                    const messageIndex = session.conversationHistory.findIndex(msg => 
                      msg.metadata?.stream_message_id === messageId
                    );
                    
                    if (messageIndex >= 0) {
                      session.conversationHistory[messageIndex] = {
                        ...session.conversationHistory[messageIndex],
                        content: chunk.immediate_display.reply,
                        timestamp: new Date(),
                        metadata: {
                          ...session.conversationHistory[messageIndex].metadata,
                          streaming: streamType !== 'complete'
                        }
                      };
                      
                      setCurrentSession({ ...session });
                      setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                    }
                  } else {
                    // 首次流式消息，创建新消息
                    console.log(`🆕 [流式创建] 创建新的流式消息 ${messageId}`);
                    agentMessage = {
                      id: `msg-${Date.now()}-agent-${messageId}`,
                      timestamp: new Date(),
                      type: 'agent_response' as const,
                      agent: chunk.immediate_display.agent_name || 'system',
                      content: chunk.immediate_display.reply,
                      metadata: { 
                        streaming: streamType !== 'complete',
                        stream_message_id: messageId
                      }
                    };
                    
                    session.conversationHistory.push(agentMessage);
                    streamingMessageIndex = session.conversationHistory.length - 1;
                    streamingMessageId = messageId;
                    setCurrentSession({ ...session });
                    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                  }
                } else {
                  // 🎯 普通消息，创建新消息
                  console.log(`📝 [普通消息] 创建新消息`);
                  agentMessage = {
                    id: `msg-${Date.now()}-agent-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date(),
                    type: 'agent_response' as const,
                    agent: chunk.immediate_display.agent_name || 'system',
                    content: chunk.immediate_display.reply,
                    metadata: { 
                      interaction: chunk.interaction
                    }
                  };
                  
                  session.conversationHistory.push(agentMessage);
                  setCurrentSession({ ...session });
                  setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                }
                
                messageReceived = true;
              }
              
              // 检查是否需要生成页面
              const systemState = chunk.data?.system_state || chunk.system_state;
              if (systemState?.metadata?.readyToGenerate || systemState?.metadata?.ready_for_design) {
                console.log('🎨 [页面生成] 触发页面生成...');
                generatePage(session);
              }

              // 处理轮次限制推进
              if (systemState?.metadata?.force_advance) {
                console.log('⏰ [轮次限制] 强制推进到下一阶段');
                // 存储到 metadata 中的自定义属性
                (session.metadata as any).turnCount = systemState.metadata.final_turn;
              }

              // 处理LLM决策标识
              if (systemState?.metadata?.llm_decision) {
                console.log('🧠 [LLM决策] 基于大模型判断的状态变更');
                // 可以在这里添加特殊的UI提示
              }

              // 更新收集进度
              if (systemState?.metadata?.collection_progress !== undefined) {
                if (session.metadata?.progress) {
                  (session.metadata.progress as any).collectionProgress = systemState.metadata.collection_progress;
                }
              }

              // 如果流程完成
              if (systemState?.intent === 'done' && systemState?.done) {
                console.log('🏁 [流程完成] 会话已完成');
                session.status = 'completed';
                setCurrentSession({ ...session });
                setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
              } else if (systemState?.intent === 'advance') {
                console.log('🚀 [阶段推进] 准备进入下一阶段');
                // 可以在这里添加阶段切换的UI反馈
              }
              
            } catch (parseError) {
              console.error('❌ [解析错误] 无法解析流式数据:', parseError);
              console.error('❌ [错误数据]:', data);
              
              // 尝试处理为普通文本
              if (data && data.trim() && data !== 'undefined') {
                messageReceived = true;
                const textMessage = {
                  id: `msg-${Date.now()}-text-${Math.random().toString(36).substr(2, 9)}`,
                  timestamp: new Date(),
                  type: 'agent_response' as const,
                  agent: 'system',
                  content: data.trim(),
                  metadata: { parseError: true }
                };
                
                session.conversationHistory.push(textMessage);
                setCurrentSession({ ...session });
                setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                console.log('📝 [文本回退] 作为普通文本处理:', data.trim().substring(0, 50) + '...');
              }
            }
          }
        }
      }
      
      // 如果没有收到任何消息，添加一个提示
      if (!messageReceived) {
        console.warn('⚠️ [流式响应] 未收到任何agent响应消息');
        const systemMessage = {
          id: `msg-${Date.now()}-system`,
          timestamp: new Date(),
          type: 'system_event' as const,
          agent: 'system',
          content: '正在处理您的请求，请稍候...',
          metadata: {}
        };
        
        session.conversationHistory.push(systemMessage);
        setCurrentSession({ ...session });
        setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
      }
      
    } catch (streamError) {
      console.error('❌ [流式响应错误]:', streamError);
      throw streamError;
    } finally {
      reader.releaseLock();
    }
    
    setRetryCount(0); // 重置重试计数
  };

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
      // 这里需要实现重置到特定阶段的功能
      console.warn("重置到特定阶段的功能尚未实现");
    }
  }, [currentSession])

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