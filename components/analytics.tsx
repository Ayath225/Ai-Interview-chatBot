'use client'

import { useEffect, useState } from 'react'
import { storage } from '@/lib/storage'
import { Card } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, MessageSquare, Clock, Award } from 'lucide-react'
import type { InterviewSession } from '@/lib/types'

export function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [stats, setStats] = useState({
    totalInterviews: 0,
    totalDuration: 0,
    averageMessages: 0,
    averageDuration: 0,
  })

  useEffect(() => {
    const history = storage.getInterviewHistory()
    setSessions(history)

    if (history.length > 0) {
      const totalDuration = history.reduce(
        (sum, s) => sum + (s.duration || 0),
        0
      )
      const totalMessages = history.reduce(
        (sum, s) => sum + s.messages.length,
        0
      )

      setStats({
        totalInterviews: history.length,
        totalDuration,
        averageMessages: Math.round(totalMessages / history.length),
        averageDuration: Math.round(totalDuration / history.length),
      })
    }
  }, [])

  // Prepare data for charts
  const chartData = sessions
    .slice()
    .reverse()
    .slice(0, 10)
    .map((session, idx) => ({
      name: `Interview ${sessions.length - idx}`,
      duration: session.duration || 0,
      messages: session.messages.length,
      timestamp: session.startTime,
    }))

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              No Analytics Yet
            </h3>
            <p className="text-slate-600 mt-2">
              Complete interviews to see your analytics and progress.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-600 font-semibold">
                TOTAL INTERVIEWS
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.totalInterviews}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-600 font-semibold">
                AVG. DURATION
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatDuration(stats.averageDuration)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-600 font-semibold">
                AVG. MESSAGES
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {stats.averageMessages}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-600 font-semibold">
                TOTAL TIME
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatDuration(stats.totalDuration)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Duration Trend */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Interview Duration Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatDuration(value as number)}
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Messages Comparison */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Messages Per Interview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="messages" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
