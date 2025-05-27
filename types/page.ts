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

export interface SkillBlock {
  id: string
  type: 'skill'
  data: {
    title: string
    skills: Array<{
      name: string
      level?: number
      category?: string
    }>
  }
}

export interface LinkBlock {
  id: string
  type: 'link'
  data: {
    title: string
    links: Array<{
      name: string
      url: string
      icon?: string
      description?: string
    }>
  }
}

export interface RecruitBlock {
  id: string
  type: 'recruit'
  data: {
    title: string
    isOpen: boolean
    description: string
    requirements?: string[]
    contact?: string
  }
}

export interface CustomBlock {
  id: string
  type: 'custom'
  data: {
    title: string
    content: string
    html?: string
  }
}
