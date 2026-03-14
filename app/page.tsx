'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InterviewSessionComponent } from '@/components/interview-session'
import { CVUploadComponent } from '@/components/cv-upload'
import { HistoryComponent } from '@/components/history'
import { AnalyticsDashboard } from '@/components/analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { storage } from '@/lib/storage'
import type { CVData, InterviewSession } from '@/lib/types'
import { Plus, Settings } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [activeTab, setActiveTab] = useState('start')
  const [selectedCV, setSelectedCV] = useState<CVData | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [interviewSession, setInterviewSession] =
    useState<InterviewSession | null>(null)

  // Load saved CV on mount
  useEffect(() => {
    const cv = storage.getCV()
    setSelectedCV(cv || null)
  }, [])

  const handleStartInterview = () => {
    setSessionActive(true)
    setActiveTab('interview')
    // If there's a saved CV, it will be passed to the InterviewSessionComponent via props
  }

  const handleSessionEnd = (session: InterviewSession) => {
    setInterviewSession(session)
    setSessionActive(false)
    setActiveTab('history')
  }

  const handleCVSelected = (cv: CVData) => {
    setSelectedCV(cv)
  }

  if (sessionActive) {
    return (
      <InterviewSessionComponent
        cvContent={selectedCV?.content}
        cvFileName={selectedCV?.fileName}
        onSessionEnd={handleSessionEnd}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Interview AI
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Practice interviews with AI in real-time voice conversation
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-100">
            <TabsTrigger value="start">Start Interview</TabsTrigger>
            <TabsTrigger value="cv">Manage CV</TabsTrigger>
            <TabsTrigger value="history">Interview History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Start Interview Tab */}
          <TabsContent value="start" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Start Card */}
              <Card className="p-8 border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100/50">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Start New Interview
                    </h3>
                    <p className="text-slate-600 mt-2">
                      {selectedCV
                        ? `Using: ${selectedCV.fileName}`
                        : 'Upload a CV to get personalized questions'}
                    </p>
                  </div>
                  <Button
                    onClick={handleStartInterview}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Begin Interview
                  </Button>
                </div>
              </Card>

              {/* Features Overview */}
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">
                        🎤
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        Real-Time Voice
                      </h4>
                      <p className="text-sm text-slate-600">
                        Speak naturally and hear AI responses
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold">
                        📄
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        CV-Based Questions
                      </h4>
                      <p className="text-sm text-slate-600">
                        AI asks about your experience
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold">
                        📊
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        Track Progress
                      </h4>
                      <p className="text-sm text-slate-600">
                        Review all your interview sessions
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Manage CV Tab */}
          <TabsContent value="cv" className="max-w-2xl">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Manage Your CV
              </h2>
              <p className="text-slate-600 mb-6">
                Upload or update your CV to get personalized interview
                questions based on your experience.
              </p>
              <CVUploadComponent onCVSelected={handleCVSelected} />
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <HistoryComponent />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-600 text-sm">
          <p>
            Interview AI helps you practice and improve your interview skills
            with real-time voice conversation.
          </p>
        </div>
      </footer>
    </div>
  )
}
