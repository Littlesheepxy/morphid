import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText, generateObject } from "ai"
import type { ModelProvider } from "@/types/models"

// 验证 API keys 是否配置
function validateApiKeys() {
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  console.log("🔑 API Keys status:")
  console.log("- OpenAI:", openaiKey ? `✅ Configured (${openaiKey.substring(0, 10)}...)` : "❌ Missing")
  console.log("- Anthropic:", anthropicKey ? `✅ Configured (${anthropicKey.substring(0, 10)}...)` : "❌ Missing")

  return { openaiKey, anthropicKey }
}

export function getModelClient(provider: ModelProvider, modelId: string) {
  const { openaiKey, anthropicKey } = validateApiKeys()

  switch (provider) {
    case "openai":
      if (!openaiKey) {
        throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.")
      }
      console.log(`🤖 Creating OpenAI client with model: ${modelId}`)
      return openai(modelId)
    case "claude":
      if (!anthropicKey) {
        throw new Error(
          "Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your environment variables.",
        )
      }
      console.log(`🤖 Creating Anthropic client with model: ${modelId}`)
      return anthropic(modelId)
    default:
      throw new Error(`Unsupported model provider: ${provider}`)
  }
}

export async function generateWithModel(
  provider: ModelProvider,
  modelId: string,
  prompt: string,
  options?: {
    system?: string
    schema?: any
    maxTokens?: number
  },
) {
  try {
    console.log(`🚀 Generating with ${provider} model: ${modelId}`)
    const model = getModelClient(provider, modelId)

    if (options?.schema) {
      // 使用结构化输出
      const result = await generateObject({
        model,
        prompt,
        system: options.system,
        schema: options.schema,
        maxTokens: options.maxTokens,
      })
      console.log(`✅ Generated object successfully with ${provider}`)
      return result
    } else {
      // 使用文本生成
      const result = await generateText({
        model,
        prompt,
        system: options?.system,
        maxTokens: options?.maxTokens,
      })
      console.log(`✅ Generated text successfully with ${provider}`)
      return result
    }
  } catch (error) {
    console.error(`❌ Error generating with ${provider} model ${modelId}:`, error)

    // 如果是 Claude 模型失败，尝试回退到 OpenAI
    if (provider === "claude" && process.env.OPENAI_API_KEY) {
      console.log("🔄 Claude failed, falling back to GPT-4o...")
      try {
        return await generateWithModel("openai", "gpt-4o", prompt, options)
      } catch (fallbackError) {
        console.error("❌ Fallback to OpenAI also failed:", fallbackError)
      }
    }

    // 重新抛出原始错误
    throw error
  }
}

// 测试 API 连接
export async function testModelConnection(provider: ModelProvider, modelId: string) {
  try {
    console.log(`🧪 Testing connection for ${provider} - ${modelId}`)

    const result = await generateWithModel(provider, modelId, "Hello, this is a test message.", {
      system: "You are a helpful assistant. Respond briefly with just 'Test successful'.",
      maxTokens: 10,
    })

    const response = 'text' in result ? result.text : 'object' in result ? JSON.stringify(result.object) : "No response"

    console.log(`✅ Test successful for ${provider} - ${modelId}:`, response)

    return {
      success: true,
      provider,
      modelId,
      response: response.substring(0, 100), // 限制响应长度
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`❌ Test failed for ${provider} - ${modelId}:`, error)

    return {
      success: false,
      provider,
      modelId,
      error: error instanceof Error ? error.message : "Unknown error",
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      timestamp: new Date().toISOString(),
    }
  }
}

// 便捷函数：使用 GPT-4o
export async function generateWithGPT4o(
  prompt: string,
  options?: {
    system?: string
    schema?: any
    maxTokens?: number
  },
) {
  return generateWithModel("openai", "gpt-4o", prompt, options)
}

// 便捷函数：使用 claude 4 Sonnet
export async function generateWithClaude(
  prompt: string,
  options?: {
    system?: string
    schema?: any
    maxTokens?: number
  },
) {
  return generateWithModel("claude", "claude-sonnet-4-20250514", prompt, options)
}

// 智能模型选择：优先使用可用的模型
export async function generateWithBestAvailableModel(
  prompt: string,
  options?: {
    system?: string
    schema?: any
    maxTokens?: number
  },
) {
  const { openaiKey, anthropicKey } = validateApiKeys()

  // 优先使用 Claude，如果不可用则使用 OpenAI
  if (anthropicKey) {
    try {
      return await generateWithClaude(prompt, options)
    } catch (error) {
      console.log("Claude failed, trying OpenAI...")
      if (openaiKey) {
        return await generateWithGPT4o(prompt, options)
      }
      throw error
    }
  } else if (openaiKey) {
    return await generateWithGPT4o(prompt, options)
  } else {
    throw new Error("No API keys configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.")
  }
}
