import type { Agent, AgentResponse } from "@/types/agent"
import type { UserInput } from "@/types/MorphID"

export const AGENTS: Record<string, Agent> = {
  MorphID_creator: {
    id: "MorphID_creator",
    name: "MorphID 创建助手",
    description: "专门帮助用户创建个性化职业主页",
    systemPrompt: `你是 MorphID 创建助手，专门帮助用户创建个性化的职业主页。
你需要通过友好的对话收集以下信息：
1. 用户的身份角色
2. 创建页面的目的
3. 喜欢的设计风格
4. 想要展示的重点内容

请保持对话自然流畅，一次只问一个问题，并提供选项让用户快速选择。`,
    capabilities: ["collect_user_info", "generate_page_structure", "provide_suggestions"],
  },
  MorphID_editor: {
    id: "MorphID_editor",
    name: "MorphID 编辑助手",
    description: "帮助用户编辑和优化现有页面",
    systemPrompt: `你是 MorphID 编辑助手，帮助用户修改和优化现有的职业主页。
你可以帮助用户：
1. 修改页面内容
2. 调整设计风格
3. 重新组织页面结构
4. 优化展示效果`,
    capabilities: ["edit_content", "modify_style", "restructure_layout"],
  },
  general_assistant: {
    id: "general_assistant",
    name: "通用助手",
    description: "回答一般性问题和提供帮助",
    systemPrompt: `你是 MorphID 的通用助手，可以回答关于平台功能、使用方法等问题。
保持友好和专业，如果用户想要创建或编辑页面，引导他们使用相应的功能。`,
    capabilities: ["answer_questions", "provide_help", "guide_users"],
  },
}

export class AgentManager {
  private currentAgent: Agent | null = null
  private conversationState: Record<string, any> = {}

  setAgent(agentId: string) {
    this.currentAgent = AGENTS[agentId]
    this.conversationState = {}
  }

  async processMessage(message: string, userInput?: Partial<UserInput>): Promise<AgentResponse> {
    if (!this.currentAgent) {
      throw new Error("No agent selected")
    }

    switch (this.currentAgent.id) {
      case "MorphID_creator":
        return this.handleMorphIDCreation(message, userInput)
      case "MorphID_editor":
        return this.handleMorphIDEditing(message, userInput)
      default:
        return this.handleGeneralChat(message)
    }
  }

  private handleMorphIDCreation(message: string, userInput?: Partial<UserInput>): AgentResponse {
    const state = this.conversationState

    // 确定当前步骤
    if (!state.step) {
      state.step = "role"
    }

    switch (state.step) {
      case "role":
        if (!userInput?.role) {
          return {
            content: "👋 很高兴为你创建 MorphID！首先，请告诉我你的身份角色：",
            options: [
              { id: "ai-engineer", label: "🤖 AI 工程师", value: "AI工程师", type: "selection" },
              { id: "designer", label: "🎨 设计师", value: "设计师", type: "selection" },
              { id: "developer", label: "💻 开发者", value: "开发者", type: "selection" },
              { id: "student", label: "🎓 学生", value: "学生", type: "selection" },
              { id: "freelancer", label: "🌟 自由职业者", value: "自由职业者", type: "selection" },
              { id: "custom", label: "✍️ 其他", value: "custom", type: "input" },
            ],
            nextStep: "purpose",
          }
        } else {
          state.step = "purpose"
          return this.handleMorphIDCreation("", userInput)
        }

      case "purpose":
        if (!userInput?.purpose) {
          return {
            content: `很好！${userInput?.role || ""}，现在告诉我你创建这个页面的主要目的：`,
            options: [
              { id: "job", label: "🔍 寻找工作机会", value: "寻找工作机会", type: "selection" },
              { id: "showcase", label: "🎯 展示作品技能", value: "展示作品技能", type: "selection" },
              { id: "network", label: "🤝 拓展人脉网络", value: "拓展人脉网络", type: "selection" },
              { id: "business", label: "💼 商务合作", value: "商务合作", type: "selection" },
              { id: "personal", label: "✨ 个人品牌建设", value: "个人品牌建设", type: "selection" },
              { id: "custom", label: "✍️ 其他目的", value: "custom", type: "input" },
            ],
            nextStep: "style",
          }
        } else {
          state.step = "style"
          return this.handleMorphIDCreation("", userInput)
        }

      case "style":
        if (!userInput?.style) {
          return {
            content: `明白了！${userInput?.purpose || ""} 是很好的目标。现在选择你喜欢的设计风格：`,
            options: [
              { id: "zen", label: "🧘 极简禅意", value: "极简禅意", type: "selection" },
              { id: "creative", label: "🎨 创意炫酷", value: "创意炫酷", type: "selection" },
              { id: "tech", label: "⚡ 科技未来", value: "科技未来", type: "selection" },
              { id: "professional", label: "💼 商务专业", value: "商务专业", type: "selection" },
              { id: "bold", label: "🔥 大胆前卫", value: "大胆前卫", type: "selection" },
            ],
            nextStep: "priority",
          }
        } else {
          state.step = "priority"
          return this.handleMorphIDCreation("", userInput)
        }

      case "priority":
        if (!userInput?.display_priority || userInput.display_priority.length === 0) {
          return {
            content: `${userInput?.style || ""} 风格很棒！最后，选择你想要重点展示的内容（可多选）：`,
            options: [
              { id: "projects", label: "🚀 项目作品", value: "projects", type: "selection" },
              { id: "skills", label: "💡 技能专长", value: "skills", type: "selection" },
              { id: "experience", label: "💼 工作经历", value: "experience", type: "selection" },
              { id: "education", label: "🎓 教育背景", value: "education", type: "selection" },
              { id: "articles", label: "📝 文章博客", value: "articles", type: "selection" },
              { id: "social", label: "🌐 社交媒体", value: "social", type: "selection" },
              { id: "done", label: "✅ 完成选择", value: "done", type: "action" },
            ],
            nextStep: "generate",
          }
        } else {
          state.step = "generate"
          return {
            content:
              "完美！我已经收集了所有信息：\n\n" +
              `👤 身份：${userInput.role}\n` +
              `🎯 目的：${userInput.purpose}\n` +
              `🎨 风格：${userInput.style}\n` +
              `📋 重点：${userInput.display_priority.join("、")}\n\n` +
              "正在为你生成专属的 MorphID 页面...",
            nextStep: "complete",
            metadata: { readyToGenerate: true },
          }
        }

      default:
        return {
          content: "信息收集完成，准备生成页面！",
          nextStep: "complete",
        }
    }
  }

  private handleMorphIDEditing(message: string, userInput?: Partial<UserInput>): AgentResponse {
    return {
      content: "MorphID 编辑功能正在开发中，敬请期待！",
      options: [
        { id: "create_new", label: "创建新页面", value: "create_new", type: "action" },
        { id: "back", label: "返回", value: "back", type: "action" },
      ],
    }
  }

  private handleGeneralChat(message: string): AgentResponse {
    return {
      content: `我是 MorphID 助手，可以帮你创建专业的职业主页。你想要：`,
      options: [
        { id: "create", label: "🆕 创建新页面", value: "create", type: "action" },
        { id: "help", label: "❓ 了解功能", value: "help", type: "action" },
        { id: "examples", label: "👀 查看示例", value: "examples", type: "action" },
      ],
    }
  }
}
