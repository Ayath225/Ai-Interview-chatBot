import type { UserProfile, InterviewSession, CVData } from './types'

const STORAGE_KEY = 'interview_ai_profile'

export const storage = {
  getProfile: (): UserProfile | null => {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  saveProfile: (profile: UserProfile): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  },

  saveInterview: (session: InterviewSession): void => {
    const profile = storage.getProfile() || {
      interviewHistory: [],
      totalInterviews: 0,
    }
    profile.interviewHistory = [session, ...(profile.interviewHistory || [])]
    profile.totalInterviews = profile.interviewHistory.length
    storage.saveProfile(profile)
  },

  getInterviewHistory: (): InterviewSession[] => {
    const profile = storage.getProfile()
    return profile?.interviewHistory || []
  },

  saveCV: (cv: CVData): void => {
    const profile = storage.getProfile() || {
      interviewHistory: [],
      totalInterviews: 0,
    }
    profile.currentCV = cv
    storage.saveProfile(profile)
  },

  getCV: (): CVData | undefined => {
    const profile = storage.getProfile()
    return profile?.currentCV
  },

  updateAverageScore: (): void => {
    const profile = storage.getProfile()
    if (!profile || profile.interviewHistory.length === 0) return

    const validScores = profile.interviewHistory
      .filter((i) => i.score !== undefined)
      .map((i) => i.score as number)

    if (validScores.length > 0) {
      profile.averageScore =
        validScores.reduce((a, b) => a + b, 0) / validScores.length
      storage.saveProfile(profile)
    }
  },
}
