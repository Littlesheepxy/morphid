"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

const CLAUDE_MODELS = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "最新的 Claude 4 模型",
  },
]

export default function TestClaudePage() {
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514")
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleTest = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    setError("")
    setResponse("")

    try {
      const res = await fetch("/api/test-claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          message: message.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResponse(data.content)
      } else {
        setError(data.error || "测试失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Claude API 测试</h1>
          <p className="text-muted-foreground mt-2">测试 Claude Sonnet 4 模型的连接和响应</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>模型配置</CardTitle>
            <CardDescription>选择要测试的 Claude 模型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">选择模型</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAUDE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {model.description}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">测试消息</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="输入要发送给 Claude 的消息..."
                rows={4}
              />
            </div>

            <Button onClick={handleTest} disabled={isLoading || !message.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                "发送测试消息"
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-600">
                <strong>错误:</strong> {error}
              </div>
            </CardContent>
          </Card>
        )}

        {response && (
          <Card>
            <CardHeader>
              <CardTitle>Claude 响应</CardTitle>
              <CardDescription>使用模型: {selectedModel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{response}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
