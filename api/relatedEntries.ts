import Anthropic from '@anthropic-ai/sdk'
import { RelatedEntry, RelatedSuggestion, VocabItem } from '../src/types/vocabulary.js'

// ── POST /api/relatedEntries ──────────────────────────────────────────────────
// Vercel serverless function.
// Given a vocabulary item and pre-scored candidate items from the user's
// library, calls Claude to:
//   1. Identify which candidates have a genuine pedagogical relationship
//   2. Suggest 2–4 related words NOT yet in the library worth adding
//
// Request body:  { item: SimplifiedItem, candidates: SimplifiedItem[] }
// Response body: { entries: RelatedEntry[], suggestions: RelatedSuggestion[] }
// ─────────────────────────────────────────────────────────────────────────────

type SimplifiedItem = Pick<
  VocabItem,
  'id' | 'term' | 'partOfSpeech' | 'definitionEn' | 'synonyms' | 'type'
>

const SYSTEM_PROMPT = `You are a vocabulary relationship expert for an English-learning app (B2–C1 learners).

You receive a TARGET word/phrase and a CANDIDATE LIST of words already in the learner's library.

Return ONLY a valid JSON object — no markdown fences, no commentary:

{
  "entries": [
    {
      "id":               "<exact id from the candidate — never invent ids>",
      "term":             "<exact term from the candidate>",
      "relationshipType": "meaning | usage_context | nuance | etymology | word_family | similar_form | confusable",
      "direction":        "synonym | contrast | same_family | soundalike | same_context | confusable",
      "strength":         1 | 2 | 3,
      "explanation":      "One concise sentence (max 80 words) for a B2–C1 learner."
    }
  ],
  "suggestions": [
    {
      "term":             "a related English word or phrase NOT in the candidate list",
      "type":             "word | phrase | chunk",
      "relationshipType": "meaning | usage_context | nuance | etymology | word_family | similar_form | confusable",
      "direction":        "synonym | contrast | same_family | soundalike | same_context | confusable",
      "definitionHint":   "One-line plain-English definition (max 60 chars)",
      "explanation":      "Why this word is worth learning alongside the target (max 60 words)"
    }
  ]
}

Rules for "entries":
- Only include candidates you are CONFIDENT are meaningfully related — quality over quantity.
- Use the EXACT id and term from the candidate list. Never invent ids.
- Maximum 6 entries. Return [] if none are genuinely related.
- Strength: 3 = near-essential pair (direct synonym, classic confusable), 2 = useful, 1 = loosely related.

Rules for "suggestions":
- Suggest 2–4 words/phrases that a serious B2–C1 learner should know alongside the target.
- Do NOT suggest words already in the candidate list.
- Focus on high-value vocabulary: near-synonyms, common collocations, confusables, or same-root words.
- Return [] if you cannot think of genuinely valuable suggestions.`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[relatedEntries] ANTHROPIC_API_KEY is not configured')
    return res
      .status(500)
      .json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set.' })
  }

  const { item, candidates } = (req.body ?? {}) as {
    item?: SimplifiedItem
    candidates?: SimplifiedItem[]
  }

  if (!item?.id || !item?.term) {
    return res.status(400).json({ error: '"item" with id and term is required.' })
  }

  const client = new Anthropic({ apiKey })

  const candidateList = candidates ?? []

  const userMessage = `TARGET:
${JSON.stringify(
  {
    id: item.id,
    term: item.term,
    partOfSpeech: item.partOfSpeech ?? '',
    definitionEn: item.definitionEn ?? '',
    synonyms: item.synonyms ?? [],
  },
  null,
  2,
)}

CANDIDATE LIST (${candidateList.length} words already in the library):
${JSON.stringify(
  candidateList.map((c) => ({
    id: c.id,
    term: c.term,
    partOfSpeech: c.partOfSpeech ?? '',
    definitionEn: c.definitionEn ?? '',
    synonyms: c.synonyms ?? [],
  })),
  null,
  2,
)}`

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const parsed = JSON.parse(cleaned) as {
      entries?: unknown[]
      suggestions?: unknown[]
    }

    // Belt-and-suspenders: strip any entry ids not in the candidate list
    const validIds = new Set(candidateList.map((c) => c.id))
    const safeEntries: RelatedEntry[] = Array.isArray(parsed.entries)
      ? (parsed.entries as RelatedEntry[]).filter(
          (e) => e.id && validIds.has(e.id),
        )
      : []

    const safeSuggestions: RelatedSuggestion[] = Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as RelatedSuggestion[]).filter(
          (s) =>
            s.term &&
            s.type &&
            s.explanation &&
            s.definitionHint &&
            // Don't suggest words already in the candidate list
            !candidateList.some(
              (c) => c.term.toLowerCase() === s.term.toLowerCase(),
            ),
        )
      : []

    return res.status(200).json({ entries: safeEntries, suggestions: safeSuggestions })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[relatedEntries] error:', msg)
    return res.status(500).json({
      error: 'Generation failed.',
      detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
    })
  }
}
