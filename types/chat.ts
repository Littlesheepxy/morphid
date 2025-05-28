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
