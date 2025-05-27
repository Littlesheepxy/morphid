# 📋 FlowID 开发计划

## 🎯 开发阶段概览

### Phase 1: 基础架构搭建 (Week 1-2)
- 项目初始化
- 基础UI框架
- 用户认证系统
- 数据库设计

### Phase 2: 核心功能开发 (Week 3-5)
- AI模型集成
- 页面生成系统
- 页面编辑器
- 页面渲染引擎

### Phase 3: 高级功能 (Week 6-7)
- 多页面管理
- 权限系统
- Explore社区
- 分享功能

### Phase 4: 优化与部署 (Week 8)
- 性能优化
- 测试
- 部署上线

---

## 🚀 Phase 1: 基础架构搭建

### 1.1 项目初始化
```bash
# 创建Next.js项目
npx create-next-app@latest flowid --typescript --tailwind --eslint --app
cd flowid

# 安装核心依赖
npm install @clerk/nextjs @supabase/supabase-js zustand
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install lucide-react @hookform/resolvers zod react-hook-form
```

**任务清单:**
- [ ] 初始化Next.js项目
- [ ] 配置TypeScript和ESLint
- [ ] 设置Tailwind CSS
- [ ] 安装Shadcn/ui组件库
- [ ] 配置项目结构

### 1.2 项目结构设计
```
flowid/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── create/
│   │   └── pages/
│   ├── (public)/
│   │   ├── explore/
│   │   └── [username]/
│   ├── api/
│   │   ├── generate/
│   │   ├── pages/
│   │   └── users/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── blocks/
│   ├── editor/
│   └── layout/
├── lib/
│   ├── supabase.ts
│   ├── clerk.ts
│   ├── ai/
│   └── utils.ts
├── types/
│   ├── page.ts
│   ├── user.ts
│   └── blocks.ts
└── hooks/
```

### 1.3 环境配置
创建 `.env.local`:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Models
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
```

### 1.4 用户认证系统 (Clerk)
**任务清单:**
- [ ] 配置Clerk认证
- [ ] 创建登录/注册页面
- [ ] 设置OAuth (GitHub, Google)
- [ ] 配置用户中间件
- [ ] 创建用户Profile页面

### 1.5 数据库设计 (Supabase)
**SQL脚本:**
```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  default_model TEXT DEFAULT 'claude',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 页面表
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  theme TEXT DEFAULT 'zen',
  layout TEXT DEFAULT 'grid',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'link-only')),
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- 页面模块表
CREATE TABLE page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_pages_user_id ON pages(user_id);
CREATE INDEX idx_pages_visibility ON pages(visibility);
CREATE INDEX idx_page_blocks_page_id ON page_blocks(page_id);
```

---

## 🧠 Phase 2: 核心功能开发

### 2.1 类型定义
创建 `types/page.ts`:
```typescript
export interface FlowPage {
  id: string
  title: string
  slug: string
  visibility: 'public' | 'private' | 'link-only'
  theme: 'zen' | 'creative' | 'devgrid' | 'minimal'
  layout: 'grid' | 'hero' | 'twocol' | 'stack'
  blocks: PageBlock[]
  userId: string
  createdAt: string
  updatedAt: string
}

export type PageBlock = 
  | HeroBlock 
  | ProjectBlock 
  | SkillBlock 
  | LinkBlock 
  | RecruitBlock 
  | CustomBlock

export interface HeroBlock {
  id: string
  type: 'hero'
  data: {
    name: string
    title: string
    description: string
    avatar?: string
    background?: string
  }
}

export interface ProjectBlock {
  id: string
  type: 'project'
  data: {
    title: string
    projects: Array<{
      name: string
      description: string
      url?: string
      image?: string
      tags: string[]
    }>
  }
}

// ... 其他Block类型定义
```

### 2.2 AI模型集成
创建 `lib/ai/models.ts`:
```typescript
export interface AIModel {
  name: string
  provider: 'anthropic' | 'openai' | 'google'
  generate: (prompt: string) => Promise<FlowPage>
}

