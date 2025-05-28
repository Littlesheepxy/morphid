import type { PageCreationAgentType, UserProfile } from "@/types/agents"
import { generateWithModel } from "@/lib/ai-models"
import { z } from "zod"

const pageStructureSchema = z.object({
  title: z.string(),
  theme: z.enum(["zen", "creative", "devgrid", "minimal", "bold"]),
  layout: z.enum(["grid", "hero", "twocol", "stack"]),
  blocks: z.array(
    z.object({
      type: z.enum(["hero", "project", "skill", "link", "recruit", "about", "contact"]),
      data: z.any(),
      position: z.number(),
      is_visible: z.boolean().default(true),
    }),
  ),
})

export class PageCreationAgent implements PageCreationAgentType {
  id = "page_creation"
  name = "页面创建助手"
  description = "基于用户画像生成个性化的页面结构和内容"
  type = "page_creation" as const
  systemPrompt = `你是MorphID的页面创建助手，负责根据用户画像生成个性化的页面结构。

你需要：
1. 分析用户的职业背景、技能、目标和风格偏好
2. 选择最适合的页面主题和布局
3. 生成相关的页面模块和具体内容
4. 确保页面结构合理、内容丰富、风格一致
5. 优化页面的视觉效果和用户体验`

  capabilities = ["page_design", "content_generation", "layout_optimization", "theme_selection"]
  templateTypes = ["portfolio", "resume", "business", "creative", "academic", "startup"]

  async generatePage(
    userProfile: UserProfile,
    modelId = "gpt-4o",
  ): Promise<{
    pageStructure: any
    designRationale: string
    suggestions: string[]
  }> {
    const designPrompt = this.buildDesignPrompt(userProfile)

    try {
      const result = await generateWithModel("openai", modelId, designPrompt, {
        system: this.systemPrompt,
        schema: pageStructureSchema,
        maxTokens: 4000,
      })

      const designRationale = await this.generateDesignRationale(userProfile, result.object)
      const suggestions = this.generateOptimizationSuggestions(userProfile, result.object)

      return {
        pageStructure: result.object,
        designRationale,
        suggestions,
      }
    } catch (error) {
      console.error("页面生成失败:", error)
      throw error
    }
  }

  private buildDesignPrompt(userProfile: UserProfile): string {
    const { basic, professional, social, preferences } = userProfile

    return `
基于以下用户画像，设计一个个性化的职业主页：

## 用户基本信息
- 姓名: ${basic.name || "未提供"}
- 职位: ${basic.title || "未提供"}
- 邮箱: ${basic.email || "未提供"}
- 地址: ${basic.location || "未提供"}
- 简介: ${basic.bio || "未提供"}

## 职业背景
- 角色: ${professional.role || "未提供"}
- 技能: ${professional.skills?.join(", ") || "未提供"}
- 经验: ${professional.experience?.join(", ") || "未提供"}
- 教育: ${professional.education?.join(", ") || "未提供"}
- 项目: ${professional.projects?.map((p) => p.name).join(", ") || "未提供"}

## 社交媒体
- 平台: ${Object.keys(social.platforms || {}).join(", ") || "无"}
- 链接: ${social.links?.length || 0} 个

## 用户偏好
- 目的: ${preferences.purpose || "未明确"}
- 风格: ${preferences.style || "未明确"}
- 展示重点: ${preferences.display_priority?.join(", ") || "未明确"}

## 设计要求
请根据用户画像生成页面结构，包括：

1. **页面标题**: 基于用户姓名和职位
2. **主题选择**: 根据用户风格偏好和职业特点选择合适的主题
   - zen: 极简禅意，适合设计师、艺术家
   - creative: 创意炫酷，适合创意工作者
   - devgrid: 科技感，适合开发者、工程师
   - minimal: 现代简约，适合商务人士
   - bold: 大胆前卫，适合创业者、营销人员

3. **布局选择**: 根据内容类型选择布局
   - grid: 网格布局，适合多模块展示
   - hero: 英雄布局，突出个人品牌
   - twocol: 双列布局，平衡展示
   - stack: 堆叠布局，适合移动端

4. **页面模块**: 根据用户信息和偏好生成相关模块
   - hero: 个人介绍，包含姓名、职位、头像、标语、描述
   - project: 项目展示，展示重要项目和作品
   - skill: 技能标签，展示专业技能
   - link: 社交链接，连接各种社交平台
   - about: 详细介绍，个人故事和背景
   - contact: 联系方式，邮箱、电话、地址

请生成具体的内容，不要使用占位符。如果某些信息缺失，请基于已有信息进行合理推断。
`
  }

  private async generateDesignRationale(userProfile: UserProfile, pageStructure: any): Promise<string> {
    const prompt = `
解释以下页面设计的设计理念和选择依据：

用户画像：${JSON.stringify(userProfile, null, 2)}
页面结构：${JSON.stringify(pageStructure, null, 2)}

请说明：
1. 为什么选择这个主题和布局？
2. 模块选择的依据是什么？
3. 内容组织的逻辑是什么？
4. 如何体现用户的个性和专业特点？
`

    try {
      const result = await generateWithModel("openai", "gpt-4o", prompt, {
        maxTokens: 1000,
      })
      return result.text
    } catch (error) {
      return "设计理念生成失败"
    }
  }

  private generateOptimizationSuggestions(userProfile: UserProfile, pageStructure: any): string[] {
    const suggestions: string[] = []

    // 基于用户画像和页面结构生成优化建议
    if (!userProfile.basic.bio) {
      suggestions.push("建议添加个人简介，让访客更好地了解你")
    }

    if (!userProfile.professional.projects || userProfile.professional.projects.length === 0) {
      suggestions.push("建议添加项目案例，展示你的实际工作成果")
    }

    if (!userProfile.social.links || userProfile.social.links.length === 0) {
      suggestions.push("建议添加社交媒体链接，扩大你的影响力")
    }

    const hasContactInfo = userProfile.basic.email || userProfile.basic.location
    if (!hasContactInfo) {
      suggestions.push("建议添加联系方式，方便潜在合作者联系你")
    }

    // 基于页面结构的建议
    const blockTypes = pageStructure.blocks.map((block: any) => block.type)
    if (!blockTypes.includes("hero")) {
      suggestions.push("建议添加个人介绍模块，作为页面的焦点")
    }

    if (blockTypes.length < 3) {
      suggestions.push("建议增加更多模块，让页面内容更丰富")
    }

    return suggestions
  }
}
