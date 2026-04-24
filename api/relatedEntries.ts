import Anthropic from '@anthropic-ai/sdk'
import { RelatedEntry, VocabItem } from '../src/types/vocabulary.js'

// ── POST /api/relatedEntries ──────────────────────────────────────────────────
// Vercel Node.js serverless function.
// Given a vocabulary item and a shortlist of candidate items from the user's
// own library (pre-scored by generateCandidates locally), calls Claude to
// identify which candidates are genuinely related and how.
//
// Required env var: ANTHROPIC_API_KEY
//
// Request body:
//   { item: SimplifiedItem, candidates: SimplifiedItem[] }
//
// Response body:
//   { entries: RelatedEntry[] }   (200)
//   { error: string }             (4xx / 5xx)
//
// Claude MUST only reference candidate ids — the validator in the client also
// strips any invalid ids, providing a belt-and-suspenders guarantee.
// ─────────────────────────────────────────────────────────────────────────────

type SimplifiedItem = Pick<VocabItem, 'id' | 'term' | 'partOfSpeech' | 'definitionEn' | 'synonyms' | 'type'>

const SYSTEM_PROMPT = `You are a vocabulary relationship analyser for an English-learning app.

You will receive a TARGET word/phrase and a CANDIDATE LIST of other words/phrases already in the learner's vocabulary library.

Your task: identify which candidates have a genuinely useful pedagogical relationship with the target. Return ONLY the relevant ones — skip candidates with no meaningful connection.

Return a JSON array (no markdown fences, no commentary). Each element must be:
{
  "id": "<exact id from the candidate>",
  "term": "<exact term from the candidate>",
  "relationshipType": one of: "meaning" | "usage_context" | "nuance" | "etymology" | "word_family" | "similar_form" | "confusable",
  "direction": one of: "synonym" | "contrast" | "same_family" | "soundalike" | "same_context" | "confusable",
  "strength": 1 | 2 | 3,
  "explanation": "One concise sentence (max 80 words) explaining the relationship for a B2–C1 learner."
}

Strength guide:
  3 = strong / near-essential to know together (e.g., direct synonym, classic confusable)
  2 = useful to know together (e.g., same family, overlapping usage)
  1 = loosely related (interesting but not critical)

Rules:
- Only include candidates you are CONFIDENT are related. Fewer high-quality entries beats many weak ones.
- You MUST use the exact id and term from the candidate list. Never invent ids.
- Return [] if no candidates are meaningfully related.
- Maximum 6 entries per call.`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[relatedEntries] ANTHROPIC_API_KEY is not configured')
    return res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set.' })
  }

  const { item, candidates } = (req.body ?? {}) as {
    item?: SimplifiedItem
    candidates?: SimplifiedItem[]
  }

  if (!item?.id || !item?.term) {
    return res.status(400).json({ error: '"item" with id and term is required.' })
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(200).json({ entries: [] })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `TARGET:
${JSON.stringify({ id: item.id, term: item.term, partOfSpeech: item.partOfSpeech ?? '', definitionEn: item.definitionEn ?? '', synonyms: item.synonyms ?? [] }, null, 2)}

CANDIDATE LIST (${candidates.length} items):
${JSON.stringify(candidates.map(c => ({ id: c.id, term: c.term, partOfSpeech: c.partOfSpeech ?? '', definitionEn: c.definitionEn ?? '', synonyms: c.synonyms ?? [] })), null, 2)}`

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const entries: RelatedEntry[] = JSON.parse(cleaned)

    // Belt-and-suspenders: strip any ids not in the candidate list
    const validIds = new Set(candidates.map((c) => c.id))
    const safe = Array.isArray(entries)
      ? entries.filter((e) => e.id && validIds.has(e.id))
      : []

    return res.status(200).json({ entries: safe })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[relatedEntries] generation error:', msg)
    return res.status(500).json({
      error: 'Generation failed.',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
