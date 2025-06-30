'use client'

import { Suspense, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Filter, Users, MapPin, Clock, Sparkles, Heart, Eye, MessageSquare, ChevronRight, Star, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/contexts/theme-context'

// 临时模拟数据 - 增强版
const mockUsers = [
  {
    id: '1',
    title: '资深产品经理寻找远程机会',
    description: '8年B端产品经验，擅长AI产品设计，曾主导多个千万级用户产品',
    category: '求职',
    tags: ['求职', '远程工作'],
    industryTags: ['AI', '产品设计', 'SaaS'],
    location: '北京',
    updatedAt: '2天前更新',
    viewCount: 156,
    favoriteCount: 23,
    avatar: '/placeholder-user.jpg',
    verified: true,
    trending: true
  },
  {
    id: '2',
    title: '寻找技术合伙人 - AI创业项目',
    description: '有成熟的AI产品idea，寻找CTO合伙人，已获得天使轮投资',
    category: '寻找合作',
    tags: ['寻找合作', '创业'],
    industryTags: ['AI', '创业', '技术'],
    location: '上海',
    updatedAt: '1天前更新',
    viewCount: 89,
    favoriteCount: 34,
    avatar: '/placeholder-user.jpg',
    verified: false,
    trending: false
  },
  {
    id: '3',
    title: '全栈开发者 - 接私活',
    description: '5年全栈经验，React/Node.js，可远程，服务过多家知名企业',
    category: '自由职业/开发者',
    tags: ['自由职业', '开发'],
    industryTags: ['前端', '后端', 'React'],
    location: '深圳',
    updatedAt: '3小时前更新',
    viewCount: 234,
    favoriteCount: 45,
    avatar: '/placeholder-user.jpg',
    verified: true,
    trending: true
  },
  {
    id: '4',
    title: 'UI/UX设计师 - 品牌升级专家',
    description: '专注于B端产品设计，擅长设计系统搭建，服务过独角兽公司',
    category: '咨询服务',
    tags: ['设计', '品牌'],
    industryTags: ['UI设计', 'UX设计', '品牌'],
    location: '杭州',
    updatedAt: '5小时前更新',
    viewCount: 178,
    favoriteCount: 67,
    avatar: '/placeholder-user.jpg',
    verified: true,
    trending: false
  }
]

const categories = [
  '全部',
  '求职',
  '招聘',
  '寻找合作',
  '寻找投资人/投资机会',
  '托管/运营服务',
  '咨询服务',
  '个人展示/KOL',
  '内容创作者/自媒体',
  '教育辅导',
  '自由职业/开发者',
  '其他'
]

function UserCard({ user, index }: { user: typeof mockUsers[0], index: number }) {
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
        <CardContent className="p-6">
          {/* 顶部标识 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {user.trending && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  热门
                </Badge>
              )}
              {user.verified && (
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 gap-1">
                  <Star className="w-3 h-3" />
                  认证
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl ${
                theme === "light"
                  ? "hover:bg-emerald-50 text-emerald-600"
                  : "hover:bg-emerald-900/20 text-emerald-400"
              }`}
            >
              <Heart className="w-4 h-4" />
            </Button>
          </div>

          {/* 用户头像和基本信息 */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-12 h-12 ring-2 ring-emerald-500/30">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-brand-gradient text-white font-semibold">
                  {user.title.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {user.verified && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Star className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-lg mb-1 line-clamp-2 ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}>
                {user.title}
              </h3>
              <p className={`text-sm mb-2 line-clamp-2 ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              }`}>
                {user.description}
              </p>
            </div>
          </div>

          {/* 标签区域 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge 
              variant="default" 
              className="text-xs bg-brand-gradient border-0 text-white"
            >
              {user.category}
            </Badge>
            {user.tags.slice(0, 2).map((tag) => (
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

          {/* 行业标签 */}
          <div className="flex flex-wrap gap-1 mb-4">
            {user.industryTags.map((tag) => (
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

          {/* 统计信息 */}
          <div className={`flex items-center justify-between text-sm mb-4 ${
            theme === "light" ? "text-gray-500" : "text-gray-400"
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{user.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{user.updatedAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{user.viewCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{user.favoriteCount}</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-brand-gradient hover:shadow-brand text-white border-0 rounded-xl transition-all duration-300"
              size="sm"
            >
              <Eye className="w-3 h-3 mr-1" />
              查看页面
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
              <MessageSquare className="w-3 h-3 mr-1" />
              联系
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
  
  return (
    <motion.div 
      className="space-y-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* 搜索框 */}
      <div className="relative max-w-2xl mx-auto">
        <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
          theme === "light" ? "text-gray-400" : "text-gray-500"
        }`} />
        <Input
          placeholder="搜索用户、技能、公司、项目..."
          className={`pl-12 h-14 text-lg rounded-2xl border-2 transition-all duration-300 ${
            theme === "light"
              ? "bg-white/80 border-emerald-100 focus:border-emerald-300 focus:bg-white"
              : "bg-gray-800/80 border-emerald-700/30 focus:border-emerald-500 focus:bg-gray-800"
          }`}
        />
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2 justify-center">
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

      {/* 筛选和统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            className={`rounded-xl transition-all duration-300 ${
              theme === "light"
                ? "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                : "border-emerald-700 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900/20"
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            高级筛选
          </Button>
          <div className={`text-sm ${
            theme === "light" ? "text-gray-600" : "text-gray-400"
          }`}>
            找到 <span className="font-semibold text-emerald-600">{mockUsers.length}</span> 个结果
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-sm ${
            theme === "light" ? "text-gray-500" : "text-gray-400"
          }`}>
            排序：
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
            最新更新
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function UserGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockUsers.map((user, index) => (
        <UserCard key={user.id} user={user} index={index} />
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
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function PeoplePage() {
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
              className="w-20 h-20 bg-brand-gradient rounded-3xl flex items-center justify-center shadow-brand-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Users className="w-10 h-10 text-white" />
            </motion.div>
            <div className="text-center sm:text-left">
              <motion.h1 
                className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                数字身份广场
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
                  文字是空洞的，展示你的 demo。
                </p>
                <p className={`text-base italic ${
                  theme === "light" ? "text-emerald-600" : "text-emerald-400"
                }`}>
                  Words are cheap, show your demo.
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
            发现有趣的人，寻找合作机会，建立有价值的连接。在这里，每个人都可以展示真实的作品和能力。
          </motion.p>
        </motion.div>

        {/* 搜索和筛选 */}
        <SearchAndFilter />

        {/* 用户网格 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <UserGrid />
          </Suspense>
        </motion.div>
      </div>
      
      {/* 背景装饰 */}
      <div className="fixed top-20 left-10 w-20 h-20 bg-brand-gradient rounded-full opacity-5 animate-brand-pulse"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-brand-gradient rounded-full opacity-3 animate-brand-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="fixed top-1/2 right-20 w-16 h-16 bg-brand-gradient rounded-full opacity-5 animate-brand-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
  )
} 