import type { CollectedData, UserProfile } from "@/types/agents"
import { generateWithModel } from "@/lib/ai-models"

export class SummaryAgent {
  id = "summary"
  name = "总结分析助手"
  description = "分析收集到的信息，生成结构化的用户画像"
  type = "summary" as const
  systemPrompt = `你是MorphID的总结分析助手，负责分析用户的原始数据并生成结构化的用户画像。

你需要：
1. 分析来自对话、文档、社交媒体的原始数据
2. 提取关键信息：基本信息、职业背景、技能、项目、目标等
3. 识别用户的风格偏好和展示需求
4. 生成完整的用户画像，为页面创建提供依据
5. 确保信息的准确性和一致性`

  capabilities = ["data_analysis", "information_extraction", "profile_generation", "preference_inference"]
  analysisCapabilities = ["文本分析", "技能提取", "项目识别", "风格推断", "目标分析", "社交媒体分析"]

  async analyzeData(
    collectedData: CollectedData[],
    modelId = "gpt-4o",
  ): Promise<{
    userProfile: UserProfile
    analysis: string
    recommendations: string[]
  }> {
    const analysisPrompt = this.buildAnalysisPrompt(collectedData)

    try {
      const result = await generateWithModel("openai", modelId, analysisPrompt, {
        system: this.systemPrompt,
        maxTokens: 4000,
      })

      // 解析AI分析结果
      const analysis = result.text
      const userProfile = this.extractUserProfile(collectedData, analysis)
      const recommendations = this.generateRecommendations(userProfile)

      return {
        userProfile,
        analysis,
        recommendations,
      }
    } catch (error) {
      console.error("数据分析失败:", error)
      throw error
    }
  }

  private buildAnalysisPrompt(collectedData: CollectedData[]): string {
    const dataBySource = collectedData.reduce(
      (acc, data) => {
        if (!acc[data.source]) acc[data.source] = []
        acc[data.source].push(data)
        return acc
      },
      {} as Record<string, CollectedData[]>,
    )

    let prompt = `请分析以下用户数据，提取关键信息并生成用户画像：\n\n`

    Object.entries(dataBySource).forEach(([source, data]) => {
      prompt += `## ${source} 数据：\n`
      data.forEach((item, index) => {
        prompt += `${index + 1}. ${JSON.stringify(item.data)}\n`
      })
      prompt += "\n"
    })

    prompt += `
请从以上数据中提取并分析：

1. **基本信息**：姓名、职位、联系方式、地理位置
2. **职业背景**：工作经验、教育背景、职业发展轨迹
3. **技能专长**：技术技能、软技能、专业认证
4. **项目经验**：重要项目、成就、作品集
5. **社交媒体**：平台活跃度、内容风格、影响力
6. **目标意图**：创建主页的目的、目标受众
7. **风格偏好**：从内容和表达方式推断设计风格偏好

请提供详细的分析和建议。`

    return prompt
  }

  private extractUserProfile(collectedData: CollectedData[], analysis: string): UserProfile {
    // 基于收集的数据和AI分析结果构建用户画像
    const profile: UserProfile = {
      basic: {},
      professional: {
        skills: [],
        experience: [],
        education: [],
        projects: [],
      },
      social: {
        platforms: {},
        links: [],
      },
      preferences: {
        display_priority: [],
      },
      raw_data: collectedData,
    }

    // 从对话数据中提取信息
    const conversationData = collectedData.filter((data) => data.type === "conversation")
    conversationData.forEach((data) => {
      if (data.data.step === "basic_info") {
        // 解析基本信息
        this.parseBasicInfo(data.data.message, profile)
      } else if (data.data.step === "professional_info") {
        // 解析职业信息
        this.parseProfessionalInfo(data.data.message, profile)
      }
    })

    // 从文档数据中提取信息
    const documentData = collectedData.filter((data) => data.type === "document")
    documentData.forEach((data) => {
      this.parseDocumentData(data, profile)
    })

    // 从社交媒体数据中提取信息
    const socialData = collectedData.filter((data) => data.type === "social_profile")
    socialData.forEach((data) => {
      this.parseSocialData(data, profile)
    })

    return profile
  }

  private parseBasicInfo(message: string, profile: UserProfile) {
    // 简单的信息提取逻辑，实际应用中可以使用更复杂的NLP
    const lines = message.split("\n")
    lines.forEach((line) => {
      if (line.includes("姓名") || line.includes("我是") || line.includes("叫")) {
        // 提取姓名
        const nameMatch = line.match(/[我是叫]\s*([^\s，。]+)/)
        if (nameMatch) profile.basic.name = nameMatch[1]
      }
      if (line.includes("职位") || line.includes("工作") || line.includes("职业")) {
        // 提取职位
        const titleMatch = line.match(/(?:职位|工作|职业)[是：]\s*([^\s，。]+)/)
        if (titleMatch) profile.basic.title = titleMatch[1]
      }
    })
  }

  private parseProfessionalInfo(message: string, profile: UserProfile) {
    // 提取技能
    if (message.includes("技能") || message.includes("专长")) {
      const skills = message.match(/(?:技能|专长)[：是]([^。]+)/)?.[1]?.split(/[，、]/) || []
      profile.professional.skills = skills.map((s) => s.trim()).filter(Boolean)
    }

    // 提取项目经验
    if (message.includes("项目")) {
      const projects = message.match(/项目[：是]([^。]+)/)?.[1]?.split(/[，、]/) || []
      profile.professional.projects = projects.map((p) => ({
        name: p.trim(),
        description: "",
        tech: [],
      }))
    }
  }

  private parseDocumentData(data: CollectedData, profile: UserProfile) {
    // 解析简历文档数据
    if (data.source === "resume") {
      // 这里应该集成文档解析服务
      profile.professional.experience.push("从简历文档提取的经验")
    }
  }

  private parseSocialData(data: CollectedData, profile: UserProfile) {
    // 解析社交媒体数据
    profile.social.platforms![data.source] = data.data
  }

  private generateRecommendations(profile: UserProfile): string[] {
    const recommendations: string[] = []

    if (profile.professional.skills && profile.professional.skills.length > 0) {
      recommendations.push("建议在技能模块突出展示你的专业技能")
    }

    if (profile.professional.projects && profile.professional.projects.length > 0) {
      recommendations.push("项目经验丰富，建议使用项目展示模块")
    }

    if (Object.keys(profile.social.platforms || {}).length > 0) {
      recommendations.push("社交媒体活跃，建议添加社交链接模块")
    }

    return recommendations
  }
}