export class ClaudeModel implements AIModel {
  name = 'Claude 3.7 Sonnet'
  provider = 'anthropic' as const

  async generate(prompt: string): Promise<FlowPage> {
    // Claude API调用逻辑
  }
}

export class OpenAIModel implements AIModel {
  name = 'GPT-4 Turbo'
  provider = 'openai' as const

  async generate(prompt: string): Promise<FlowPage> {
    // OpenAI API调用逻辑
  }
}
```

### 2.3 页面生成API
创建 `app/api/generate/route.ts`:
```typescript
export async function POST(request: Request) {
  const { role, purpose, style, displayPriority, modelType } = await request.json()
  
  // 构建prompt
  const prompt = buildPrompt({ role, purpose, style, displayPriority })
  
  // 选择模型
  const model = getModel(modelType)
  
  // 生成页面
  const page = await model.generate(prompt)
  
  return Response.json(page)
}
```

### 2.4 多阶段输入组件
创建 `components/create/MultiStepForm.tsx`:
```typescript
export function MultiStepForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    role: '',
    purpose: '',
    style: '',
    displayPriority: []
  })

  const steps = [
    { title: '身份背景', component: RoleStep },
    { title: '目标用途', component: PurposeStep },
    { title: '表达风格', component: StyleStep },
    { title: '展示重点', component: DisplayStep }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator currentStep={step} totalSteps={steps.length} />
      {/* 渲染当前步骤组件 */}
    </div>
  )
}
```

**任务清单:**
- [ ] 实现多阶段表单
- [ ] 创建各步骤组件
- [ ] 集成AI模型API
- [ ] 实现页面生成逻辑
- [ ] 添加加载状态和错误处理

---

## 🎨 Phase 3: 页面编辑与渲染

### 3.1 页面编辑器
创建 `components/editor/PageEditor.tsx`:
```typescript
export function PageEditor({ page }: { page: FlowPage }) {
  const [editingPage, setEditingPage] = useState(page)
  
  return (
    <div className="flex h-screen">
      {/* 左侧编辑面板 */}
      <div className="w-1/3 border-r">
        <BlockList blocks={editingPage.blocks} />
        <ThemeSelector />
        <LayoutSelector />
      </div>
      
      {/* 右侧预览 */}
      <div className="flex-1">
        <PagePreview page={editingPage} />
      </div>
    </div>
  )
}
```

### 3.2 页面渲染引擎
创建 `components/render/PageRenderer.tsx`:
```typescript
export function PageRenderer({ page }: { page: FlowPage }) {
  const themeClass = getThemeClass(page.theme)
  const layoutClass = getLayoutClass(page.layout)
  
  return (
    <div className={cn(themeClass, layoutClass)}>
      {page.blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

function BlockRenderer({ block }: { block: PageBlock }) {
  switch (block.type) {
    case 'hero':
      return <HeroBlockComponent data={block.data} />
    case 'project':
      return <ProjectBlockComponent data={block.data} />
    // ... 其他block类型
  }
}
```

### 3.3 主题系统
创建 `lib/themes.ts`:
```typescript
export const themes = {
  zen: {
    name: '极简禅意',
    colors: {
      primary: 'slate',
      accent: 'blue'
    },
    typography: 'font-sans',
    spacing: 'relaxed'
  },
  creative: {
    name: '创意炫酷',
    colors: {
      primary: 'purple',
      accent: 'pink'
    },
    typography: 'font-mono',
    spacing: 'tight'
  },
  // ... 其他主题
}
```

**任务清单:**
- [ ] 实现页面编辑器
- [ ] 创建Block组件库
- [ ] 实现主题系统
- [ ] 添加拖拽排序功能
- [ ] 实现实时预览

---

## 🔗 Phase 4: 高级功能

### 4.1 多页面管理
创建 `app/(dashboard)/pages/page.tsx`:
```typescript
export default function PagesPage() {
  const { pages, createPage, deletePage } = usePages()
  
  return (
    <div>
      <PageHeader />
      <PageGrid pages={pages} />
      <CreatePageButton onClick={createPage} />
    </div>
  )
}
```

### 4.2 权限系统
创建 `lib/permissions.ts`:
```typescript
export function canViewPage(page: FlowPage, userId?: string) {
  if (page.visibility === 'public') return true
  if (page.visibility === 'private') return page.userId === userId
  if (page.visibility === 'link-only') return true // 通过链接访问
  return false
}
```

### 4.3 Explore社区
创建 `app/(public)/explore/page.tsx`:
```typescript
export default function ExplorePage() {
  const { featuredPages, recentPages } = useExplore()
  
  return (
    <div>
      <ExploreHeader />
      <FeaturedSection pages={featuredPages} />
      <RecentSection pages={recentPages} />
    </div>
  )
}
```

### 4.4 分享功能
创建 `app/[username]/[slug]/page.tsx`:
```typescript
export default async function PublicPageView({ 
  params 
}: { 
  params: { username: string, slug: string } 
}) {
  const page = await getPublicPage(params.username, params.slug)
  
  if (!page) {
    notFound()
  }
  
  return (
    <div>
      <PageRenderer page={page} />
      <ShareButtons page={page} />
    </div>
  )
}
```

**任务清单:**
- [ ] 实现页面管理界面
- [ ] 添加权限控制
- [ ] 创建Explore社区
- [ ] 实现分享功能
- [ ] 添加SEO优化

---

## 🚀 Phase 5: 优化与部署

### 5.1 性能优化
- [ ] 图片优化 (Next.js Image)
- [ ] 代码分割
- [ ] 缓存策略
- [ ] 数据库查询优化

### 5.2 测试
- [ ] 单元测试 (Jest)
- [ ] 集成测试 (Playwright)
- [ ] E2E测试
- [ ] 性能测试

### 5.3 部署配置
```yaml
# vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://flowid.ai"
  }
}
```

### 5.4 监控与分析
- [ ] 错误监控 (Sentry)
- [ ] 性能监控 (Vercel Analytics)
- [ ] 用户行为分析
- [ ] API监控

**任务清单:**
- [ ] 性能优化
- [ ] 添加测试覆盖
- [ ] 配置CI/CD
- [ ] 部署到Vercel
- [ ] 设置监控

---

## 📊 里程碑检查点

### Milestone 1: 基础功能 (Week 2)
- ✅ 用户可以注册登录
- ✅ 可以创建基础页面
- ✅ AI生成功能正常

### Milestone 2: 核心体验 (Week 5)
- ✅ 多阶段输入流程完整
- ✅ 页面编辑器可用
- ✅ 主题切换正常

### Milestone 3: 完整产品 (Week 7)
- ✅ 多页面管理
- ✅ 分享功能
- ✅ Explore社区

### Milestone 4: 生产就绪 (Week 8)
- ✅ 性能优化完成
- ✅ 测试覆盖充分
- ✅ 部署上线

---

## 🛠 开发工具推荐

### 代码质量
- ESLint + Prettier
- Husky (Git hooks)
- Commitlint

### 开发体验
- VS Code扩展
- Tailwind CSS IntelliSense
- TypeScript Hero

### 调试工具
- React Developer Tools
- Supabase Dashboard
- Clerk Dashboard

---

## 📝 注意事项

1. **API限制**: 注意各AI模型的调用限制和成本
2. **数据安全**: 用户数据加密存储
3. **性能**: 大页面的渲染性能优化
4. **SEO**: 公开页面的搜索引擎优化
5. **移动端**: 响应式设计适配

## 🎯 下一步行动

1. 立即开始Phase 1的项目初始化
2. 设置开发环境和工具链
3. 创建项目仓库和文档
4. 开始第一个功能的开发

---

*最后更新: 2024年12月* 