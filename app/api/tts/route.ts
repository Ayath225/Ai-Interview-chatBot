import { NextResponse } from 'next/server'

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required for speech synthesis.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
    const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
        cache: 'no-store',
      }
    )

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      return NextResponse.json(
        { error: 'ElevenLabs TTS request failed.', details: errorText },
        { status: elevenLabsResponse.status }
      )
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error.'

    return NextResponse.json(
      { error: 'Failed to generate speech.', details: message },
      { status: 500 }
    )
  }
}
