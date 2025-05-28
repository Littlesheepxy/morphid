import type { DataCollectionAgent, DataSource, CollectedData } from "@/types/agents"
import type { ChatOption } from "@/types/chat"

export const DATA_SOURCES: DataSource[] = [
  {
    id: "conversation",
    name: "对话收集",
    type: "manual",
    icon: "💬",
    description: "通过对话了解你的背景和需求",
    authRequired: false,
  },
  {
    id: "resume",
    name: "简历���档",
    type: "document",
    icon: "📄",
    description: "上传简历PDF或Word文档",
    authRequired: false,
    supportedFormats: ["pdf", "doc", "docx"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    type: "social",
    icon: "💼",
    description: "导入LinkedIn个人资料",
    authRequired: true,
  },
  {
    id: "github",
    name: "GitHub",
    type: "social",
    icon: "🐙",
    description: "获取GitHub项目和贡献",
    authRequired: true,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    type: "social",
    icon: "🐦",
    description: "分析X平台个人资料",
    authRequired: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    type: "social",
    icon: "📸",
    description: "获取Instagram创作内容",
    authRequired: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    type: "social",
    icon: "🎵",
    description: "分析TikTok创作数据",
    authRequired: true,
  },
]

export class DataCollectionAgentClass implements DataCollectionAgent {
  id = "data_collection"
  name = "信息收集助手"
  description = "通过多种方式收集用户的个人和职业信息"
  type = "data_collection" as const
  systemPrompt = `你是MorphID的信息收集助手，负责通过对话和外部数据源收集用户信息。
你需要：
1. 通过友好的对话了解用户的基本信息、职业背景和目标
2. 引导用户选择合适的数据源来补充信息
3. 确保收集到的信息准确、完整
4. 保护用户隐私，只收集必要的信息`

  capabilities = ["conversation", "document_upload", "social_integration", "data_validation"]
  supportedSources = DATA_SOURCES

  private conversationStep = "welcome"
  private collectedData: CollectedData[] = []

  async processMessage(
    message: string,
    currentData?: CollectedData[],
  ): Promise<{
    content: string
    options?: ChatOption[]
    nextStep?: string
    collectedData?: CollectedData[]
    needsDataSource?: boolean
  }> {
    if (currentData) {
      this.collectedData = currentData
    }

    switch (this.conversationStep) {
      case "welcome":
        return this.handleWelcome()
      case "basic_info":
        return this.handleBasicInfo(message)
      case "professional_info":
        return this.handleProfessionalInfo(message)
      case "data_sources":
        return this.handleDataSources()
      case "completion":
        return this.handleCompletion()
      default:
        return this.handleWelcome()
    }
  }

  private handleWelcome() {
    this.conversationStep = "basic_info"
    return {
      content: `👋 你好！我是MorphID的信息收集助手。

我会帮你收集创建专业主页所需的信息。我们可以通过对话了解你的背景，也可以导入你的简历、LinkedIn等资料来快速获取信息。

首先，请告诉我你的姓名和目前的职业角色：`,
      options: [
        { id: "manual", label: "💬 手动输入", value: "manual", type: "selection" },
        { id: "upload", label: "📄 上传简历", value: "upload", type: "action" },
        { id: "social", label: "🔗 连接社交账号", value: "social", type: "action" },
      ],
      nextStep: "basic_info",
    }
  }

  private handleBasicInfo(message: string) {
    // 收集基本信息
    const basicData: CollectedData = {
      source: "conversation",
      type: "conversation",
      data: { step: "basic_info", message },
      timestamp: new Date(),
      confidence: 0.9,
    }
    this.collectedData.push(basicData)

    this.conversationStep = "professional_info"
    return {
      content: `很好！现在请告诉我更多关于你的职业背景：

• 你的主要技能和专长是什么？
• 你有哪些重要的项目经验？
• 你的职业目标是什么？`,
      options: [
        { id: "continue", label: "继续对话", value: "continue", type: "selection" },
        { id: "skip", label: "跳过，使用其他方式", value: "skip", type: "action" },
      ],
      collectedData: this.collectedData,
    }
  }

  private handleProfessionalInfo(message: string) {
    const professionalData: CollectedData = {
      source: "conversation",
      type: "conversation",
      data: { step: "professional_info", message },
      timestamp: new Date(),
      confidence: 0.9,
    }
    this.collectedData.push(professionalData)

    this.conversationStep = "data_sources"
    return {
      content: `太棒了！我已经了解了你的基本情况。

为了创建更完整的个人主页，你还可以选择导入其他数据源：`,
      needsDataSource: true,
      collectedData: this.collectedData,
    }
  }

  private handleDataSources() {
    return {
      content: `请选择你想要连接的数据源：`,
      options: DATA_SOURCES.map((source) => ({
        id: source.id,
        label: `${source.icon} ${source.name}`,
        value: source.id,
        type: source.authRequired ? "action" : "selection",
      })).concat([{ id: "done", label: "✅ 完成收集", value: "done", type: "action" }]),
      nextStep: "completion",
    }
  }

  private handleCompletion() {
    return {
      content: `🎉 信息收集完成！

我已经收集了以下信息：
${this.collectedData.map((data) => `• ${data.source}: ${data.type}`).join("\n")}

现在我会将这些信息传递给总结分析助手，为你生成个性化的主页。`,
      collectedData: this.collectedData,
      nextStep: "summary",
    }
  }

  getCollectedData(): CollectedData[] {
    return this.collectedData
  }
}
