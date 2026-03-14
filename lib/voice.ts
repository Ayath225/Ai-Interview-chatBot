let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let activeSpeechController: AbortController | null = null

const clearActiveAudio = () => {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = null
  }
}

const speakWithElevenLabs = async (
  text: string,
  signal: AbortSignal
): Promise<void> => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal,
  })

  if (!response.ok) {
    throw new Error('ElevenLabs TTS request failed')
  }

  const audioBlob = await response.blob()
  if (signal.aborted) return

  const audioUrl = URL.createObjectURL(audioBlob)
  const audio = new Audio(audioUrl)

  activeAudioUrl = audioUrl
  activeAudio = audio

  await new Promise<void>((resolve, reject) => {
    const onEnded = () => {
      cleanup()
      resolve()
    }

    const onError = () => {
      cleanup()
      reject(new Error('ElevenLabs audio playback failed'))
    }

    const onAbort = () => {
      cleanup()
      resolve()
    }

    const cleanup = () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
      clearActiveAudio()
    }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })

    if (signal.aborted) {
      onAbort()
      return
    }

    audio.play().catch((error) => {
      cleanup()
      reject(error)
    })
  })
}

const speakWithBrowserSynthesis = (
  text: string,
  signal: AbortSignal
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    const onAbort = () => {
      cleanup()
      resolve()
    }

    const cleanup = () => {
      utterance.onend = null
      utterance.onerror = null
      signal.removeEventListener('abort', onAbort)
      window.speechSynthesis.cancel()
    }

    utterance.onend = () => {
      cleanup()
      resolve()
    }

    utterance.onerror = () => {
      cleanup()
      reject(new Error('Speech synthesis error'))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    if (signal.aborted) {
      onAbort()
      return
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })
}

export const voiceManager = {
  speak: async (text: string): Promise<void> => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    voiceManager.stopSpeaking()

    const controller = new AbortController()
    activeSpeechController = controller

    try {
      try {
        await speakWithElevenLabs(trimmedText, controller.signal)
      } catch {
        await speakWithBrowserSynthesis(trimmedText, controller.signal)
      }
    } finally {
      if (activeSpeechController === controller) {
        activeSpeechController = null
      }
      clearActiveAudio()
    }
  },

  stopSpeaking: (): void => {
    activeSpeechController?.abort()
    activeSpeechController = null
    clearActiveAudio()

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  },

  isSpeaking: (): boolean => {
    return (
      (!!activeAudio && !activeAudio.paused) ||
      ('speechSynthesis' in window && window.speechSynthesis.speaking)
    )
  },

  startListening: (
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): (() => void) => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      onError?.('Speech Recognition not supported')
      return () => {}
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.language = 'en-US'

    let finalTranscript = ''

    recognition.onstart = () => {
      finalTranscript = ''
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      onResult(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError?.(event.error)
    }

    recognition.onend = () => {
      if (finalTranscript) {
        onResult(finalTranscript)
      }
    }

    recognition.start()

    return () => {
      recognition.stop()
    }
  },
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  language: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
