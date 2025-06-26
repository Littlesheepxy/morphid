'use client'

import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Filter, Users, MapPin, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// 临时模拟数据
const mockUsers = [
  {
    id: '1',
    title: '资深产品经理寻找远程机会',
    description: '8年B端产品经验，擅长AI产品设计',
    category: '求职',
    tags: ['求职', '远程工作'],
    industryTags: ['AI', '产品设计', 'SaaS'],
    location: '北京',
    updatedAt: '2天前更新',
    viewCount: 156,
    avatar: '/placeholder-user.jpg'
  },
  {
    id: '2',
    title: '寻找技术合伙人 - AI创业项目',
    description: '有成熟的AI产品idea，寻找CTO合伙人',
    category: '寻找合作',
    tags: ['寻找合作', '创业'],
    industryTags: ['AI', '创业', '技术'],
    location: '上海',
    updatedAt: '1天前更新',
    viewCount: 89,
    avatar: '/placeholder-user.jpg'
  },
  {
    id: '3',
    title: '全栈开发者 - 接私活',
    description: '5年全栈经验，React/Node.js，可远程',
    category: '自由职业/开发者',
    tags: ['自由职业', '开发'],
    industryTags: ['前端', '后端', 'React'],
    location: '深圳',
    updatedAt: '3小时前更新',
    viewCount: 234,
    avatar: '/placeholder-user.jpg'
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

function UserCard({ user }: { user: typeof mockUsers[0] }) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
      {/* 用户头像和基本信息 */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user.title.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">
            {user.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
            {user.description}
          </p>
        </div>
      </div>

      {/* 标签区域 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="default" className="text-xs">
          {user.category}
        </Badge>
        {user.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            #{tag}
          </Badge>
        ))}
      </div>

      {/* 行业标签 */}
      <div className="flex flex-wrap gap-1 mb-4">
        {user.industryTags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
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
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{user.viewCount}次查看</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1">
          查看页面
        </Button>
        <Button variant="ghost" size="sm">
          ❤️
        </Button>
      </div>
    </Card>
  )
}

function SearchAndFilter() {
  return (
    <div className="space-y-4 mb-8">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="搜索用户、技能、公司..."
          className="pl-10 h-12"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={category === '全部' ? 'default' : 'outline'}
            size="sm"
            className="text-sm"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* 高级筛选 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          高级筛选
        </Button>
        <div className="text-sm text-muted-foreground">
          找到 {mockUsers.length} 个结果
        </div>
      </div>
    </div>
  )
}

function UserGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockUsers.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="p-6">
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
              <Skeleton className="h-8 w-10" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function PeoplePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">数字身份广场</h1>
        <p className="text-muted-foreground">
          发现有趣的人，寻找合作机会，建立有价值的连接
        </p>
      </div>

      {/* 搜索和筛选 */}
      <SearchAndFilter />

      {/* 用户网格 */}
      <Suspense fallback={<LoadingSkeleton />}>
        <UserGrid />
      </Suspense>
    </div>
  )
} 