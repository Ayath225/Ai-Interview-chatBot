import { NextResponse } from 'next/server'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

interface OpenRouterChoice {
    text?: string
}

interface OpenRouterResponse {
    choices?: OpenRouterChoice[]
}

interface EvaluatePayload {
    Question: string | null
    IsWantToShowAgain: boolean
    assessment: 'good' | 'medium' | 'low' | 'repeat' | 'wrong'
    feedback?: string
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

const sanitizeQuestion = (question: string): string => {
    return question.replace(/^Question\s*\d+\s*:\s*/i, '').trim()
}

const buildRepeatQuestion = (question: string): string => {
    const clean = sanitizeQuestion(question)
    return `Can you explain this clearly: ${clean}`
}

const buildRetryQuestion = (question: string): string => {
    const clean = sanitizeQuestion(question)
    return `Please answer with a concrete example: ${clean}`
}

const fallbackEvaluate = (question: string, answer: string, warning: string): EvaluatePayload => {
    const trimmedAnswer = answer.trim()
    const loweredAnswer = trimmedAnswer.toLowerCase()

    const wantsRepeat =
        /repeat|again|can you repeat|pardon|didn.?t understand|say that again|what do you mean/.test(
            loweredAnswer
        )

    if (wantsRepeat) {
        return {
            Question: buildRepeatQuestion(question),
            IsWantToShowAgain: true,
            assessment: 'repeat',
            feedback: 'Repeating the same question in simpler wording.',
            source: 'fallback',
            warning,
        }
    }

    const wordCount = trimmedAnswer.split(/\s+/).filter(Boolean).length
    if (wordCount < 4) {
        return {
            Question: buildRetryQuestion(question),
            IsWantToShowAgain: true,
            assessment: 'wrong',
            feedback: 'Answer is too short. Asking a clearer version of the same question.',
            source: 'fallback',
            warning,
        }
    }

    return {
        Question: null,
        IsWantToShowAgain: false,
        assessment: wordCount > 20 ? 'good' : 'medium',
        feedback: 'Answer accepted. Proceed to next question.',
        source: 'fallback',
        warning,
    }
}

export async function POST(request: Request) {
    try {
        const { question, answer, cvContent } = await request.json()

        if (typeof question !== 'string' || !question.trim()) {
            return NextResponse.json(
                { error: 'question is required.' },
                { status: 400 }
            )
        }

        if (typeof answer !== 'string' || !answer.trim()) {
            return NextResponse.json(
                { error: 'answer is required.' },
                { status: 400 }
            )
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                fallbackEvaluate(
                    question,
                    answer,
                    'OPENROUTER_API_KEY is missing. Used fallback answer evaluation.'
                )
            )
        }

        const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
        const prompt = `You are an interview answer evaluator.

        Given QUESTION and ANSWER, return STRICT JSON in this exact format:
        {
        "Question": null | "string",
        "IsWantToShowAgain": true | false,
        "assessment": "good" | "medium" | "low" | "repeat" | "wrong",
        "feedback": "short text"
        }

        Rules:
        - If answer is good, medium, or low but still acceptable: return "Question": null and "IsWantToShowAgain": false.
        - If the user asks to repeat the question (example: can you repeat, say again): return "IsWantToShowAgain": true and "Question" as the same question rephrased clearly.
        - If answer is wrong/irrelevant: return "IsWantToShowAgain": true and "Question" as a clearer replacement of the same intent.
        - If "IsWantToShowAgain" is false, "Question" must be null.
        - Keep returned Question concise (max 20 words).
        - Output JSON only.

        CV Context:
        ${typeof cvContent === 'string' ? cvContent : 'N/A'}

        QUESTION:
        ${question}

        ANSWER:
        ${answer}`

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
                    max_tokens: 400,
                    temperature: 0.2,
                }),
                cache: 'no-store',
            }
        )

        if (!openRouterResponse.ok) {
            const details = await openRouterResponse.text()
            return NextResponse.json(
                fallbackEvaluate(
                    question,
                    answer,
                    `OpenRouter evaluation failed. Used fallback evaluation. Details: ${details}`
                )
            )
        }

        const openRouterJson = (await openRouterResponse.json()) as OpenRouterResponse
        const rawText = openRouterJson.choices?.[0]?.text || ''

        let parsed: Partial<EvaluatePayload> = {}
        try {
            parsed = JSON.parse(extractJsonText(rawText)) as Partial<EvaluatePayload>
        } catch {
            return NextResponse.json(
                fallbackEvaluate(
                    question,
                    answer,
                    `OpenRouter evaluation returned non-JSON output. Used fallback evaluation. Raw output: ${rawText}`
                )
            )
        }

        const isWantToShowAgain = Boolean(parsed.IsWantToShowAgain)
        const parsedQuestion =
            typeof parsed.Question === 'string' ? parsed.Question.trim() : null

        const response: EvaluatePayload = {
            Question: isWantToShowAgain ? (parsedQuestion || buildRetryQuestion(question)) : null,
            IsWantToShowAgain: isWantToShowAgain,
            assessment:
                parsed.assessment === 'good' ||
                    parsed.assessment === 'medium' ||
                    parsed.assessment === 'low' ||
                    parsed.assessment === 'repeat' ||
                    parsed.assessment === 'wrong'
                    ? parsed.assessment
                    : 'medium',
            feedback: typeof parsed.feedback === 'string' ? parsed.feedback : undefined,
            source: 'openrouter',
        }

        return NextResponse.json(response)
    } catch (error) {
        const details = error instanceof Error ? error.message : 'Unexpected server error.'
        return NextResponse.json(
            fallbackEvaluate(
                'Can you explain your answer again?',
                'fallback',
                `Unexpected evaluation error. Used fallback evaluation. Details: ${details}`
            )
        )
    }
}