import type { UserInput } from "./userInput" // Assuming UserInput is declared in another file

export interface ChatMessage {
  id: string
  type: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: {
    options?: ChatOption[]
    generatedPage?: any
    step?: string
    system_state?: {
      current_stage?: string
      progress?: number
      intent?: string
      done?: boolean
    }
    codeBlocks?: Array<{
      filename: string
      content: string
      language: string
      description?: string
      type: 'page' | 'component' | 'styles' | 'config'
    }>
    interaction?: {
      type: string
      title?: string
      elements?: any[]
    }
  }
}

export interface ChatOption {
  id: string
  label: string
  value: string
  type: "selection" | "input" | "action"
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  userInput: Partial<UserInput>
  currentStep: string
  created_at: Date
  updated_at: Date
}
