"use client"

import { useState, useCallback } from "react"
import type { ChatMessage, ChatSession, ChatOption } from "@/types/chat"
import type { UserInput } from "@/types/HeysMe"

export function useChat() {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)

  const startNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "新的 HeysMe",
      messages: [],
      userInput: {},
      currentStep: "welcome",
      created_at: new Date(),
      updated_at: new Date(),
    }

    // 添加欢迎消息
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "assistant",
      content: "👋 你好！我是 HeysMe AI 助手，我将帮助你创建一个专业的职业主页。\n\n让我们从了解你的身份开始吧！",
      timestamp: new Date(),
      metadata: {
        step: "role",
        options: [
          { id: "ai-engineer", label: "🤖 AI 工程师", value: "AI工程师", type: "selection" },
          { id: "designer", label: "🎨 设计师", value: "设计师", type: "selection" },
          { id: "developer", label: "💻 开发者", value: "开发者", type: "selection" },
          { id: "student", label: "🎓 学生", value: "学生", type: "selection" },
          { id: "freelancer", label: "🌟 自由职业者", value: "自由职业者", type: "selection" },
          { id: "custom", label: "✍️ 自定义", value: "custom", type: "input" },
        ],
      },
    }

    newSession.messages.push(welcomeMessage)
    setCurrentSession(newSession)
  }, [])

  const sendMessage = useCallback(
    async (content: string, option?: ChatOption) => {
      if (!currentSession) return

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

      // 更新用户输入数据
      if (option) {
        switch (currentSession.currentStep) {
          case "role":
            updatedSession.userInput.role = option.value === "custom" ? content : option.value
            updatedSession.currentStep = "purpose"
            break
          case "purpose":
            updatedSession.userInput.purpose = option.value === "custom" ? content : option.value
            updatedSession.currentStep = "style"
            break
          case "style":
            updatedSession.userInput.style = option.value === "custom" ? content : option.value
            updatedSession.currentStep = "priority"
            break
          case "priority":
            if (!updatedSession.userInput.display_priority) {
              updatedSession.userInput.display_priority = []
            }
            if (option.value === "done") {
              updatedSession.currentStep = "generate"
            } else {
              const current = updatedSession.userInput.display_priority
              if (current.includes(option.value)) {
                updatedSession.userInput.display_priority = current.filter((item) => item !== option.value)
              } else {
                updatedSession.userInput.display_priority.push(option.value)
              }
            }
            break
        }
      }

      setCurrentSession(updatedSession)

      // 生成 AI 回复
      setTimeout(() => {
        const aiResponse = generateAIResponse(updatedSession.currentStep, updatedSession.userInput)
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          type: "assistant",
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: aiResponse.metadata,
        }

        const finalSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, aiMessage],
          currentStep: aiResponse.nextStep || updatedSession.currentStep,
        }

        setCurrentSession(finalSession)

        // 如果到了生成步骤，调用页面生成
        if (finalSession.currentStep === "generate") {
          generatePage(finalSession.userInput as UserInput)
        }
      }, 1000)
    },
    [currentSession],
  )

  const generatePage = useCallback(
    async (userInput: UserInput) => {
      setIsGenerating(true)

      try {
        const response = await fetch("/api/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userInput),
        })

        const result = await response.json()

        if (result.success) {
          setGeneratedPage(result.data)

          // 添加成功消息
          if (currentSession) {
            const successMessage: ChatMessage = {
              id: `msg-${Date.now()}-success`,
              type: "assistant",
              content:
                "🎉 太棒了！你的 HeysMe 页面已经生成完成！\n\n你可以在右侧看到预览效果。如果满意的话，可以保存并分享给其他人。",
              timestamp: new Date(),
              metadata: {
                options: [
                  { id: "save", label: "💾 保存页面", value: "save", type: "action" },
                  { id: "regenerate", label: "🔄 重新生成", value: "regenerate", type: "action" },
                  { id: "edit", label: "✏️ 手动编辑", value: "edit", type: "action" },
                ],
              },
            }

            setCurrentSession({
              ...currentSession,
              messages: [...currentSession.messages, successMessage],
              currentStep: "complete",
            })
          }
        }
      } catch (error) {
        console.error("生成页面失败:", error)
      } finally {
        setIsGenerating(false)
      }
    },
    [currentSession],
  )

  return {
    currentSession,
    isGenerating,
    generatedPage,
    startNewSession,
    sendMessage,
  }
}

function generateAIResponse(step: string, userInput: Partial<UserInput>) {
  switch (step) {
    case "purpose":
      return {
        content: `很好！${userInput.role} 是一个很棒的身份。\n\n现在告诉我，你创建这个页面的主要目的是什么？`,
        metadata: {
          step: "purpose",
          options: [
            { id: "job", label: "🔍 寻找工作机会", value: "寻找工作机会", type: "selection" },
            { id: "showcase", label: "🎯 展示作品技能", value: "展示作品技能", type: "selection" },
            { id: "network", label: "🤝 拓展人脉网络", value: "拓展人脉网络", type: "selection" },
            { id: "business", label: "💼 商务合作", value: "商务合作", type: "selection" },
            { id: "personal", label: "✨ 个人品牌建设", value: "个人品牌建设", type: "selection" },
            { id: "custom", label: "✍️ 其他目的", value: "custom", type: "input" },
          ],
        },
        nextStep: "purpose",
      }

    case "style":
      return {
        content: `明白了，${userInput.purpose} 是很明确的目标！\n\n接下来选择你喜欢的设计风格：`,
        metadata: {
          step: "style",
          options: [
            { id: "zen", label: "🧘 极简禅意", value: "极简禅意", type: "selection" },
            { id: "creative", label: "🎨 创意炫酷", value: "创意炫酷", type: "selection" },
            { id: "tech", label: "⚡ 科技未来", value: "科技未来", type: "selection" },
            { id: "professional", label: "💼 商务专业", value: "商务专业", type: "selection" },
            { id: "bold", label: "🔥 大胆前卫", value: "大胆前卫", type: "selection" },
          ],
        },
        nextStep: "style",
      }

    case "priority":
      return {
        content: `${userInput.style} 风格很不错！\n\n最后，选择你想要重点展示的内容（可以选择多个）：`,
        metadata: {
          step: "priority",
          options: [
            { id: "projects", label: "🚀 项目作品", value: "projects", type: "selection" },
            { id: "skills", label: "💡 技能专长", value: "skills", type: "selection" },
            { id: "experience", label: "💼 工作经历", value: "experience", type: "selection" },
            { id: "education", label: "🎓 教育背景", value: "education", type: "selection" },
            { id: "articles", label: "📝 文章博客", value: "articles", type: "selection" },
            { id: "social", label: "🌐 社交媒体", value: "social", type: "selection" },
            { id: "done", label: "✅ 完成选择", value: "done", type: "action" },
          ],
        },
        nextStep: "priority",
      }

    case "generate":
      return {
        content:
          "完美！我已经收集了所有信息：\n\n" +
          `👤 身份：${userInput.role}\n` +
          `🎯 目的：${userInput.purpose}\n` +
          `🎨 风格：${userInput.style}\n` +
          `📋 重点：${userInput.display_priority?.join("、")}\n\n` +
          "正在为你生成专属的 HeysMe 页面...",
        metadata: {
          step: "generating",
        },
        nextStep: "generate",
      }

    default:
      return {
        content: "让我们开始吧！",
        metadata: {},
        nextStep: step,
      }
  }
}
