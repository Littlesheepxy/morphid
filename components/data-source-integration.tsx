"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Link, Check } from "lucide-react"
import { DATA_SOURCES } from "@/lib/agents/data-collection-agent"
import { useTheme } from "@/contexts/theme-context"

interface DataSourceIntegrationProps {
  onDataIntegrated: (sourceId: string, data: any) => void
  className?: string
}

export function DataSourceIntegration({ onDataIntegrated, className = "" }: DataSourceIntegrationProps) {
  const { theme } = useTheme()
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectedSources, setConnectedSources] = useState<string[]>([])

  const handleSourceSelect = async (sourceId: string) => {
    setSelectedSource(sourceId)
    setIsConnecting(true)

    try {
      // 模拟数据集成过程
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 模拟获取的数据
      const mockData = generateMockData(sourceId)
      onDataIntegrated(sourceId, mockData)

      setConnectedSources((prev) => [...prev, sourceId])
      setSelectedSource(null)
    } catch (error) {
      console.error("数据集成失败:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsConnecting(true)

    try {
      // 模拟文件处理
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const mockResumeData = {
        fileName: file.name,
        content: "模拟简历内容解析结果",
        skills: ["JavaScript", "React", "Node.js"],
        experience: ["前端开发工程师 - 3年", "全栈开发工程师 - 2年"],
        education: ["计算机科学学士"],
      }

      onDataIntegrated("resume", mockResumeData)
      setConnectedSources((prev) => [...prev, "resume"])
    } catch (error) {
      console.error("文件上传失败:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className={`text-lg font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>选择数据源</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_SOURCES.map((source) => (
          <Card
            key={source.id}
            className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
              connectedSources.includes(source.id)
                ? "ring-2 ring-green-500"
                : selectedSource === source.id
                  ? "ring-2 ring-blue-500"
                  : ""
            } ${
              theme === "light"
                ? "bg-white/80 border-white/30 hover:bg-white/90"
                : "bg-gray-800/80 border-gray-700/30 hover:bg-gray-800/90"
            }`}
            onClick={() => {
              if (source.id === "resume") {
                document.getElementById("file-upload")?.click()
              } else {
                handleSourceSelect(source.id)
              }
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{source.icon}</span>
                  <div>
                    <CardTitle className={`text-base ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                      {source.name}
                    </CardTitle>
                    <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                      {source.description}
                    </p>
                  </div>
                </div>
                {connectedSources.includes(source.id) ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : source.authRequired ? (
                  <Link className="w-5 h-5 text-blue-500" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={source.authRequired ? "default" : "secondary"} className="text-xs">
                  {source.authRequired ? "需要授权" : "直接使用"}
                </Badge>
                {isConnecting && selectedSource === source.id && (
                  <div className="flex items-center gap-2 text-sm text-blue-500">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    连接中...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 隐藏的文件上传输入 */}
      <input id="file-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

      {/* 连接状态显示 */}
      {connectedSources.length > 0 && (
        <Card
          className={`${theme === "light" ? "bg-green-50 border-green-200" : "bg-green-900/20 border-green-700/30"}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className={`font-medium ${theme === "light" ? "text-green-800" : "text-green-300"}`}>
                已连接的数据源
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {connectedSources.map((sourceId) => {
                const source = DATA_SOURCES.find((s) => s.id === sourceId)
                return (
                  <Badge key={sourceId} variant="secondary" className="text-xs">
                    {source?.icon} {source?.name}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 生成模拟数据的辅助函数
function generateMockData(sourceId: string) {
  switch (sourceId) {
    case "linkedin":
      return {
        name: "张三",
        title: "高级前端工程师",
        company: "科技公司",
        location: "北京",
        connections: 500,
        skills: ["JavaScript", "React", "Vue.js", "Node.js"],
        experience: [
          {
            title: "高级前端工程师",
            company: "科技公司",
            duration: "2021-至今",
          },
        ],
      }

    case "github":
      return {
        username: "zhangsan",
        name: "张三",
        bio: "Full-stack developer passionate about web technologies",
        followers: 150,
        following: 80,
        repositories: 25,
        languages: ["JavaScript", "TypeScript", "Python"],
        topRepos: [
          { name: "awesome-project", stars: 120, language: "JavaScript" },
          { name: "react-components", stars: 85, language: "TypeScript" },
        ],
      }

    case "twitter":
      return {
        username: "@zhangsan",
        name: "张三",
        bio: "前端工程师 | 技术分享者",
        followers: 1200,
        following: 300,
        tweets: 450,
        topics: ["前端开发", "React", "JavaScript", "技术分享"],
      }

    default:
      return { message: `来自 ${sourceId} 的模拟数据` }
  }
}
