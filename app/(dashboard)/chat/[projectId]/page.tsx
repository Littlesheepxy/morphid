/**
 * 项目聊天页面
 *
 * 功能：
 * - 编辑现有HeysMe项目
 * - 查看项目历史对话
 * - 实时预览修改效果
 *
 * TODO:
 * - [ ] 添加版本历史功能
 * - [ ] 支持多人协作编辑
 * - [ ] 实现评论和建议系统
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Eye, Share2, Settings, Save } from "lucide-react"
import ChatInterface from "@/components/chat-interface"
import PageRenderer from "@/components/page-renderer"
import { useTheme } from "@/contexts/theme-context"
import { supabase } from "@/lib/supabase"
import type { FlowPage } from "@/types/HeysMe"

export default function ProjectChatPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<FlowPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 加载项目数据
  useEffect(() => {
    const loadProject = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const response = await fetch(`/api/pages/${projectId}`)
        const result = await response.json()

        if (result.success) {
          setProject(result.data)
        } else {
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("加载项目失败:", error)
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      loadProject()
    }
  }, [projectId, router])

  // 保存项目
  const handleSaveProject = async () => {
    if (!project) return

    try {
      const response = await fetch(`/api/pages/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })

      if (response.ok) {
        setHasUnsavedChanges(false)
        // 显示保存成功提示
      }
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载项目中...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
          <Button onClick={() => router.push("/dashboard")}>返回仪表板</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 项目头部 */}
      <header
        className={`border-b px-6 py-4 transition-colors duration-300 ${
          theme === "light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>

            <div>
              <h1 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                {project.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {project.theme}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {project.layout}
                </Badge>
                <span className={`text-xs ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                  /{project.slug}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Button variant="outline" size="sm" onClick={handleSaveProject}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => window.open(`/p/${project.slug}`, "_blank")}>
              <Eye className="w-4 h-4 mr-2" />
              预览
            </Button>

            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>

            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* 标签栏 */}
          <div className={`border-b px-6 ${theme === "light" ? "bg-gray-50" : "bg-gray-800"}`}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="chat">对话编辑</TabsTrigger>
              <TabsTrigger value="preview">实时预览</TabsTrigger>
              <TabsTrigger value="settings">页面设置</TabsTrigger>
            </TabsList>
          </div>

          {/* 标签内容 */}
          <div className="flex-1">
            <TabsContent value="chat" className="h-full m-0">
              <div className="h-full flex">
                {/* 聊天界面 */}
                <div className="flex-1">
                  <ChatInterface
                    projectId={projectId}
                    project={project}
                    onProjectUpdate={(updatedProject) => {
                      setProject(updatedProject)
                      setHasUnsavedChanges(true)
                    }}
                  />
                </div>

                {/* 侧边预览 */}
                <div className="w-96 border-l">
                  <div className="h-full overflow-auto">
                    <PageRenderer page={project} isPreview />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0">
              <div className="h-full overflow-auto">
                <PageRenderer page={project} isPreview showControls />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 p-6">
              <ProjectSettings
                project={project}
                onUpdate={(updatedProject) => {
                  setProject(updatedProject)
                  setHasUnsavedChanges(true)
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// 项目设置组件
function ProjectSettings({ project, onUpdate }: { project: FlowPage; onUpdate: (project: FlowPage) => void }) {
  // TODO: 实现项目设置界面
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">项目设置</h2>
      {/* 设置表单内容 */}
    </div>
  )
}
