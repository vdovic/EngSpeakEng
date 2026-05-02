import Anthropic from '@anthropic-ai/sdk'

// ── POST /api/etymology ───────────────────────────────────────────────────────
// Lightweight Vercel function that generates ONLY etymology + memoryCue for a
// vocabulary item. Used by the background enrichment runner to fill gaps
// without overwriting other already-good fields.
//
// Request body:  { term: string, type?: string }
// Response body: { etymology: string, memoryCue: string }   (200)
//                { error: string }                           (4xx / 5xx)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert English etymologist and language teacher. \
Return ONLY a valid JSON object — no markdown, no commentary.

JSON structure:
{
  "etymology": "The word's origin: source language(s), root words, and how the meaning evolved over time. For modern slang or informal phrases, trace whatever is known. Always provide something useful — never return an empty string.",
  "memoryCue": "A vivid, concrete mnemonic — a mental image, story, or hook that makes this word's meaning instantly memorable and hard to forget."
}`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const { term, type = 'word' } = (req.body ?? {}) as { term?: string; type?: string }
  if (!term?.trim()) {
    return res.status(400).json({ error: '"term" is required' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Provide etymology and a memory cue for the English ${type}: "${term.trim()}"`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const result = JSON.parse(cleaned)

    return res.status(200).json({
      etymology: result.etymology ?? '',
      memoryCue: result.memoryCue ?? '',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[etymology] error:', msg)
    return res.status(500).json({
      error: 'Generation failed',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
