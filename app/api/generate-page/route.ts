import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateWithModel } from "@/lib/ai-models"
import { getModelById } from "@/types/models"

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

export async function POST(request: NextRequest) {
  try {
    const { role, purpose, style, display_priority, model_id = "gpt-4o" } = await request.json()

    const modelConfig = getModelById(model_id)
    if (!modelConfig) {
      return NextResponse.json({ success: false, error: "不支持的模型" }, { status: 400 })
    }

    const prompt = `
你是一个专业的职业页面设计师。根据用户输入生成一个个性化的职业主页结构。

用户信息：
- 身份角色：${role}
- 目标用途：${purpose}
- 表达风格：${style}
- 展示重点：${display_priority.join(", ")}

请生成一个包含以下内容的页面结构：
1. 合适的页面标题
2. 匹配风格的主题 (zen/creative/devgrid/minimal/bold)
3. 适合的布局 (grid/hero/twocol/stack)
4. 相关的页面模块，每个模块包含：
   - type: 模块类型
   - data: 模块具体内容
   - position: 排序位置
   - is_visible: 是否显示

模块类型说明：
- hero: 个人介绍和头像，包含 name, title, description, tagline 等字段
- project: 项目展示，包含 title 和 projects 数组，每个项目有 name, description, tech, link
- skill: 技能标签，包含 title 和 skills 数组
- link: 社交链接，包含 title 和 links 数组，每个链接有 type, label, url
- about: 详细介绍，包含 title 和 content
- contact: 联系方式，包含 title, email, phone, location

请确保内容专业、有吸引力，并符合用户的身份和目标。生成具体的示例内容，不要使用占位符。
`

    const result = await generateWithModel(modelConfig.provider, modelConfig.id, prompt, {
      schema: pageStructureSchema,
      maxTokens: 4000,
    })

    return NextResponse.json({
      success: true,
      data: result.object,
      model: modelConfig.name,
      provider: modelConfig.provider,
    })
  } catch (error) {
    console.error("页面生成失败:", error)
    return NextResponse.json({ success: false, error: "页面生成失败" }, { status: 500 })
  }
}
