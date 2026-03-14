'use client'

import { useEffect, useState } from 'react'
import { storage } from '@/lib/storage'
import type { InterviewSession } from '@/lib/types'
import { Card } from './ui/card'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { ScrollArea } from './ui/scroll-area'
import { ChevronDown, MessageSquare, Calendar, Clock } from 'lucide-react'

export function HistoryComponent() {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [selectedSession, setSelectedSession] =
    useState<InterviewSession | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const history = storage.getInterviewHistory()
    setSessions(history)
  }, [])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0m'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const handleViewSession = (session: InterviewSession) => {
    setSelectedSession(session)
    setIsOpen(true)
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              No Interviews Yet
            </h3>
            <p className="text-slate-600 mt-2">
              Start your first interview to see your history here.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Interview History
        </h2>
        <div className="text-right">
          <p className="text-sm text-slate-600">Total Interviews</p>
          <p className="text-2xl font-bold text-blue-600">
            {sessions.length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session, index) => (
          <Card
            key={session.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-blue-300"
            onClick={() => handleViewSession(session)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-600">
                    #{sessions.length - index}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">
                      Interview Session
                    </h3>
                    {session.cvFileName && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {session.cvFileName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(session.startTime)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(session.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {session.messages.length} messages
                    </div>
                  </div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          </Card>
        ))}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Interview Session Details</DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <ScrollArea className="h-full pr-4 space-y-4">
              <div className="space-y-4 pb-4">
                {/* Session Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">
                      DATE & TIME
                    </p>
                    <p className="text-sm mt-1 text-slate-900">
                      {formatDate(selectedSession.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">
                      DURATION
                    </p>
                    <p className="text-sm mt-1 text-slate-900">
                      {formatDuration(selectedSession.duration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">
                      MESSAGES
                    </p>
                    <p className="text-sm mt-1 text-slate-900">
                      {selectedSession.messages.length}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Conversation
                  </h3>
                  <div className="space-y-3">
                    {selectedSession.messages.map((msg, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 uppercase">
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <Card className="p-3 bg-slate-50 border-slate-200">
                          <p className="text-sm text-slate-900">
                            {msg.content}
                          </p>
                          {msg.role === 'user' && msg.feedback && (
                            <p className="text-xs text-emerald-700 mt-2">
                              Feedback: {msg.feedback}
                            </p>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                {selectedSession.feedback && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">
                      Feedback
                    </h3>
                    <Card className="p-4 bg-emerald-50 border-emerald-200">
                      <p className="text-sm text-emerald-900 whitespace-pre-wrap">
                        {selectedSession.feedback}
                      </p>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
