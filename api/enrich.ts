import Anthropic from '@anthropic-ai/sdk'

// ── POST /api/enrich ──────────────────────────────────────────────────────────
// Vercel Node.js serverless function.
// Receives a vocabulary term and calls Claude to generate a complete study card.
//
// Required env var: ANTHROPIC_API_KEY
//
// Request body:  { term: string, type: 'word' | 'phrase' | 'chunk' }
// Response body: { enriched: EnrichedFields }          (200)
//                { error: string, detail?: string }    (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

// The system prompt is constant across all words — good for prompt caching
// when the same Vercel instance handles multiple requests.
const SYSTEM_PROMPT = `You are an expert English teacher helping a professional learner at B2–C1 level \
build active vocabulary through spaced repetition. When asked to generate a vocabulary study card, \
return ONLY a valid JSON object — no markdown fences, no commentary, no extra text.

Required JSON structure:
{
  "definitionEn": "Clear 1–2 sentence plain-English explanation",
  "partOfSpeech": "verb | noun | adjective | adverb | phrase | chunk | etc.",
  "synonyms": ["3–5 close synonyms or near-equivalents"],
  "antonyms": ["1–3 antonyms; empty array [] when not applicable"],
  "exampleSentence": "Natural, modern example sentence showing real usage",
  "workSentence": "Example in a professional, work or meeting context",
  "nuance": "What makes this word distinctive vs its closest synonyms. Include register, tone, and context.",
  "register": "formal OR neutral OR conversational",
  "collocations": ["3–5 common collocations or fixed expressions"],
  "sentenceFrames": ["2–3 reusable sentence templates using ___ as placeholder"],
  "etymology": "Brief etymology if memorable and helpful; empty string otherwise",
  "memoryCue": "A vivid mnemonic, image, or memory hook",
  "commonMistakes": "The most common learner error or confusion; empty string if none",
  "realLifeTask": "One specific, actionable challenge — e.g. Say this in your next standup when describing a blocker."
}`

export default async function handler(req: any, res: any) {
  // ── Method guard ────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── API key guard ───────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[enrich] ANTHROPIC_API_KEY is not configured')
    return res
      .status(500)
      .json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set.' })
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const { term, type = 'word' } = (req.body ?? {}) as {
    term?: string
    type?: string
  }

  if (!term?.trim()) {
    return res.status(400).json({ error: '"term" is required.' })
  }

  const client = new Anthropic({ apiKey })

  // ── Generation starts here ──────────────────────────────────────────────────
  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a vocabulary study card for the ${type}: "${term.trim()}"`,
        },
      ],
    })

    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip accidental markdown code fences (model occasionally wraps JSON)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const enriched = JSON.parse(cleaned)

    return res.status(200).json({ enriched })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enrich] generation error:', msg)

    return res.status(500).json({
      error: 'Generation failed.',
      // Only expose detail in non-production to avoid leaking internals
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
