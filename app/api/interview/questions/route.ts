import { NextResponse } from 'next/server'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const MAX_QUESTIONS = 5
const FALLBACK_NAME = 'Candidate'
const FALLBACK_QUESTIONS = [
  'Can you briefly introduce yourself and your core strengths?',
  'Which project on your CV are you most proud of, and why?',
  'Tell me about a technical challenge you solved recently.',
  'How do you approach learning a new technology quickly?',
  'Why are you a strong fit for this role?',
]

interface OpenRouterChoice {
  text?: string
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
}

interface QuestionPayload {
  candidateName?: string
  questions?: string[]
}

interface QuestionResponse {
  candidateName: string
  questions: string[]
  source: 'openrouter' | 'fallback'
  warning?: string
}

const extractJsonText = (rawText: string): string => {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1]
  }

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1)
  }

  return rawText
}

const inferNameFromCv = (cvContent: string): string => {
  const firstNonEmptyLine = cvContent
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstNonEmptyLine) {
    return FALLBACK_NAME
  }

  if (
    firstNonEmptyLine.length > 60 ||
    /@|http|linkedin|github|portfolio/i.test(firstNonEmptyLine)
  ) {
    return FALLBACK_NAME
  }

  const cleaned = firstNonEmptyLine.replace(/[^a-zA-Z0-9 .'-]/g, '').trim()
  return cleaned || FALLBACK_NAME
}

const buildFallbackQuestions = (): string[] => {
  return [...FALLBACK_QUESTIONS].slice(0, MAX_QUESTIONS)
}

const fallbackSuccessResponse = (
  cvContent: string,
  warning: string
): NextResponse<QuestionResponse> => {
  return NextResponse.json({
    candidateName: inferNameFromCv(cvContent),
    questions: buildFallbackQuestions(),
    source: 'fallback',
    warning,
  })
}

export async function POST(request: Request) {
  try {
    const { cvContent } = await request.json()

    if (typeof cvContent !== 'string' || !cvContent.trim()) {
      return NextResponse.json(
        { error: 'cvContent is required.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return fallbackSuccessResponse(
        cvContent,
        'OPENROUTER_API_KEY is missing. Returned fallback interview questions.'
      )
    }

    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL

    const prompt = `You are a professional interviewer.

    From the CV, return STRICT JSON only in this exact shape:
    {
    "candidateName": "string",
    "questions": ["q1", "q2", "q3", "q4", "q5"]
    }

    Rules:
    - candidateName must be the candidate name from the CV.
    - questions must contain exactly 5 concise interview questions.
    - each question must be max 20 words.
    - no markdown, no explanation, JSON only.

    CV Text:
    ${cvContent}`

    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          max_tokens: 700,
          temperature: 0.4,
        }),
        cache: 'no-store',
      }
    )

    if (!openRouterResponse.ok) {
      const details = await openRouterResponse.text()
      return fallbackSuccessResponse(
        cvContent,
        `OpenRouter request failed. Returned fallback questions. Details: ${details}`
      )
    }

    const openRouterJson = (await openRouterResponse.json()) as OpenRouterResponse
    const rawText = openRouterJson.choices?.[0]?.text || ''

    let parsed: QuestionPayload = {}
    try {
      parsed = JSON.parse(extractJsonText(rawText)) as QuestionPayload
    } catch {
      return fallbackSuccessResponse(
        cvContent,
        `OpenRouter returned non-JSON output. Returned fallback questions. Raw output: ${rawText}`
      )
    }

    const candidateName =
      (parsed.candidateName && parsed.candidateName.trim()) ||
      inferNameFromCv(cvContent)

    const questions = (parsed.questions || [])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_QUESTIONS)

    if (!questions.length) {
      return fallbackSuccessResponse(
        cvContent,
        'OpenRouter returned no valid questions. Returned fallback questions.'
      )
    }

    while (questions.length < MAX_QUESTIONS) {
      questions.push(FALLBACK_QUESTIONS[questions.length])
    }

    return NextResponse.json({
      candidateName,
      questions,
      source: 'openrouter',
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unexpected server error.'
    return NextResponse.json<QuestionResponse>(
      {
        candidateName: FALLBACK_NAME,
        questions: buildFallbackQuestions(),
        source: 'fallback',
        warning: `Failed to generate interview questions. Returned fallback questions. Details: ${details}`,
      },
      { status: 200 }
    )
  }
}