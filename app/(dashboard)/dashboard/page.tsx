/**
 * 项目管理仪表板 - 专业的项目管理中心
 *
 * 核心功能：
 * - 项目概览和统计分析
 * - 项目搜索、筛选和批量操作
 * - 项目状态管理和发布控制
 * - 访问数据分析和性能监控
 *
 * 设计理念：
 * - 专注项目管理，不是创建入口
 * - 数据驱动的决策支持
 * - 高效的批量操作
 * - 清晰的项目状态展示
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Share2,
  Trash2,
  Calendar,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { supabase } from "@/lib/supabase"
// 项目数据类型定义
interface Project {
  id: string
  title: string
  slug: string
  theme: string
  layout: string
  visibility: 'public' | 'private'
  is_featured: boolean
  blocks?: any[]
  updated_at: string
  created_at: string
  views?: number
  shares?: number
  status: 'draft' | 'published' | 'archived'
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)

  // 获取用户信息和项目
  useEffect(() => {
    const fetchUserAndProjects = async () => {
      try {
        // 获取当前用户
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }
        setUser(user)

        // 获取用户项目
        const response = await fetch(`/api/pages?userId=${user.id}`)
        const result = await response.json()

        if (result.success) {
          setProjects(result.data)
        }
      } catch (error) {
        console.error("获取数据失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndProjects()
  }, [router])

  // 返回聊天界面（主要创建入口）
  const handleBackToChat = () => {
    router.push("/chat")
  }

  // 创建新项目（从dashboard快速创建）
  const handleQuickCreate = () => {
    router.push("/chat")
  }

  // 编辑项目
  const handleEditProject = (projectId: string) => {
    router.push(`/chat?session=${projectId}`)
  }

  // 预览项目
  const handlePreviewProject = (slug: string) => {
    window.open(`/p/${slug}`, "_blank")
  }

  // 发布/取消发布项目
  const handleTogglePublish = async (projectId: string, currentStatus: string) => {
    // TODO: 实现发布状态切换
    console.log('Toggle publish:', projectId, currentStatus)
  }

  // 删除项目
  const handleDeleteProject = async (projectId: string) => {
    if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      // TODO: 实现删除功能
      console.log('Delete project:', projectId)
    }
  }

  // 批量操作
  const handleBatchAction = (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedProjects.length === 0) return
    console.log('Batch action:', action, selectedProjects)
    // TODO: 实现批量操作
  }

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // 高级过滤项目
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  // 计算统计数据
  const stats = {
    total: projects.length,
    published: projects.filter(p => p.status === 'published').length,
    draft: projects.filter(p => p.status === 'draft').length,
    totalViews: projects.reduce((sum, p) => sum + (p.views || 0), 0),
    totalShares: projects.reduce((sum, p) => sum + (p.shares || 0), 0),
    thisMonthGrowth: 23 // TODO: 计算真实增长率
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-light" : "bg-gradient-dark"
      }`}
    >
      {/* 顶部导航 */}
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
                项目管理中心
              </h1>
              <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>专业的项目管理和数据分析</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToChat}
              className="rounded-2xl"
            >
              回到聊天界面
            </Button>
            <ThemeToggle />

            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} alt={user?.email} />
                    <AvatarFallback>{user?.email?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.user_metadata?.username || "用户"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>设置</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  <span>团队</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>登出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className={`${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总项目</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">
                    {stats.published} 已发布 · {stats.draft} 草稿
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总访问</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    平均 {Math.round(stats.totalViews / Math.max(stats.published, 1))} 次/项目
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">本月增长</p>
                  <p className="text-2xl font-bold">+{stats.thisMonthGrowth}%</p>
                  <p className="text-xs text-green-600">
                    较上月增长
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Share2 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">分享次数</p>
                  <p className="text-2xl font-bold">{stats.totalShares}</p>
                  <p className="text-xs text-gray-500">
                    平均 {Math.round(stats.totalShares / Math.max(stats.published, 1))} 次/项目
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 项目管理区域 */}
        <Card className={`${theme === "light" ? "bg-white/80" : "bg-gray-800/80"} backdrop-blur-sm`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>我的项目</CardTitle>
              <Button onClick={handleQuickCreate} className="rounded-2xl">
                <Plus className="w-4 h-4 mr-2" />
                快速创建
              </Button>
            </div>

            {/* 搜索和筛选 */}
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索项目..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-2xl"
                />
              </div>
              
              {/* 状态筛选 */}
              <div className="flex gap-2">
                {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className="rounded-2xl"
                  >
                    {status === 'all' && '全部'}
                    {status === 'published' && '已发布'}
                    {status === 'draft' && '草稿'}
                    {status === 'archived' && '已归档'}
                  </Button>
                ))}
              </div>

              {/* 批量操作 */}
              {selectedProjects.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-2xl">
                      批量操作 ({selectedProjects.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBatchAction('publish')}>
                      批量发布
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchAction('unpublish')}>
                      批量取消发布
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleBatchAction('delete')}
                      className="text-red-600"
                    >
                      批量删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className={`text-lg font-medium mb-2 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                  {projects.length === 0 ? "还没有项目" : "没有找到匹配的项目"}
                </h3>
                <p className={`mb-6 ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  {projects.length === 0 ? "创建你的第一个HeysMe项目" : "尝试调整搜索条件"}
                </p>
                {projects.length === 0 && (
                  <Button onClick={handleQuickCreate} className="rounded-2xl">
                    <Plus className="w-4 h-4 mr-2" />
                    开始创建
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                      theme === "light" ? "bg-gray-50/80" : "bg-gray-700/80"
                    }`}
                    onClick={() => handleEditProject(project.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className={`text-base mb-1 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                            {project.title}
                          </CardTitle>
                          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                            /{project.slug}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditProject(project.id)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreviewProject(project.slug)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              预览
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Share2 className="mr-2 h-4 w-4" />
                              分享
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {/* 主题和布局 */}
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {project.theme}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {project.layout}
                          </Badge>
                        </div>

                        {/* 模块数量 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{project.blocks?.length || 0} 个模块</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.updated_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* 状态和标签 */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge
                              variant={project.status === 'published' ? "default" : 
                                      project.status === 'draft' ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {project.status === 'published' && '已发布'}
                              {project.status === 'draft' && '草稿'}
                              {project.status === 'archived' && '已归档'}
                            </Badge>
                            
                            <Badge
                              variant={project.visibility === "public" ? "outline" : "secondary"}
                              className="text-xs"
                            >
                              {project.visibility === "public" ? "公开" : "私有"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {project.is_featured && (
                              <Badge variant="default" className="text-xs bg-yellow-500">
                                精选
                              </Badge>
                            )}
                            
                            {/* 访问量显示 */}
                            {project.views && project.views > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {project.views}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
