import Anthropic from '@anthropic-ai/sdk'

// ── POST /api/checkSentence ───────────────────────────────────────────────────
// Evaluates a learner's sentence for a given vocabulary item and returns
// a structured coaching result with score + feedback.
//
// Request body:
//   { term, type, definitionEn?, userSentence }
//
// Response body:
//   { result: SentenceCheckResult }   (200)
//   { error, detail? }               (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

// Constant system prompt — good candidate for prompt caching on repeated calls
const SYSTEM_PROMPT = `You are a warm but precise English language coach helping a professional learner at B2–C1 level.

A learner wrote a sentence to practise a vocabulary item. Evaluate it and return ONLY a valid JSON object — no markdown fences, no commentary, no extra text.

Required JSON structure:
{
  "score": 0 | 5 | 10,
  "correct": true | false,
  "feedback": "2–3 encouraging sentences of specific coaching",
  "correctedSentence": "improved version of their sentence" | null,
  "tip": "one brief usage tip — collocation, register, or context note" | null
}

Scoring rubric:
• 10 — correct usage, natural phrasing, appropriate register, clearly demonstrates understanding of the word
• 5  — the word is used correctly but phrasing is awkward, there is a minor grammar error, or register is slightly off
• 0  — the target word is missing from the sentence, used incorrectly, or the sentence breaks its meaning

Rules:
- Always mention one specific thing the learner did well, even at score 0
- correctedSentence: write only when score < 10; make it natural, professional-register English
- tip: give one concrete collocation, register note, or context suggestion relevant to their attempt
- correct: set to true when score >= 5 (they understood the word well enough)
- Keep feedback concise — a learner will read it in 10 seconds`

export default async function handler(req: any, res: any) {
  // ── Method guard ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── API key guard ────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[checkSentence] ANTHROPIC_API_KEY is not configured')
    return res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set.' })
  }

  // ── Input validation ─────────────────────────────────────────────────────
  const { term, type = 'word', definitionEn, userSentence } = (req.body ?? {}) as {
    term?: string
    type?: string
    definitionEn?: string
    userSentence?: string
  }

  if (!term?.trim()) {
    return res.status(400).json({ error: '"term" is required.' })
  }
  if (!userSentence?.trim()) {
    return res.status(400).json({ error: '"userSentence" is required.' })
  }

  const client = new Anthropic({ apiKey })

  // ── Build the user turn ──────────────────────────────────────────────────
  const userTurn = [
    `Vocabulary item: "${term.trim()}" (${type})`,
    definitionEn ? `Definition: ${definitionEn}` : null,
    ``,
    `Learner's sentence: "${userSentence.trim()}"`,
  ]
    .filter((l) => l !== null)
    .join('\n')

  // ── Call Claude ──────────────────────────────────────────────────────────
  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 450,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userTurn }],
    })

    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip accidental markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const result = JSON.parse(cleaned)

    // Normalise score to allowed values
    if (![0, 5, 10].includes(result.score)) {
      result.score = result.score >= 8 ? 10 : result.score >= 3 ? 5 : 0
    }
    result.correct = result.score >= 5

    return res.status(200).json({ result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkSentence] error:', msg)
    return res.status(500).json({
      error: 'Check failed.',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
