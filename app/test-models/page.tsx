"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ModelSelector } from "@/components/model-selector"
import { useTheme } from "@/contexts/theme-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sparkles, Clock } from "lucide-react"

export default function TestModelsPage() {
  const { theme } = useTheme()
  const [selectedModel, setSelectedModel] = useState("gpt-4o")
  const [prompt, setPrompt] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const testIntentRecognition = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const response = await fetch("/api/intent-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, modelId: selectedModel }),
      })

      const result = await response.json()
      const endTime = Date.now()

      setResults((prev) => [
        {
          id: Date.now(),
          type: "intent",
          model: result.model,
          prompt,
          result: result.data,
          duration: endTime - startTime,
          timestamp: new Date(),
        },
        ...prev,
      ])
    } catch (error) {
      console.error("测试失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const testPageGeneration = async () => {
    setIsLoading(true)
    const startTime = Date.now()

    const testInput = {
      role: "AI 工程师",
      purpose: "寻找工作机会",
      style: "科技未来",
      display_priority: ["projects", "skills", "experience"],
      model_id: selectedModel,
    }

    try {
      const response = await fetch("/api/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testInput),
      })

      const result = await response.json()
      const endTime = Date.now()

      setResults((prev) => [
        {
          id: Date.now(),
          type: "page",
          model: result.model,
          prompt: "页面生成测试",
          result: result.data,
          duration: endTime - startTime,
          timestamp: new Date(),
        },
        ...prev,
      ])
    } catch (error) {
      console.error("测试失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-light" : "bg-gradient-dark"
      }`}
    >
      {/* 头部 */}
      <header
        className={`backdrop-blur-xl border-b px-6 py-4 transition-colors duration-300 ${
          theme === "light" ? "bg-white/80 border-white/20" : "bg-gray-900/80 border-gray-700/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                HeysMe - 模型测试
              </h1>
              <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                测试不同 AI 模型的效果
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild className="rounded-2xl">
              <a href="/chat">返回聊天</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 测试控制面板 */}
          <div className="space-y-6">
            <Card
              className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
                theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
              }`}
            >
              <CardHeader>
                <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>模型选择</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} className="w-full" />
              </CardContent>
            </Card>

            <Card
              className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
                theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
              }`}
            >
              <CardHeader>
                <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>意图识别测试</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入要测试的用户消息..."
                  className={`rounded-2xl ${
                    theme === "light" ? "bg-white/60 border-white/30" : "bg-gray-700/60 border-gray-600/30"
                  }`}
                  rows={3}
                />
                <Button
                  onClick={testIntentRecognition}
                  disabled={!prompt.trim() || isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {isLoading ? "测试中..." : "测试意图识别"}
                </Button>
              </CardContent>
            </Card>

            <Card
              className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
                theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
              }`}
            >
              <CardHeader>
                <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>页面生成测试</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={testPageGeneration}
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-blue-600"
                >
                  {isLoading ? "生成中..." : "测试页面生成"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 测试结果 */}
          <div className="space-y-4">
            <h2 className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>测试结果</h2>
            {results.length === 0 ? (
              <Card
                className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
                  theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
                }`}
              >
                <CardContent className="p-8 text-center">
                  <p className={theme === "light" ? "text-gray-500" : "text-gray-400"}>暂无测试结果</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className={`rounded-2xl shadow-lg backdrop-blur-sm border ${
                      theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={result.type === "intent" ? "default" : "secondary"}>
                            {result.type === "intent" ? "意图识别" : "页面生成"}
                          </Badge>
                          <Badge variant="outline">{result.model}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {result.duration}ms
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className={`text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                            输入:
                          </p>
                          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                            {result.prompt}
                          </p>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                            结果:
                          </p>
                          <pre
                            className={`text-xs p-3 rounded-xl overflow-auto ${
                              theme === "light" ? "bg-gray-100 text-gray-800" : "bg-gray-700 text-gray-200"
                            }`}
                          >
                            {JSON.stringify(result.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
