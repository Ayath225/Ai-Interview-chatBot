
'use client'
import OpenAI from "openai";
import React from "react"
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import {Mic,MicOff,Send,Volume2,VolumeX,Clock,Save,} from 'lucide-react'
import { voiceManager } from '@/lib/voice'
import { storage } from '@/lib/storage'
import type { Message, InterviewSession } from '@/lib/types'
import { cn } from '@/lib/utils'

interface InterviewSessionProps {
  cvContent?: string
  cvFileName?: string
  onSessionEnd?: (session: InterviewSession) => void
}

export function InterviewSessionComponent({
  cvContent,
  cvFileName,
  onSessionEnd,
}: InterviewSessionProps) {


  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [stopListening, setStopListening] = useState<(() => void) | null>(null)
  const [duration, setDuration] = useState(0)
  const [sessionActive, setSessionActive] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  // send cv content to the LLM
  useEffect(() => {
    async function sendCVToOpenAI() {
      const cv = storage.getCV();
      if (!cv || !cv.content) return;
      const client = new OpenAI();
      try {
        const response = await client.responses.create({
          model: "gpt-5.4",
          input: cv.content,
        });
        console.log(response.output_text);
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }
    sendCVToOpenAI();
  }, []);

  // Track session duration
  useEffect(() => {
    if (!sessionActive) return
    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionActive])

  // Auto-speak assistant responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      !isSpeaking &&
      sessionActive
    ) {
      handleSpeak(lastMessage.content)
    }
  }, [messages, isSpeaking, sessionActive])

  const handleSpeak = async (text: string) => {
    setIsSpeaking(true)
    try {
      await voiceManager.speak(text)
    } catch (error) {
      console.error('Speech error:', error)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleStartListening = () => {
    setIsListening(true)
    const stop = voiceManager.startListening(
      (transcript) => {
        setInput(transcript)
      },
      (error) => {
        console.error('Listening error:', error)
        setIsListening(false)
      }
    )
    setStopListening(() => stop)
  }

  const handleStopListening = () => {
    stopListening?.()
    setIsListening(false)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    // Add your message sending logic here
    // Example: setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }])
    setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() }])
    setInput('')
  }

  const handleEndSession = () => {
    voiceManager.stopSpeaking()
    setSessionActive(false)

    const session: InterviewSession = {
      id: Date.now().toString(),
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      duration,
      cvFileName,
      cvContent,
      messages: messages as Message[],
    }

    storage.saveInterview(session)
    onSessionEnd?.(session)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Interview Practice
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {cvFileName ? `Using CV: ${cvFileName}` : 'No CV provided'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-5 h-5" />
              <span className="font-mono font-semibold">
                {formatDuration(duration)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
            >
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="text-slate-500 space-y-2">
                <p className="text-lg font-semibold">Ready to start?</p>
                <p className="text-sm">
                  Click the microphone to start speaking, or type your response
                  below.
                </p>
              </div>
            </Card>
          ) : (
            messages.map((message, idx) => (
              <div
                key={idx}
                className={cn('flex gap-3 animate-in fade-in', {
                  'flex-row-reverse': message.role === 'user',
                })}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                    {
                      'bg-blue-500': message.role === 'user',
                      'bg-emerald-500': message.role === 'assistant',
                    }
                  )}
                >
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <Card
                  className={cn(
                    'px-4 py-3 max-w-md',
                    {
                      'bg-blue-50 border-blue-200':
                        message.role === 'user',
                      'bg-emerald-50 border-emerald-200':
                        message.role === 'assistant',
                    }
                  )}
                >
                  <p className="text-sm text-slate-700">
                    {message.content}
                  </p>
                </Card>
              </div>
            ))
          )}

          {isSpeaking && (
            <div className="flex gap-2 items-center text-sm text-slate-600">
              <div className="animate-pulse">
                <Volume2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span>AI is speaking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-6 shadow-lg">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Audio Controls */}
          <div className="flex gap-2">
            {isListening ? (
              <Button
                onClick={handleStopListening}
                variant="destructive"
                size="sm"
                className="flex-1 gap-2"
              >
                <MicOff className="w-4 h-4" />
                Stop Listening
              </Button>
            ) : (
              <Button
                onClick={handleStartListening}
                disabled={isSpeaking}
                variant="default"
                size="sm"
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Mic className="w-4 h-4" />
                Start Listening
              </Button>
            )}

            <Button
              onClick={() =>
                isSpeaking ? voiceManager.stopSpeaking() : null
              }
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!isSpeaking}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Stop Speaking
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Mute
                </>
              )}
            </Button>
          </div>

          {/* Text Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Or type your response..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSpeaking}
            />
            <Button
              type="submit"
              disabled={!input || !input.trim() || isSpeaking}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            Speak naturally or type. AI will respond and speak back to you.
          </p>
        </div>
      </div>
    </div>
  )
}
