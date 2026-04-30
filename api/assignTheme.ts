import Anthropic from '@anthropic-ai/sdk'

// ── POST /api/assignTheme ─────────────────────────────────────────────────────
// Vercel Node.js serverless function.
// Given a theme name + list of vocabulary words, asks Claude which words
// belong to that theme and returns their IDs.
//
// Required env var: ANTHROPIC_API_KEY
//
// Request body:
//   { theme: string, description?: string, words: Word[] }
//   Word = { id: string, term: string, type?: string, definition?: string }
//
// Response body:
//   { assignedIds: string[] }              (200)
//   { error: string, detail?: string }     (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

interface Word {
  id: string
  term: string
  type?: string
  definition?: string
}

function buildPrompt(theme: string, description: string, words: Word[]): string {
  const wordList = words
    .map((w, i) => {
      const type   = w.type       ? ` [${w.type}]`                   : ''
      const def    = w.definition ? ` — ${w.definition.slice(0, 150)}` : ''
      return `${i + 1}. "${w.term}"${type}${def}`
    })
    .join('\n')

  return `You are classifying English vocabulary words into a learning theme for a language-learning app.

Theme: "${theme}"${description ? `\nDescription: ${description}` : ''}

Words to classify:
${wordList}

Task: Identify every word that belongs to this theme. Be inclusive — it is better to include a borderline case than to miss a clear member.

Special guidance for linguistic/grammatical themes:
- "Phrasal Verbs": include multi-word verbs made of verb + particle/preposition (give up, carry out, put off, take over, look into). The word type may be "phrase".
- "Idioms & Expressions": include fixed phrases with non-literal meaning (bite the bullet, on the fence, spill the beans). Type is usually "phrase" or "chunk".
- "Collocations & Chunks": include fixed word combinations (make a decision, take action, strong coffee). Type is usually "chunk" or "phrase".
- "Transitions & Connectors": include discourse markers (furthermore, in contrast, as a result, nevertheless).
- For topic themes (Business, Meetings, etc.): include vocabulary commonly used in that domain.

Return ONLY a valid JSON array of 1-based position numbers, e.g. [1, 3, 7] or [].
No explanation. No commentary. Just the JSON array.`
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'

// Vercel serverless function handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[assignTheme] ANTHROPIC_API_KEY is not configured')
    return res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set.' })
  }

  const { theme, description = '', words } = (req.body ?? {}) as {
    theme?: string
    description?: string
    words?: Word[]
  }

  if (!theme?.trim()) {
    return res.status(400).json({ error: '"theme" is required.' })
  }

  // No candidates → return early without calling the API
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(200).json({ assignedIds: [] })
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: buildPrompt(theme.trim(), description, words),
        },
      ],
    })

    const raw  = message.content[0].type === 'text' ? message.content[0].text : '[]'
    const match = raw.match(/\[[\d,\s]*\]/)

    if (!match) {
      return res.status(200).json({ assignedIds: [] })
    }

    const parsed: unknown = JSON.parse(match[0])

    if (!Array.isArray(parsed)) {
      return res.status(200).json({ assignedIds: [] })
    }

    const assignedIds = (parsed as unknown[])
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
      .filter((n) => n >= 1 && n <= words.length)
      .map((n) => words[n - 1].id)

    return res.status(200).json({ assignedIds })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[assignTheme] error:', msg)
    return res.status(500).json({
      error: 'Assignment failed.',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
