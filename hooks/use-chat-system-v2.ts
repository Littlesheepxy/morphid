"use client"

import { useState, useCallback } from "react"
// 移除对agentOrchestrator的导入，客户端应该通过API调用后端
// import { agentOrchestrator } from "@/lib/utils/agent-orchestrator"
import { SessionData } from "@/lib/types/session"
import { StreamableAgentResponse } from "@/lib/types/streaming"
import { DEFAULT_MODEL } from "@/types/models"
import { useTitleGeneration } from "./use-title-generation"

export function useChatSystemV2() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [streamingResponses, setStreamingResponses] = useState<StreamableAgentResponse[]>([])
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // 🆕 集成标题生成功能
  const titleGeneration = useTitleGeneration({
    onTitleGenerated: (conversationId, title) => {
      console.log(`📝 [标题生成] 会话 ${conversationId} 标题已生成: "${title}"`);
      // 更新会话标题
      setSessions(prev => 
        prev.map(session => 
          session.id === conversationId 
            ? { ...session, title, titleGeneratedAt: new Date().toISOString() }
            : session
        )
      );
      // 如果是当前会话，也更新当前会话
      setCurrentSession(prev => 
        prev?.id === conversationId 
          ? { ...prev, title, titleGeneratedAt: new Date().toISOString() }
          : prev
      );
    },
    onError: (error) => {
      console.error('❌ [标题生成] 失败:', error);
    }
  })

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

        // 🔧 修复：更严格的会话检查逻辑
        let targetSession = currentSession;
        
        console.log('📋 [发送消息] 检查会话状态:', {
          hasCurrentSession: !!currentSession,
          sessionId: currentSession?.id,
          sessionStatus: currentSession?.status,
          hasConversationHistory: !!currentSession?.conversationHistory,
          conversationLength: currentSession?.conversationHistory?.length || 0
        });

        // 🔧 修复：只有在真正没有会话或会话已废弃时才创建新会话
        if (!targetSession || targetSession.status === 'abandoned' || !targetSession.id) {
          console.log('📝 [发送消息] 当前无有效会话，创建新会话...');
          targetSession = await createNewSession();
          if (!targetSession) {
            throw new Error("无法创建或获取会话")
          }
        } else {
          console.log('✅ [发送消息] 使用现有会话:', targetSession.id);
        }

        // 🔧 处理会话恢复
        if (option?.type === 'session_recovered') {
          console.log('🔄 [会话恢复] 检测到会话恢复请求:', option);
          
          // 更新会话ID
          if (option.newSessionId && targetSession) {
            const newSession = {
              ...targetSession,
              id: option.newSessionId
            };
            
            setCurrentSession(newSession);
            setSessions((prev) => prev.map((s) => (s.id === targetSession!.id ? newSession : s)));
            
            // 如果需要重新生成，发送重新生成请求
            if (option.needsRegenerate) {
              console.log('🔄 [会话恢复] 需要重新生成消息:', option.messageId);
              setTimeout(() => {
                sendMessage('', {
                  type: 'regenerate',
                  messageId: option.messageId
                });
              }, 100);
            }
          }
          
          return;
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

        // 🔧 修复：立即更新会话历史并强制状态更新
        const updatedSession = {
          ...targetSession,
          conversationHistory: [...targetSession.conversationHistory, userMessage],
          metadata: {
            ...targetSession.metadata,
            lastActive: new Date(),
            metrics: {
              ...targetSession.metadata.metrics,
              userInteractions: targetSession.metadata.metrics.userInteractions + 1
            }
          }
        }

        // 🔧 修复：立即更新状态，确保用户消息立即显示
        setCurrentSession(updatedSession)
        setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)))
        
        // 🔧 修复：更新目标会话引用
        targetSession = updatedSession

        // 🔧 修复：通过API调用后端进行消息处理
        if (option && !option.forceAgent && !option.testMode) {
          // 处理用户交互（不包含forceAgent和testMode的情况）
          const response = await fetch('/api/chat/interact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: targetSession.id,
              interactionType: 'interaction',
              data: {
                ...option,
                message: content // 🔧 修复：确保用户的实际消息被传递
              }
            })
          });

          if (!response.ok) {
            throw new Error(`交互API调用失败: ${response.status}`);
          }

          // 检查是否是流式响应
          const contentType = response.headers.get('content-type');
          console.log('📡 [响应类型] Content-Type:', contentType);
          
          if (contentType?.includes('text/event-stream') || contentType?.includes('text/plain')) {
            console.log('🌊 [流式响应] 开始处理流式数据');
            await handleStreamingResponse(response, targetSession);
          } else {
            console.log('📄 [普通响应] 处理JSON响应');
            const result = await response.json();
            if (result.success) {
              console.log('✅ 交互处理成功:', result);
            } else {
              throw new Error(result.error || '交互处理失败');
            }
          }
        } else {
          // 常规消息处理（包括forceAgent和testMode）
          const requestBody: any = {
            sessionId: targetSession.id,
            message: content
          };

          // 🔧 修复：支持context参数传递
          if (option?.forceAgent) {
            requestBody.forceAgent = option.forceAgent;
          }
          if (option?.testMode) {
            requestBody.testMode = option.testMode;
          }
          if (option?.context) {
            requestBody.context = option.context;
          }

          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
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
    let streamingMessageId: string | null = null;
    let streamingMessageIndex: number = -1;
    let updateCount = 0; // 🆕 跟踪更新次数
    let lastUpdateTime = 0; // 🆕 跟踪最后更新时间
    const UPDATE_THROTTLE = 100; // 🆕 限制更新频率为100ms
    
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
              
              // 🔧 修复：增加调试日志，帮助排查问题
              console.log('📦 [流式数据] 第', updateCount + 1, '次更新:', {
                type: chunk.type || 'unknown',
                hasReply: !!chunk.immediate_display?.reply,
                replyLength: chunk.immediate_display?.reply?.length || 0,
                replyPreview: chunk.immediate_display?.reply?.slice(0, 50) + '...',
                messageId: chunk.system_state?.metadata?.message_id,
                streamType: chunk.system_state?.metadata?.stream_type,
                isFinal: chunk.system_state?.metadata?.is_final
              });
              
              // 🆕 添加完整的chunk数据结构调试
              console.log('🔍 [完整数据结构]', JSON.stringify(chunk, null, 2));
              
              // 🔧 修复：处理不同格式的流式数据
              // 检查是否是流式更新消息
              const isStreamUpdate = chunk.system_state?.metadata?.is_update;
              const messageId = chunk.system_state?.metadata?.message_id;
              const streamType = chunk.system_state?.metadata?.stream_type;
              const isFinal = chunk.system_state?.metadata?.is_final;

              // 🔧 关键修复：处理StreamableAgentResponse格式
              let replyContent = null;
              let agentName = 'system';
              let hasValidReply = false;

              // 主要格式: StreamableAgentResponse (后端标准格式)
              if (chunk.immediate_display?.reply) {
                replyContent = chunk.immediate_display.reply;
                agentName = chunk.immediate_display.agent_name || 'system';
                hasValidReply = true;
                console.log('🎯 [数据格式] StreamableAgentResponse格式，内容长度:', replyContent.length);
              }
              // 备用格式1: 标准的agent_response格式
              else if (chunk.type === 'agent_response' && chunk.immediate_display?.reply) {
                replyContent = chunk.immediate_display.reply;
                agentName = chunk.immediate_display.agent_name || 'system';
                hasValidReply = true;
                console.log('🎯 [数据格式] agent_response格式');
              }
              // 备用格式2: 直接包含content的格式
              else if (chunk.content) {
                replyContent = chunk.content;
                agentName = chunk.agent_name || chunk.agent || 'system';
                hasValidReply = true;
                console.log('🎯 [数据格式] 直接content格式');
              }
              // 备用格式3: 从data中提取
              else if (chunk.data?.immediate_display?.reply) {
                replyContent = chunk.data.immediate_display.reply;
                agentName = chunk.data.immediate_display.agent_name || 'system';
                hasValidReply = true;
                console.log('🎯 [数据格式] data.immediate_display格式');
              }
              else {
                console.log('⚠️ [数据格式] 未识别的数据格式:', Object.keys(chunk));
                console.log('⚠️ [数据内容] 完整chunk:', chunk);
              }

              if (hasValidReply && replyContent) {
                const now = Date.now();
                
                // 🔧 修复：移除限流逻辑，确保所有流式更新都能及时显示
                // const shouldUpdate = isFinal || streamType === 'complete' || 
                //                    (now - lastUpdateTime) >= UPDATE_THROTTLE;
                
                // if (!shouldUpdate && !isFinal) {
                //   updateCount++;
                //   continue; // 跳过这次更新
                // }
                
                // 确保所有更新都能被处理
                const shouldUpdate = true;
                
                lastUpdateTime = now;
                updateCount++;
                
                // 🔧 修复：检查是否为流式消息更新
                const isStreamingMode = !chunk.system_state?.done;
                const currentMessageId: string = streamingMessageId || `stream-${Date.now()}`;

                if (streamingMessageId && streamingMessageIndex >= 0) {
                  // 🔄 更新现有流式消息
                  console.log(`🔄 [流式更新] 更新消息 ${streamingMessageId}, 第${updateCount}次, 内容长度: ${replyContent.length}`);
                  
                  if (streamingMessageIndex < session.conversationHistory.length) {
                    session.conversationHistory[streamingMessageIndex] = {
                      ...session.conversationHistory[streamingMessageIndex],
                      content: replyContent,
                      timestamp: new Date(),
                      metadata: {
                        ...session.conversationHistory[streamingMessageIndex].metadata,
                        streaming: isStreamingMode,
                        lastUpdate: new Date(),
                        updateCount: updateCount,
                        // 保存system_state中的metadata
                        ...(chunk.system_state?.metadata || {})
                      }
                    };
                    
                    // 🆕 专门处理projectFiles数据
                    if (chunk.system_state?.metadata?.projectFiles && session.conversationHistory[streamingMessageIndex]?.metadata) {
                      console.log('🎯 [文件数据] 更新projectFiles:', chunk.system_state.metadata.projectFiles.length, '个文件');
                      session.conversationHistory[streamingMessageIndex].metadata!.projectFiles = chunk.system_state.metadata.projectFiles;
                    }
                    
                    // 🆕 专门处理fileCreationProgress数据
                    if (chunk.system_state?.metadata?.fileCreationProgress && session.conversationHistory[streamingMessageIndex]?.metadata) {
                      console.log('🎯 [文件状态] 更新fileCreationProgress:', chunk.system_state.metadata.fileCreationProgress);
                      session.conversationHistory[streamingMessageIndex].metadata!.fileCreationProgress = chunk.system_state.metadata.fileCreationProgress;
                    }
                    
                    setCurrentSession({ ...session });
                    setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                  }
                } else {
                  // 🆕 创建新的流式消息
                  console.log(`🆕 [流式创建] 创建新的流式消息, 内容长度: ${replyContent.length}`);
                  
                  const agentMessage = {
                    id: `msg-${Date.now()}-agent-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date(),
                    type: 'agent_response' as const,
                    agent: agentName,
                    content: replyContent,
                    metadata: { 
                      streaming: isStreamingMode,
                      stream_message_id: currentMessageId,
                      updateCount: 1,
                      interaction: chunk.interaction,
                      // 保存system_state中的所有metadata
                      ...(chunk.system_state?.metadata || {})
                    }
                  };
                  
                  // 🆕 专门处理projectFiles数据
                  if (chunk.system_state?.metadata?.projectFiles) {
                    console.log('🎯 [文件数据] 新消息包含projectFiles:', chunk.system_state.metadata.projectFiles.length, '个文件');
                    (agentMessage.metadata as any).projectFiles = chunk.system_state.metadata.projectFiles;
                  }
                  
                  // 🆕 专门处理fileCreationProgress数据
                  if (chunk.system_state?.metadata?.fileCreationProgress) {
                    console.log('🎯 [文件状态] 新消息包含fileCreationProgress:', chunk.system_state.metadata.fileCreationProgress);
                    (agentMessage.metadata as any).fileCreationProgress = chunk.system_state.metadata.fileCreationProgress;
                  }
                  
                  session.conversationHistory.push(agentMessage);
                  streamingMessageIndex = session.conversationHistory.length - 1;
                  streamingMessageId = currentMessageId;
                  setCurrentSession({ ...session });
                  setSessions((prev) => prev.map((s) => (s.id === session.id ? session : s)));
                }
                
                // 🔧 关键修复：如果是完成状态，清理流式状态
                if (chunk.system_state?.done) {
                  console.log(`✅ [流式完成] 消息流式处理完成，总计${updateCount}次更新`);
                  streamingMessageId = null;
                  streamingMessageIndex = -1;
                }
                
                messageReceived = true;
              }
              
              // 🆕 检查是否需要生成标题
              if (messageReceived && session.conversationHistory.length >= 3 && !session.title) {
                console.log('🎯 [标题生成] 触发自动标题生成...');
                titleGeneration.maybeGenerateTitle(
                  session.id, 
                  session.conversationHistory.length, 
                  Boolean(session.title)
                );
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

  // 🆕 更新会话标题
  const updateSessionTitle = useCallback(
    (sessionId: string, title: string) => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, title, titleGeneratedAt: new Date().toISOString() }
            : session
        )
      );
      
      if (currentSession?.id === sessionId) {
        setCurrentSession((prev) => 
          prev ? { ...prev, title, titleGeneratedAt: new Date().toISOString() } : prev
        );
      }
    },
    [currentSession]
  );

  // 🆕 分享会话
  const shareSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) {
          throw new Error('会话不存在');
        }

        // 这里可以实现分享逻辑，比如生成分享链接
        const shareData = {
          pageId: sessionId,
          pageTitle: session.title || `会话 ${sessionId.slice(-6)}`,
          pageContent: session.conversationHistory,
          conversationHistory: session.conversationHistory
        };

        const response = await fetch('/api/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'link',
            config: {
              title: shareData.pageTitle,
              description: '来自HeysMe的AI会话',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
              allowedViewers: [],
              analytics: true
            },
            ...shareData
          })
        });

        if (!response.ok) {
          throw new Error('分享失败');
        }

        const result = await response.json();
        
        // 复制分享链接到剪贴板
        if (result.data?.shareUrl) {
          await navigator.clipboard.writeText(result.data.shareUrl);
          console.log('✅ [分享] 分享链接已复制到剪贴板');
        }

        return result.data;
      } catch (error) {
        console.error('❌ [分享] 分享失败:', error);
        throw error;
      }
    },
    [sessions]
  );

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
    
    // 🆕 新增的标题和分享功能
    updateSessionTitle,
    shareSession,
    
    // 🆕 标题生成相关
    titleGeneration: {
      isGenerating: titleGeneration.isGenerating,
      error: titleGeneration.error,
      generateTitle: titleGeneration.generateTitle,
      regenerateTitle: titleGeneration.regenerateTitle,
      clearError: titleGeneration.clearError,
    },
  }
} 