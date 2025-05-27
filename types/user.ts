export interface User {
  id: string
  clerkId: string
  email: string
  username?: string
  plan: 'free' | 'pro'
  defaultModel: string
  createdAt: string
}

export interface CreateUserData {
  clerkId: string
  email: string
  username?: string
}
