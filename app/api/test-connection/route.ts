import { type NextRequest, NextResponse } from "next/server"
import { testModelConnection } from "@/lib/ai-models"
import { AVAILABLE_MODELS } from "@/types/models"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testing individual model connection...")

    const body = await request.json()
    const { provider, modelId } = body

    console.log("Request body:", { provider, modelId })

    if (!provider || !modelId) {
      return NextResponse.json(
        {
          success: false,
          error: "Provider and modelId are required",
          received: { provider, modelId },
        },
        { status: 400 },
      )
    }

    const result = await testModelConnection(provider, modelId)
    console.log("Test result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Connection test failed:", error)

    // 更详细的错误信息
    const errorDetails = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      details: error,
    }

    console.log("Error details:", errorDetails)

    return NextResponse.json(errorDetails, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log("🧪 Testing all model connections...")

    // 检查环境变量
    const envStatus = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    }

    console.log("Environment status:", envStatus)

    const results = []

    // 逐个测试模型，避免并发问题
    for (const model of AVAILABLE_MODELS) {
      console.log(`Testing ${model.provider} - ${model.id}...`)
      try {
        const result = await testModelConnection(model.provider, model.id)
        results.push(result)
        console.log(`✅ ${model.provider} test completed:`, result.success)
      } catch (error) {
        console.error(`❌ ${model.provider} test failed:`, error)
        results.push({
          success: false,
          provider: model.provider,
          modelId: model.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      envStatus,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Batch connection test failed:", error)

    const errorDetails = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      details: error,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorDetails, { status: 500 })
  }
}
