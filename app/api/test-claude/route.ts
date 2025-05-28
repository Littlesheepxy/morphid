import { type NextRequest, NextResponse } from "next/server"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const { model, message } = await request.json()

    if (!message) {
      return NextResponse.json({ success: false, error: "消息不能为空" }, { status: 400 })
    }

    // 验证模型 ID
    const validModels = ["claude-sonnet-4-20250514"]
    if (!validModels.includes(model)) {
      return NextResponse.json({ success: false, error: "不支持的模型" }, { status: 400 })
    }

    console.log(`Testing Claude model: ${model}`)
    console.log(`Message: ${message}`)

    const result = await generateText({
      model: anthropic(model),
      prompt: message,
      system: "你是一个有用的 AI 助手。请用中文回复。",
    })

    console.log(`Claude response: ${result.text}`)

    return NextResponse.json({
      success: true,
      content: result.text,
      model: model,
      usage: result.usage,
    })
  } catch (error) {
    console.error("Claude API 错误:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    )
  }
}
