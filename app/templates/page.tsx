import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, GitFork, Eye, Heart, Sparkles, Shield, Award } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CreatorVerificationDialog } from '@/components/dialogs/creator-verification-dialog'

// 临时模拟数据
const mockTemplates = [
  {
    id: '1',
    title: '高级产品经理简历页',
    description: '适用于年薪30w+的职场精英，简约商务风格',
    category: '简历页',
    tags: ['简历', '高端职位'],
    designTags: ['简约商务', '深色主题'],
    creator: {
      name: '设计猫',
      avatar: '/placeholder-user.jpg'
    },
    forkCount: 89,
    useCount: 234,
    viewCount: 1200,
    isFeatured: true,
    thumbnail: '/placeholder.jpg',
    createdAt: '2天前'
  },
  {
    id: '2',
    title: 'AI创业者项目展示页',
    description: '突出技术实力和创新能力的现代化设计',
    category: '作品集展示页',
    tags: ['创业', 'AI项目'],
    designTags: ['科技感', '渐变色'],
    creator: {
      name: '产品汪',
      avatar: '/placeholder-user.jpg'
    },
    forkCount: 156,
    useCount: 89,
    viewCount: 890,
    isFeatured: false,
    thumbnail: '/placeholder.jpg',
    createdAt: '1天前'
  },
  {
    id: '3',
    title: '自由职业者服务介绍页',
    description: '展示专业技能和服务项目，吸引潜在客户',
    category: '咨询介绍页',
    tags: ['自由职业', '服务展示'],
    designTags: ['温馨', '卡片式'],
    creator: {
      name: '独立开发者',
      avatar: '/placeholder-user.jpg'
    },
    forkCount: 67,
    useCount: 145,
    viewCount: 567,
    isFeatured: false,
    thumbnail: '/placeholder.jpg',
    createdAt: '3天前'
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

function TemplateCard({ template }: { template: typeof mockTemplates[0] }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* 模板缩略图 */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {template.isFeatured && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-yellow-500 text-yellow-900 gap-1">
              <Sparkles className="w-3 h-3" />
              精选
            </Badge>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-full h-full bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 flex items-center justify-center">
          <div className="text-6xl opacity-20">🎨</div>
        </div>
      </div>

      <div className="p-5">
        {/* 标题和描述 */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {template.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {template.description}
          </p>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="default" className="text-xs">
            {template.category}
          </Badge>
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* 设计风格标签 */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.designTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* 创建者信息 */}
        <div className="flex items-center gap-2 mb-4">
          <Avatar className="w-6 h-6">
            <AvatarImage src={template.creator.avatar} />
            <AvatarFallback>{template.creator.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            @{template.creator.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {template.createdAt}
          </span>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              <span>{template.forkCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{template.viewCount}</span>
            </div>
          </div>
          <div className="text-xs">
            {template.useCount}人已使用
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1">
            <GitFork className="w-3 h-3 mr-1" />
            Fork
          </Button>
          <Button variant="outline" size="sm">
            预览
          </Button>
          <Button variant="ghost" size="sm">
            <Heart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function SearchAndFilter() {
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
    <div className="space-y-4 mb-8">
      {/* 创作者认证横幅 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">成为认证创作者</h3>
              <p className="text-sm text-blue-700">
                获得认证标识，提升模板可信度，获得更多曝光机会
              </p>
            </div>
          </div>
          <CreatorVerificationDialog onSubmit={handleVerificationSubmit}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Award className="w-4 h-4 mr-2" />
              申请认证
            </Button>
          </CreatorVerificationDialog>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="搜索模板、标签、创建者..."
          className="pl-10 h-12"
        />
      </div>

      {/* 分类和排序 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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

        {/* 排序选择 */}
        <div className="flex items-center gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={option.value === 'popular' ? 'default' : 'outline'}
              size="sm"
              className="text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 结果统计 */}
      <div className="text-sm text-muted-foreground">
        找到 {mockTemplates.length} 个模板
      </div>
    </div>
  )
}

function TemplateGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockTemplates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-5 space-y-4">
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
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">灵感模板库</h1>
        <p className="text-muted-foreground">
          发现优质模板，获取创作灵感，快速搭建专业页面
        </p>
      </div>

      {/* 搜索和筛选 */}
      <SearchAndFilter />

      {/* 模板网格 */}
      <Suspense fallback={<LoadingSkeleton />}>
        <TemplateGrid />
      </Suspense>
    </div>
  )
} 