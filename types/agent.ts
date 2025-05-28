export interface Intent {
  type: "create_MorphID" | "edit_MorphID" | "general_chat" | "help"
  confidence: number
  entities?: Record<string, any>
}

export interface Agent {
  id: string
  name: string
  description: string
  systemPrompt: string
  capabilities: string[]
}

export interface AgentResponse {
  content: string
  options?: ChatOption[]
  nextStep?: string
  requiresInput?: boolean
  metadata?: Record<string, any>
}

export interface ChatOption {
  id: string
  label: string
  value: string
  type: "selection" | "input" | "action"
}
