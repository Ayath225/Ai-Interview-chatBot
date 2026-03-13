export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface InterviewSession {
  id: string
  startTime: number
  endTime?: number
  duration?: number // in seconds
  cvContent?: string
  cvFileName?: string
  messages: Message[]
  feedback?: string
  score?: number
}

export interface CVData {
  fileName: string
  content: string
  uploadedAt: number
}

export interface UserProfile {
  interviewHistory: InterviewSession[]
  currentCV?: CVData
  totalInterviews: number
  averageScore?: number
}
