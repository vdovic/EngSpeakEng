/**
 * scripts/generateRelatedEntries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Batch script that generates "related words from your library" entries for
 * every item in the migration dataset that doesn't already have them.
 *
 * Usage:
 *   npm run related:smoke    # process first 10 items only (test run)
 *   npm run related:generate # process the full dataset
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  (required)
 *   ANTHROPIC_MODEL    (optional, defaults to claude-haiku-4-5)
 *
 * The script is RESUMABLE: it skips items that already have
 * relatedEntriesStatus === 'complete' in the output file.
 *
 * Output:
 *   public/data/migration-vocab.json   (updated in-place with relatedEntries)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

// ── Types (inline to avoid browser imports) ───────────────────────────────────

type RelationshipType =
  | 'meaning' | 'usage_context' | 'nuance' | 'etymology'
  | 'word_family' | 'similar_form' | 'confusable'

type RelationshipDirection =
  | 'synonym' | 'contrast' | 'same_family' | 'soundalike'
  | 'same_context' | 'confusable'

interface RelatedEntry {
  id: string
  term: string
  relationshipType: RelationshipType
  direction?: RelationshipDirection
  strength: 1 | 2 | 3
  explanation: string
}

interface VocabItem {
  id: string
  term: string
  type: string
  partOfSpeech?: string
  definitionEn?: string
  synonyms: string[]
  antonyms: string[]
  tags: string[]
  archived: boolean
  relatedEntries?: RelatedEntry[]
  relatedEntriesStatus?: 'pending' | 'complete' | 'failed'
  [key: string]: unknown
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTPUT_FILE = resolve(ROOT, 'public/data/migration-vocab.json')

// ── Config ────────────────────────────────────────────────────────────────────

const CONCURRENCY   = 1
const MIN_DELAY_MS  = 4_500   // pause between calls — safe for Tier-1 keys

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity

// ── Levenshtein (copy — avoids importing browser module) ──────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function generateCandidates(item: VocabItem, allItems: VocabItem[], limit = 15): VocabItem[] {
  const lc = item.term.toLowerCase()
  const synSet = new Set(item.synonyms.map(s => s.toLowerCase()))
  const tagSet = new Set(item.tags)
  const stem = lc.slice(0, 5)

  return allItems
    .filter(o => o.id !== item.id && !o.archived)
    .map(o => {
      let score = 0
      const olc = o.term.toLowerCase()
      const oSynSet = new Set(o.synonyms.map(s => s.toLowerCase()))

      for (const s of o.synonyms) { if (synSet.has(s.toLowerCase())) { score += 4; break } }
      if (synSet.has(olc)) score += 4
      if (oSynSet.has(lc)) score += 4
      if (stem.length >= 5 && olc.startsWith(stem)) score += 3
      if (lc.length <= 8 && olc.length <= 8 && Math.abs(lc.length - olc.length) <= 2) {
        const d = levenshtein(lc, olc)
        if (d <= 2 && d > 0) score += 3
      }
      for (const t of o.tags) { if (tagSet.has(t)) { score += 2; break } }
      if (item.partOfSpeech && o.partOfSpeech === item.partOfSpeech) score += 1

      return { item: o, score }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item)
}

function validateEntries(entries: RelatedEntry[], allItems: VocabItem[]): RelatedEntry[] {
  const validIds = new Set(allItems.map(i => i.id))
  return entries
    .filter(e => validIds.has(e.id) && e.term && e.explanation)
    .map(e => ({
      ...e,
      strength: ([1, 2, 3].includes(e.strength) ? e.strength : 1) as 1 | 2 | 3,
      explanation: e.explanation.trim().slice(0, 300),
    }))
}

// ── Anthropic prompt ──────────────────────────────────────────────────────────

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

Rules:
- Only include candidates you are CONFIDENT are related. Fewer high-quality entries beats many weak ones.
- You MUST use the exact id and term from the candidate list. Never invent ids.
- Return [] if no candidates are meaningfully related.
- Maximum 6 entries per call.`

async function callClaude(
  client: Anthropic,
  item: VocabItem,
  candidates: VocabItem[],
): Promise<RelatedEntry[]> {
  const simplify = (v: VocabItem) => ({
    id: v.id, term: v.term,
    partOfSpeech: v.partOfSpeech ?? '',
    definitionEn: v.definitionEn ?? '',
    synonyms: v.synonyms ?? [],
  })

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `TARGET:\n${JSON.stringify(simplify(item), null, 2)}\n\nCANDIDATE LIST (${candidates.length} items):\n${JSON.stringify(candidates.map(simplify), null, 2)}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[related] ❌  ANTHROPIC_API_KEY is not set')
    process.exit(1)
  }

  if (!existsSync(OUTPUT_FILE)) {
    console.error('[related] ❌  Output file not found:', OUTPUT_FILE)
    process.exit(1)
  }

  const allItems: VocabItem[] = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
  const client = new Anthropic({ apiKey })

  // Items that still need processing
  const todo = allItems
    .filter(i => !i.archived && i.relatedEntriesStatus !== 'complete')
    .slice(0, LIMIT)

  console.info(`[related] ${todo.length} items to process (${allItems.length} total, limit=${LIMIT})`)

  let done = 0
  let skipped = 0

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY)

    await Promise.all(
      batch.map(async (item) => {
        const candidates = generateCandidates(item, allItems, 15)
        if (candidates.length === 0) {
          item.relatedEntries = []
          item.relatedEntriesStatus = 'complete'
          skipped++
          return
        }

        try {
          const raw = await callClaude(client, item, candidates)
          const validated = validateEntries(raw, allItems)
          item.relatedEntries = validated
          item.relatedEntriesStatus = 'complete'
          done++
          console.info(
            `  [${done + skipped}/${todo.length}] "${item.term}" → ${validated.length} related`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`  ❌  "${item.term}": ${msg}`)
          item.relatedEntriesStatus = 'failed'
        }
      }),
    )

    // Save after each batch so the run is resumable
    writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2))

    // Rate-limit pause (skip after last batch)
    if (i + CONCURRENCY < todo.length) {
      await new Promise((r) => setTimeout(r, MIN_DELAY_MS))
    }
  }

  console.info(
    `\n[related] Done. ${done} generated, ${skipped} skipped (no candidates), ${todo.length - done - skipped} failed.`,
  )
  writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2))
}

main().catch((err) => {
  console.error('[related] fatal:', err)
  process.exit(1)
})
