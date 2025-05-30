"use client"

import { useState, useCallback } from "react"
import type { ChatMessage, ChatSession } from "@/types/chat"
import type { Intent } from "@/types/agent"
import type { UserInput } from "@/types/userInput"
import { AgentManager } from "@/lib/agents"
import { DEFAULT_MODEL } from "@/types/models"

export function useChatSystem() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL) // 使用 Claude 作为默认
  const [agentManager] = useState(() => new AgentManager())

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "新的对话",
      messages: [],
      userInput: {},
      currentStep: "initial",
      created_at: new Date(),
      updated_at: new Date(),
    }

    setSessions((prev) => [newSession, ...prev])
    setCurrentSession(newSession)
    setGeneratedPage(null)

    return newSession
  }, [])

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
      if (!currentSession) {
        // 如果没有当前会话，创建一个新的
        const newSession = createNewSession()
        setCurrentSession(newSession)
      }

      const activeSession = currentSession || {
        id: `session-${Date.now()}`,
        title: "新的对话",
        messages: [],
        userInput: {},
        currentStep: "initial",
        created_at: new Date(),
        updated_at: new Date(),
      }

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        type: "user",
        content,
        timestamp: new Date(),
      }

      const updatedSession = {
        ...activeSession,
        messages: [...(activeSession.messages || []), userMessage],
        updated_at: new Date(),
      }

      // 如果是第一条消息，进行意图识别
      if ((activeSession.messages || []).length === 0) {
        setIsGenerating(true)

        try {
          // 意图识别 - 使用选定的模型
          const intentResponse = await fetch("/api/intent-recognition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content, modelId: selectedModel }),
          })

          if (intentResponse.ok) {
            const intentResult = await intentResponse.json()
            const intent: Intent = intentResult.data

            console.log("🧠 处理意图识别结果:", intent)

            // 根据意图选择 Agent
            let agentId = "general_assistant"
            if (intent.type === "create_HeysMe" && intent.confidence > 0.7) {
              agentId = "HeysMe_creator"
              
              // 智能处理提取的信息
              if (intent.extracted_info) {
                console.log("📊 发现提取的信息:", intent.extracted_info)
                
                // 预填充用户输入
                if (intent.extracted_info.role) {
                  updatedSession.userInput.role = intent.extracted_info.role
                  console.log("✅ 预填充角色:", intent.extracted_info.role)
                }
                if (intent.extracted_info.purpose) {
                  updatedSession.userInput.purpose = intent.extracted_info.purpose
                  console.log("✅ 预填充目的:", intent.extracted_info.purpose)
                }
                if (intent.extracted_info.style) {
                  updatedSession.userInput.style = intent.extracted_info.style
                  console.log("✅ 预填充风格:", intent.extracted_info.style)
                }
                if (intent.extracted_info.display_priority) {
                  updatedSession.userInput.display_priority = intent.extracted_info.display_priority
                  console.log("✅ 预填充优先级:", intent.extracted_info.display_priority)
                }

                // 根据已有信息确定起始步骤
                let startStep = "role"
                if (updatedSession.userInput.role) {
                  startStep = "intent_clarification" // 新增意图细化步骤
                  if (updatedSession.userInput.purpose) {
                    startStep = "style"
                    if (updatedSession.userInput.style) {
                      startStep = "priority"
                      if (updatedSession.userInput.display_priority?.length) {
                        startStep = "final_confirmation"
                      }
                    }
                  }
                }
                
                updatedSession.currentStep = startStep
                console.log("🎯 智能设置起始步骤:", startStep)
              } else {
                updatedSession.currentStep = "role" // 设置初始步骤
              }
            } else if (intent.type === "edit_HeysMe" && intent.confidence > 0.7) {
              agentId = "HeysMe_editor"
            }

            agentManager.setAgent(agentId)

            // 更新会话标题
            if (intent.type === "create_HeysMe") {
              updatedSession.title = "创建 HeysMe"
            } else if (intent.type === "edit_HeysMe") {
              updatedSession.title = "编辑 HeysMe"
            } else {
              updatedSession.title = content.slice(0, 20) + "..."
            }

            // 添加模型信息到会话
            if (intentResult.model) {
              const modelInfoMessage: ChatMessage = {
                id: `msg-${Date.now()}-model`,
                type: "system",
                content: `使用 ${intentResult.model} 进行意图识别`,
                timestamp: new Date(),
              }
              updatedSession.messages.push(modelInfoMessage)
            }
          }
        } catch (error) {
          console.error("意图识别失败:", error)
          agentManager.setAgent("general_assistant")
        }

        setIsGenerating(false)
      }

      // 处理选项点击
      if (option) {
        console.log("🔄 处理选项点击:", {
          option,
          currentStep: activeSession.currentStep,
          userInput: updatedSession.userInput
        })
        
        switch (option.type) {
          case "selection":
            if (activeSession.currentStep === "role" || !activeSession.currentStep) {
              updatedSession.userInput.role = option.value
              updatedSession.currentStep = "intent_clarification"
              console.log("✅ 设置角色:", option.value, "-> 下一步: intent_clarification")
            } else if (activeSession.currentStep === "intent_clarification") {
              updatedSession.userInput.intent_urgency = option.value
              updatedSession.currentStep = "purpose"
              console.log("✅ 设置意图:", option.value, "-> 下一步: purpose")
            } else if (activeSession.currentStep === "purpose") {
              updatedSession.userInput.purpose = option.value
              updatedSession.currentStep = "style"
              console.log("✅ 设置目的:", option.value, "-> 下一步: style")
            } else if (activeSession.currentStep === "style") {
              updatedSession.userInput.style = option.value
              updatedSession.currentStep = "priority"
              console.log("✅ 设置风格:", option.value, "-> 下一步: priority")
            } else if (activeSession.currentStep === "priority") {
              if (!updatedSession.userInput.display_priority) {
                updatedSession.userInput.display_priority = []
              }
              const current = updatedSession.userInput.display_priority
              if (current.includes(option.value)) {
                updatedSession.userInput.display_priority = current.filter((item) => item !== option.value)
              } else {
                updatedSession.userInput.display_priority.push(option.value)
              }
              console.log("✅ 更新优先级:", updatedSession.userInput.display_priority)
            }
            break
          case "action":
            if (option.value === "done") {
              updatedSession.currentStep = "final_confirmation"
              console.log("✅ 进入最终确认阶段")
            } else if (option.value === "confirm") {
              updatedSession.currentStep = "generate"
              console.log("✅ 开始生成阶段")
              // 开始生成页面
              generatePage(updatedSession.userInput as UserInput)
            } else if (option.value === "modify") {
              updatedSession.currentStep = "role"
              console.log("🔄 重新开始信息收集")
            }
            break
        }
      }

      console.log("💾 更新会话状态:", {
        currentStep: updatedSession.currentStep,
        userInput: updatedSession.userInput,
        messagesCount: updatedSession.messages.length
      })

      setCurrentSession(updatedSession)
      setSessions((prev) => {
        const existingIndex = prev.findIndex((s) => s.id === updatedSession.id)
        if (existingIndex >= 0) {
          const newSessions = [...prev]
          newSessions[existingIndex] = updatedSession
          return newSessions
        } else {
          return [updatedSession, ...prev]
        }
      })

      // 生成 AI 回复
      setTimeout(async () => {
        try {
          console.log("🤖 调用AgentManager处理消息:", {
            content,
            userInput: updatedSession.userInput,
            currentStep: updatedSession.currentStep
          })
          
          // 传递当前步骤给AgentManager
          const agentResponse = await agentManager.processMessage(
            content, 
            updatedSession.userInput,
            updatedSession.currentStep // 传递当前步骤
          )

          console.log("📨 Agent响应:", {
            content: agentResponse.content,
            nextStep: agentResponse.nextStep,
            hasOptions: !!agentResponse.options,
            optionsCount: agentResponse.options?.length || 0,
            metadata: agentResponse.metadata
          })

          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            type: "assistant",
            content: agentResponse.content,
            timestamp: new Date(),
            metadata: {
              options: agentResponse.options,
              step: agentResponse.nextStep,
            },
          }

          const finalSession = {
            ...updatedSession,
            messages: [...updatedSession.messages, aiMessage],
            currentStep: agentResponse.nextStep || updatedSession.currentStep,
          }

          setCurrentSession(finalSession)
          setSessions((prev) => prev.map((s) => (s.id === finalSession.id ? finalSession : s)))

          // 检查是否需要生成页面
          if (agentResponse.metadata?.readyToGenerate) {
            generatePage(finalSession.userInput as UserInput)
          }
        } catch (error) {
          console.error("Agent 处理失败:", error)

          // 添加错误消息
          const errorMessage: ChatMessage = {
            id: `msg-${Date.now()}-error`,
            type: "assistant",
            content: "抱歉，我遇到了一些问题。请稍后再试。",
            timestamp: new Date(),
          }

          const errorSession = {
            ...updatedSession,
            messages: [...updatedSession.messages, errorMessage],
          }

          setCurrentSession(errorSession)
          setSessions((prev) => prev.map((s) => (s.id === errorSession.id ? errorSession : s)))
        }
      }, 1000)
    },
    [currentSession, agentManager, selectedModel, createNewSession],
  )

  const generatePage = useCallback(
    async (userInput: UserInput) => {
      setIsGenerating(true)

      try {
        const response = await fetch("/api/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...userInput, model_id: selectedModel }),
        })

        const result = await response.json()

        if (result.success) {
          setGeneratedPage(result.data)

          // 添加成功消息
          if (currentSession) {
            const successMessage: ChatMessage = {
              id: `msg-${Date.now()}-success`,
              type: "assistant",
              content: `🎉 太棒了！使用 ${result.model || selectedModel} 生成的 HeysMe 页面已经完成！

你可以在右侧看到预览效果。`,
              timestamp: new Date(),
              metadata: {
                options: [
                  { id: "save", label: "💾 保存页面", value: "save", type: "action" },
                  { id: "regenerate", label: "🔄 重新生成", value: "regenerate", type: "action" },
                  { id: "deploy", label: "🚀 立即部署", value: "deploy", type: "action" },
                ],
              },
            }

            const updatedSession = {
              ...currentSession,
              messages: [...currentSession.messages, successMessage],
              currentStep: "complete",
            }

            setCurrentSession(updatedSession)
            setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)))
          }
        } else {
          throw new Error(result.error || "生成页面失败")
        }
      } catch (error) {
        console.error("生成页面失败:", error)

        // 添加错误消息
        if (currentSession) {
          const errorMessage: ChatMessage = {
            id: `msg-${Date.now()}-error`,
            type: "assistant",
            content: "抱歉，生成页面时遇到了问题。请稍后再试。",
            timestamp: new Date(),
          }

          const updatedSession = {
            ...currentSession,
            messages: [...currentSession.messages, errorMessage],
          }

          setCurrentSession(updatedSession)
          setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)))
        }
      } finally {
        setIsGenerating(false)
      }
    },
    [currentSession, selectedModel],
  )

  const clearChat = useCallback(() => {
    setCurrentSession(null)
    setGeneratedPage(null)
  }, [])

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setGeneratedPage(null)
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
    setSelectedModel,
    createNewSession,
    selectSession,
    sendMessage,
    generatePage,
    clearChat,
    deleteSession,
  }
}
