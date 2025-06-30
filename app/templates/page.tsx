'use client'

import { Suspense, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, GitFork, Eye, Heart, Sparkles, Shield, Award, BookTemplate, Star, TrendingUp, Download, Play, ChevronRight, Code2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CreatorVerificationDialog } from '@/components/dialogs/creator-verification-dialog'
import { useTheme } from '@/contexts/theme-context'

// 临时模拟数据 - 增强版
const mockTemplates = [
  {
    id: '1',
    title: '高级产品经理简历页',
    description: '适用于年薪30w+的职场精英，简约商务风格，包含完整的项目展示和技能矩阵',
    category: '简历页',
    tags: ['简历', '高端职位'],
    designTags: ['简约商务', '深色主题'],
    creator: {
      name: '设计猫',
      avatar: '/placeholder-user.jpg',
      verified: true
    },
    forkCount: 89,
    useCount: 234,
    viewCount: 1200,
    favoriteCount: 156,
    isFeatured: true,
    trending: true,
    thumbnail: '/placeholder.jpg',
    createdAt: '2天前',
    difficulty: 'advanced'
  },
  {
    id: '2',
    title: 'AI创业者项目展示页',
    description: '突出技术实力和创新能力的现代化设计，适合技术创业者展示项目成果',
    category: '作品集展示页',
    tags: ['创业', 'AI项目'],
    designTags: ['科技感', '渐变色'],
    creator: {
      name: '产品汪',
      avatar: '/placeholder-user.jpg',
      verified: false
    },
    forkCount: 156,
    useCount: 89,
    viewCount: 890,
    favoriteCount: 67,
    isFeatured: false,
    trending: true,
    thumbnail: '/placeholder.jpg',
    createdAt: '1天前',
    difficulty: 'intermediate'
  },
  {
    id: '3',
    title: '自由职业者服务介绍页',
    description: '展示专业技能和服务项目，吸引潜在客户，包含价格表和案例展示',
    category: '咨询介绍页',
    tags: ['自由职业', '服务展示'],
    designTags: ['温馨', '卡片式'],
    creator: {
      name: '独立开发者',
      avatar: '/placeholder-user.jpg',
      verified: true
    },
    forkCount: 67,
    useCount: 145,
    viewCount: 567,
    favoriteCount: 89,
    isFeatured: false,
    trending: false,
    thumbnail: '/placeholder.jpg',
    createdAt: '3天前',
    difficulty: 'beginner'
  },
  {
    id: '4',
    title: '现代化品牌故事页',
    description: '讲述品牌故事的创意页面，适合初创公司和个人品牌展示',
    category: '品牌故事页',
    tags: ['品牌', '故事'],
    designTags: ['创意', '动画'],
    creator: {
      name: '品牌专家',
      avatar: '/placeholder-user.jpg',
      verified: true
    },
    forkCount: 123,
    useCount: 78,
    viewCount: 654,
    favoriteCount: 102,
    isFeatured: true,
    trending: false,
    thumbnail: '/placeholder.jpg',
    createdAt: '1周前',
    difficulty: 'intermediate'
  }
]

const categories = [
  '全部',
  '简历页',
  '招聘页',
  '咨询介绍页',
  '作品集展示页',
  '导师推荐页',
  '品牌故事页',
  '内容创作页',
  '其他用途'
]

const sortOptions = [
  { value: 'popular', label: '🔥 最受欢迎' },
  { value: 'recent', label: '🆕 最近上传' },
  { value: 'ai-recommended', label: '🤖 AI推荐' },
  { value: 'featured', label: '⭐ 编辑精选' }
]

const difficultyColors: Record<string, string> = {
  beginner: 'from-green-500 to-emerald-500',
  intermediate: 'from-yellow-500 to-orange-500',
  advanced: 'from-red-500 to-pink-500'
}

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶', 
  advanced: '高级'
}

