/**
 * 登录页面
 *
 * 功能：
 * - 邮箱密码登录
 * - 社交登录 (Google, GitHub)
 * - 忘记��码功能
 * - 自动跳转到目标页面
 *
 * TODO:
 * - [ ] 添加验证码登录
 * - [ ] 支持手机号登录
 * - [ ] 添加登录设备管理
 * - [ ] 实现单点登录(SSO)
 */

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Mail, Lock, Github, Chrome, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // 邮箱密码登录
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error

      // 登录成功，跳转到目标页面
      router.push(redirectTo)
    } catch (error: any) {
      setError(error.message || "登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 社交登录
  const handleSocialLogin = async (provider: "google" | "github") => {
    setIsLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || "社交登录失败，请重试")
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        theme === "light" ? "bg-gradient-light" : "bg-gradient-dark"
      }`}
    >
      {/* 主题切换按钮 */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* 返回首页按钮 */}
      <div className="absolute top-4 left-4">
        <Button variant="ghost" asChild className="rounded-2xl">
          <Link href="/">
            <Sparkles className="w-4 h-4 mr-2" />
            HeysMe
          </Link>
        </Button>
      </div>

      <Card
        className={`w-full max-w-md rounded-3xl shadow-2xl backdrop-blur-xl border ${
          theme === "light" ? "bg-white/90 border-white/30" : "bg-gray-900/90 border-gray-700/30"
        }`}
      >
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className={`text-2xl font-bold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
            欢迎回来
          </CardTitle>
          <p className={`${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>登录到你的 HeysMe 账户</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 邮箱密码登录表单 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={theme === "light" ? "text-gray-700" : "text-gray-300"}>
                邮箱地址
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 rounded-2xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={theme === "light" ? "text-gray-700" : "text-gray-300"}>
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 rounded-2xl"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-xl"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/auth/forgot-password"
                className={`text-sm hover:underline ${
                  theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
                }`}
              >
                忘记密码？
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>

          {/* 分割线 */}
          <div className="relative">
            <Separator />
            <span
              className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 px-2 text-sm ${
                theme === "light" ? "bg-white text-gray-500" : "bg-gray-900 text-gray-400"
              }`}
            >
              或
            </span>
          </div>

          {/* 社交登录 */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
              className="w-full rounded-2xl"
            >
              <Chrome className="w-4 h-4 mr-2" />
              使用 Google 登录
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin("github")}
              disabled={isLoading}
              className="w-full rounded-2xl"
            >
              <Github className="w-4 h-4 mr-2" />
              使用 GitHub 登录
            </Button>
          </div>

          {/* 注册链接 */}
          <div className="text-center">
            <span className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              还没有账户？{" "}
              <Link
                href="/auth/register"
                className={`font-medium hover:underline ${
                  theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-300"
                }`}
              >
                立即注册
              </Link>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
