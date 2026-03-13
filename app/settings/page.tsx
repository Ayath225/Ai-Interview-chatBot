'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { storage } from '@/lib/storage'
import Link from 'next/link'
import { ArrowLeft, Trash2, Download } from 'lucide-react'

export default function SettingsPage() {
  const [isClearing, setIsClearing] = useState(false)

  const handleClearAll = () => {
    if (
      confirm(
        'Are you sure you want to delete all interview history and settings? This cannot be undone.'
      )
    ) {
      setIsClearing(true)
      localStorage.clear()
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    }
  }

  const handleExportData = () => {
    const profile = storage.getProfile()
    if (!profile) {
      alert('No data to export')
      return
    }

    const dataStr = JSON.stringify(profile, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `interview-ai-backup-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Data Management */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Data Management
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Export Your Data
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                Download a backup of all your interview history and settings as a JSON file.
              </p>
              <Button
                onClick={handleExportData}
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <Download className="w-4 h-4" />
                Export Data
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-xl font-bold text-red-900 mb-4">Danger Zone</h2>
          <div>
            <h3 className="font-semibold text-red-900 mb-2">
              Clear All Data
            </h3>
            <p className="text-red-700 text-sm mb-4">
              This will permanently delete all your interview history, CV uploads, and settings. This action cannot be undone.
            </p>
            <Button
              onClick={handleClearAll}
              disabled={isClearing}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">About</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Interview AI is a practice interview platform that uses advanced AI to conduct realistic job interviews through real-time voice conversation.
            </p>
            <p>
              Features include:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Real-time voice conversation with AI</li>
              <li>CV-based personalized questions</li>
              <li>Interview history and analytics</li>
              <li>Progress tracking</li>
            </ul>
          </div>
        </Card>
      </main>
    </div>
  )
}