function TemplateCard({ template, index }: { template: typeof mockTemplates[0], index: number }) {
  const { theme } = useTheme()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-brand-lg group cursor-pointer ${
        theme === "light" 
          ? "bg-white/80 border-emerald-100/60 backdrop-blur-xl" 
          : "bg-gray-800/80 border-emerald-700/30 backdrop-blur-xl"
      }`}>
        {/* 模板缩略图 */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* 顶部标识 */}
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            {template.isFeatured && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1">
                <Star className="w-3 h-3" />
                精选
              </Badge>
            )}
            {template.trending && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1">
                <TrendingUp className="w-3 h-3" />
                热门
              </Badge>
            )}
          </div>
          
          {/* 难度标识 */}
          <div className="absolute top-3 right-3 z-10">
            <Badge className={`bg-gradient-to-r ${difficultyColors[template.difficulty]} text-white border-0`}>
              {difficultyLabels[template.difficulty]}
            </Badge>
          </div>
          
          {/* 悬停操作 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 bg-white/90 text-gray-900 hover:bg-white border-0 rounded-xl"
              >
                <Play className="w-3 h-3 mr-1" />
                预览
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 rounded-xl"
              >
                <Heart className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* 模板预览图 */}
          <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 flex items-center justify-center">
            <div className="text-6xl opacity-20">
              <BookTemplate />
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {/* 标题和描述 */}
          <div className="mb-4">
            <h3 className={`font-semibold text-lg mb-2 line-clamp-2 ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              {template.title}
            </h3>
            <p className={`text-sm line-clamp-2 ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}>
              {template.description}
            </p>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge 
              variant="default" 
              className="text-xs bg-brand-gradient border-0 text-white"
            >
              {template.category}
            </Badge>
            {template.tags.slice(0, 2).map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className={`text-xs ${
                  theme === "light" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-emerald-900/20 text-emerald-300 border-emerald-700/30"
                }`}
              >
                #{tag}
              </Badge>
            ))}
          </div>

          {/* 设计风格标签 */}
          <div className="flex flex-wrap gap-1 mb-4">
            {template.designTags.map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className={`text-xs transition-colors ${
                  theme === "light"
                    ? "border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                    : "border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-300"
                }`}
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* 创建者信息 */}
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="w-6 h-6 ring-2 ring-emerald-500/30">
              <AvatarImage src={template.creator.avatar} />
              <AvatarFallback className="bg-brand-gradient text-white text-xs">
                {template.creator.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className={`text-sm ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}>
              @{template.creator.name}
            </span>
            {template.creator.verified && (
              <Star className="w-3 h-3 text-emerald-500" />
            )}
            <span className={`text-xs ml-auto ${
              theme === "light" ? "text-gray-500" : "text-gray-500"
            }`}>
              {template.createdAt}
            </span>
          </div>

          {/* 统计信息 */}
          <div className={`flex items-center justify-between text-sm mb-4 ${
            theme === "light" ? "text-gray-500" : "text-gray-400"
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                <span>{template.forkCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{template.viewCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{template.favoriteCount}</span>
              </div>
            </div>
            <div className="text-xs">
              <span className="font-semibold text-emerald-600">{template.useCount}</span>人已使用
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-brand-gradient hover:shadow-brand text-white border-0 rounded-xl transition-all duration-300"
              size="sm"
            >
              <GitFork className="w-3 h-3 mr-1" />
              Fork
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={`rounded-xl transition-all duration-300 ${
                theme === "light"
                  ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              <Code2 className="w-3 h-3 mr-1" />
              查看代码
            </Button>
          </div>
        </CardContent>
        
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-brand-gradient opacity-5 rounded-bl-3xl"></div>
      </Card>
    </motion.div>
  )
}

function SearchAndFilter() {
  const { theme } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [selectedSort, setSelectedSort] = useState('popular')
  
  // 处理创作者认证申请
  const handleVerificationSubmit = async (verificationData: any) => {
    console.log('认证申请数据:', verificationData)
    
    try {
      const response = await fetch('/api/creator-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      })

      if (!response.ok) {
        throw new Error('申请提交失败')
      }

      const result = await response.json()
      console.log('申请提交成功:', result)
      // TODO: 显示成功提示
    } catch (error) {
      console.error('申请提交失败:', error)
      // TODO: 显示错误提示
    }
  }

  return (
    <motion.div 
      className="space-y-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* 创作者认证横幅 */}
      <motion.div 
        className={`relative overflow-hidden rounded-2xl p-6 ${
          theme === "light"
            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
            : "bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-700/30"
        }`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-gradient rounded-2xl shadow-brand">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${
                theme === "light" ? "text-emerald-900" : "text-emerald-100"
              }`}>
                成为认证创作者
              </h3>
              <p className={`text-sm ${
                theme === "light" ? "text-emerald-700" : "text-emerald-300"
              }`}>
                获得认证标识，提升模板可信度，获得更多曝光机会和创作收益
              </p>
            </div>
          </div>
          <CreatorVerificationDialog onSubmit={handleVerificationSubmit}>
            <Button className="bg-brand-gradient hover:shadow-brand text-white border-0 rounded-xl">
              <Award className="w-4 h-4 mr-2" />
              申请认证
            </Button>
          </CreatorVerificationDialog>
        </div>
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gradient opacity-5 rounded-bl-3xl"></div>
      </motion.div>

      {/* 搜索框 */}
      <div className="relative max-w-2xl mx-auto">
        <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
          theme === "light" ? "text-gray-400" : "text-gray-500"
        }`} />
        <Input
          placeholder="搜索模板、标签、创建者、设计风格..."
          className={`pl-12 h-14 text-lg rounded-2xl border-2 transition-all duration-300 ${
            theme === "light"
              ? "bg-white/80 border-emerald-100 focus:border-emerald-300 focus:bg-white"
              : "bg-gray-800/80 border-emerald-700/30 focus:border-emerald-500 focus:bg-gray-800"
          }`}
        />
      </div>

      {/* 分类和排序 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`text-sm rounded-xl transition-all duration-300 ${
                selectedCategory === category
                  ? "bg-brand-gradient text-white border-0 shadow-brand"
                  : theme === "light"
                    ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                    : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* 排序选择 */}
        <div className="flex items-center gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedSort === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSort(option.value)}
              className={`text-sm rounded-xl transition-all duration-300 ${
                selectedSort === option.value
                  ? "bg-brand-gradient text-white border-0 shadow-brand"
                  : theme === "light"
                    ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                    : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 结果统计 */}
      <div className="flex items-center justify-between">
        <div className={`text-sm ${
          theme === "light" ? "text-gray-600" : "text-gray-400"
        }`}>
          找到 <span className="font-semibold text-emerald-600">{mockTemplates.length}</span> 个模板
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-sm ${
            theme === "light" ? "text-gray-500" : "text-gray-400"
          }`}>
            筛选：
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            className={`rounded-xl ${
              theme === "light"
                ? "text-emerald-700 hover:bg-emerald-50"
                : "text-emerald-400 hover:bg-emerald-900/20"
            }`}
          >
            全部难度
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function TemplateGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockTemplates.map((template, index) => (
        <TemplateCard key={template.id} template={template} index={index} />
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  const { theme } = useTheme()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className={`overflow-hidden ${
          theme === "light" 
            ? "bg-white/80 border-emerald-100/60" 
            : "bg-gray-800/80 border-emerald-700/30"
        }`}>
          <Skeleton className="aspect-[4/3] w-full" />
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function TemplatesPage() {
  const { theme } = useTheme()
  
  return (
    <div className={`min-h-screen transition-all duration-300 ${
      theme === "light" 
        ? "bg-page-gradient-light" 
        : "bg-page-gradient-dark"
    }`}>
      <div className="container mx-auto px-6 py-8">
        {/* 页面标题 */}
        <motion.div 
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            <motion.div 
              className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-brand-lg"
              whileHover={{ scale: 1.05, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BookTemplate className="w-10 h-10 text-white" />
            </motion.div>
            <div className="text-center sm:text-left">
              <motion.h1 
                className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                灵感模板库
              </motion.h1>
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className={`text-xl font-medium ${
                  theme === "light" ? "text-gray-800" : "text-gray-200"
                }`}>
                  代码是无力的，展示你的对话。
                </p>
                <p className={`text-base italic ${
                  theme === "light" ? "text-purple-600" : "text-purple-400"
                }`}>
                  Code is cheap, show your conversation.
                </p>
              </motion.div>
            </div>
          </div>
          <motion.p 
            className={`text-lg max-w-3xl mx-auto leading-relaxed ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            发现优质模板，获取创作灵感，快速搭建专业页面。在这里，每个模板都承载着创作者的智慧和经验。
          </motion.p>
        </motion.div>

        {/* 搜索和筛选 */}
        <SearchAndFilter />

        {/* 模板网格 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <TemplateGrid />
          </Suspense>
        </motion.div>
      </div>
      
      {/* 背景装饰 */}
      <div className="fixed top-20 left-10 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full opacity-5 animate-brand-pulse"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full opacity-3 animate-brand-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="fixed top-1/2 right-20 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full opacity-5 animate-brand-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
  )
} 