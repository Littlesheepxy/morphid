"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/contexts/theme-context"
import { Sparkles, Zap, Users, Shield } from "lucide-react"

export default function HomePage() {
  const { theme } = useTheme()

  // Landing page
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100" : "bg-gradient-dark"
      }`}
    >
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>HeysMe</span>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <Button variant="ghost" className={`rounded-2xl ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
              登录
            </Button>
            <Button className="rounded-2xl">注册</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-6" variant="secondary">
          🚀 v0.1 MVP 版本
        </Badge>
        <h1
          className={`text-5xl font-bold mb-6 bg-gradient-to-r bg-clip-text text-transparent ${
            theme === "light" ? "from-blue-600 to-purple-600" : "from-blue-400 to-purple-400"
          }`}
        >
          AI 驱动的职业身份平台
        </h1>
        <p className={`text-xl mb-8 max-w-2xl mx-auto ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
          通过智能对话，AI 为你生成个性化的职业主页。展示项目、技能、经历，让机会主动找到你。
        </p>
        <Button
          size="lg"
          asChild
          className="text-lg px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white"
        >
          <a href="/chat">
            <Sparkles className="w-5 h-5 mr-2" />
            开始创建 HeysMe
          </a>
        </Button>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className={`text-3xl font-bold text-center mb-12 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
          为什么选择 HeysMe？
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card
            className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
              theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
            }`}
          >
            <CardHeader>
              <Zap className="w-10 h-10 text-blue-500 mb-4" />
              <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>AI 智能生成</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={theme === "light" ? "text-gray-600" : "text-gray-300"}>
                基于你的身份、目标和风格偏好，AI 自动生成专业的页面结构和内容。
              </p>
            </CardContent>
          </Card>

          <Card
            className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
              theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
            }`}
          >
            <CardHeader>
              <Users className="w-10 h-10 text-green-500 mb-4" />
              <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>多样化展示</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={theme === "light" ? "text-gray-600" : "text-gray-300"}>
                支持项目作品、技能专长、工作经历等多种内容模块，全方位展示你的能力。
              </p>
            </CardContent>
          </Card>

          <Card
            className={`rounded-3xl shadow-lg backdrop-blur-sm border ${
              theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
            }`}
          >
            <CardHeader>
              <Shield className="w-10 h-10 text-purple-500 mb-4" />
              <CardTitle className={theme === "light" ? "text-gray-900" : "text-white"}>灵活权限控制</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={theme === "light" ? "text-gray-600" : "text-gray-300"}>
                支持公开、私密、链接可见等多种权限设置，完全掌控你的信息展示。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card
          className={`max-w-2xl mx-auto rounded-3xl shadow-lg backdrop-blur-sm border ${
            theme === "light" ? "bg-white/80 border-white/30" : "bg-gray-800/80 border-gray-700/30"
          }`}
        >
          <CardContent className="p-12">
            <h2 className={`text-3xl font-bold mb-4 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
              准备好创建你的 HeysMe 了吗？
            </h2>
            <p className={`mb-8 ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
              只需几分钟，就能拥有一个专业的职业主页
            </p>
            <Button
              size="lg"
              asChild
              className="text-lg px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-xl hover:shadow-2xl transition-all duration-300 text-white"
            >
              <a href="/chat">
                <Sparkles className="w-5 h-5 mr-2" />
                立即开始
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
