import { NextResponse } from "next/server"

export async function GET() {
  // 只在开发环境显示调试信息
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug endpoint only available in development" }, { status: 403 })
  }

  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ Missing",
    // 显示 API key 的前几个字符用于验证
    OPENAI_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) + "...",
    ANTHROPIC_PREFIX: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + "...",
  }

  return NextResponse.json(envStatus)
}
