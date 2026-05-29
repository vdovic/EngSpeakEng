import Anthropic from '@anthropic-ai/sdk'

// ── POST /api/enrich ──────────────────────────────────────────────────────────
// Vercel Node.js serverless function.
// Receives a vocabulary term and calls Claude to generate a complete study card.
//
// Required env var: ANTHROPIC_API_KEY
//
// Request body:  { term: string, type: string, context?: string }
// Response body: { enriched: EnrichmentProfile }         (200)
//                { error: string, detail?: string }      (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

// The system prompt is constant across all words — good for prompt caching
// when the same Vercel instance handles multiple requests.
const SYSTEM_PROMPT = `You are an expert English teacher helping a professional learner at B2–C1 level \
build active vocabulary through spaced repetition. When asked to generate a vocabulary study card, \
return ONLY a valid JSON object — no markdown fences, no commentary, no extra text.

Required JSON structure:
{
  "definitionEn": "Clear 1–2 sentence plain-English explanation suitable for a B2-C1 learner",
  "shortDefinition": "One short phrase — max 10 words — capturing the core meaning (e.g. 'to delay or postpone an action')",
  "partOfSpeech": "verb | noun | adjective | adverb | phrase | idiom | collocation | phrasal verb | etc.",
  "synonyms": ["3–5 close synonyms or near-equivalents"],
  "antonyms": ["1–3 antonyms; empty array [] when not applicable"],
  "exampleSentence": "Natural, modern example sentence showing real usage",
  "workSentence": "Example in a professional, work or meeting context",
  "nuance": "What makes this word distinctive vs its closest synonyms. Include register, tone, and context clues.",
  "register": "formal OR neutral OR conversational",
  "collocations": ["3–6 common collocations or fixed expressions — no article needed, just the phrase"],
  "sentenceFrames": ["2–3 reusable sentence templates using ___ as placeholder for the target word"],
  "relatedPhrases": ["2–4 related phrases, idioms, or expressions that share meaning or context"],
  "etymology": "Brief etymology if memorable and helpful for retention; empty string otherwise",
  "memoryCue": "A vivid mnemonic, visual image, or memory hook to make this word stick",
  "commonMistakes": "The most common learner error or confusion with this word; empty string if none notable",
  "realLifeTask": "One specific, actionable speaking or writing challenge — e.g. 'Use this word in your next stand-up when describing a blocker.'",
  "suggestedTags": ["2–4 lowercase kebab-case searchable tags that describe this word's domain or function — e.g. 'business', 'formal', 'meetings', 'writing', 'transitions', 'phrasal-verb', 'idiom', 'negotiation'"],
  "translations": {
    "uk": "Ukrainian gloss — the most natural 1–4 word equivalent in Ukrainian",
    "pl": "Polish gloss — the most natural 1–4 word equivalent in Polish",
    "ru": "Russian gloss — the most natural 1–4 word equivalent in Russian"
  }
}

Rules:
- Avoid overly long explanations — be concise but precise.
- Keep examples natural and workplace-useful where possible.
- For idioms and phrasal verbs, focus on usage context and register.
- If the term is ambiguous, use the most common B2-C1 professional meaning.
- suggestedTags must be generic, reusable, lowercase, hyphenated where multi-word.
- For translations: give a short natural-language gloss in each target language — not a dictionary definition, just the most natural 1–4 word equivalent. If genuinely uncertain, use an empty string rather than guessing.`

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
  const { term, type = 'word', context } = (req.body ?? {}) as {
    term?: string
    type?: string
    context?: string
  }

  if (!term?.trim()) {
    return res.status(400).json({ error: '"term" is required.' })
  }

  const client = new Anthropic({ apiKey })

  // Build user message — include context if provided
  const contextClause = context?.trim()
    ? ` Context where this was encountered: "${context.trim()}".`
    : ''

  const userMessage =
    `Generate a vocabulary study card for the ${type}: "${term.trim()}".${contextClause}`

  // ── Generation starts here ──────────────────────────────────────────────────
  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
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
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
