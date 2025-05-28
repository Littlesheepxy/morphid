import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateWithBestAvailableModel } from "@/lib/ai-models"

const intentSchema = z.object({
  type: z.enum(["create_morphid", "edit_morphid", "general_chat", "help"]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.any()).optional(),
  reasoning: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "消息内容不能为空",
        },
        { status: 400 },
      )
    }

    const prompt = `
分析用户消息的意图，确定用户想要做什么：

用户消息: "${message}"

意图类型说明：
- create_morphid: 用户想要创建新的职业主页/简历/个人页面
- edit_morphid: 用户想要编辑或修改现有页面
- general_chat: 一般性聊天或询问
- help: 寻求帮助或了解功能

请分析用户的真实意图，提供置信度(0-1)，并提取相关实体信息。
`

    console.log("🎯 Starting intent recognition...")
    const result = await generateWithBestAvailableModel(prompt, {
      schema: intentSchema,
      maxTokens: 1000,
    })

    return NextResponse.json({
      success: true,
      data: result.object,
      model: "Best Available Model",
    })
  } catch (error) {
    console.error("❌ 意图识别失败:", error)

    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : "意图识别失败"

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        suggestion: "请检查 API key 配置或网络连接",
      },
      { status: 500 },
    )
  }
}
