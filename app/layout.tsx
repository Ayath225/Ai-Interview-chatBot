import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Interview AI - Practice Interviews with Real-Time Voice',
  description: 'Practice job interviews with AI-powered real-time voice conversation. Upload your CV and get personalized interview questions. Track your progress with detailed analytics.',
  generator: 'v0.app',
  keywords: ['interview practice', 'AI interview', 'voice conversation', 'job preparation'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
