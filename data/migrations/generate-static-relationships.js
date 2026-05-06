/**
 * generate-static-relationships.js
 *
 * Derives static relationship data for vocabulary items from EXISTING Library
 * fields — no AI calls, no network requests, no runtime generation.
 *
 * ── Sources ───────────────────────────────────────────────────────────────────
 *
 *  SOURCE 1 — Synonym cross-references
 *    If item A lists term B as a synonym AND B exists in the Library → synonym relationship.
 *    Applied bidirectionally: if A→B, then B←A (if B didn't already list A).
 *
 *  SOURCE 2 — Antonym / contrast cross-references
 *    Same bidirectional logic for antonyms → direction: 'contrast'.
 *
 *  SOURCE 3 — Phrasal verb base-verb families
 *    Group all Library phrasal verbs by the first word (base verb).
 *    Within each group, each PV is related to every other PV → direction: 'same_family'.
 *    Base verb families with ≥ 3 members are included.
 *
 *  SOURCE 4 — Confusable pairs from nuance text
 *    If a formal/neutral word's nuance explicitly mentions another Library term
 *    using "unlike", "vs.", "not to be confused with", or "compared to" →
 *    direction: 'confusable'.
 *
 * ── Scoring (for entry selection) ────────────────────────────────────────────
 *
 *  +30  has 4+ (synonym + antonym) relationships from Library
 *  +25  phrasal verb in a family of 4+ members
 *  +20  formal/business/abstract word with Library cross-references
 *  +20  usageProfile: collocation-heavy or phrase-heavy (from generated data)
 *  +15  has Library antonym relationships
 *  +10  has 2+ distinct relationship sources
 *  -30  simple concrete noun
 *  -50  fewer than 4 total relationships (DISQUALIFY)
 *
 * ── Limits ───────────────────────────────────────────────────────────────────
 *
 *  min 4 relationships per entry (enforced)
 *  max 8 relationships per entry (trimmed by priority: synonym > contrast > same_family > confusable)
 *  max 500 entries total
 *
 * Output: src/data/staticRelationshipEntries.ts
 *
 * Run: node data/migrations/generate-static-relationships.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE  = resolve(__dirname, '../../public/data/migration-vocab.json')
const OUTPUT  = resolve(__dirname, '../../src/data/staticRelationshipEntries.ts')

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_RELATIONSHIPS = 4
const MAX_RELATIONSHIPS = 8
const MAX_ENTRIES       = 500

// Relationship priority for trimming (higher = more important)
const DIRECTION_PRIORITY = {
  synonym:      4,
  contrast:     3,
  same_family:  2,
  confusable:   2,
  same_context: 1,
}

// Tags for simple/concrete nouns that are less useful for diagrams
const CONCRETE_TAGS = new Set(['object', 'physical', 'food', 'animal', 'place'])

// Confusable trigger phrases in nuance text
const CONFUSABLE_TRIGGERS = [
  'unlike ',
  'not to be confused',
  ' vs ',
  ' vs. ',
  'compared to ',
  'confused with ',
  'don\'t confuse',
  'contrast with ',
]

// ── Load data ─────────────────────────────────────────────────────────────────

const raw   = readFileSync(SOURCE, 'utf8')
const items = JSON.parse(raw)

// Build lookup maps
const termToItem = new Map()  // lowercase term → item
items.forEach(i => termToItem.set(i.term.toLowerCase(), i))

// ── Build relationship indexes ────────────────────────────────────────────────

// Bidirectional synonym index: lowercase term → Set of lowercase terms
const synonymIndex = new Map()
// Bidirectional antonym index: lowercase term → Set of lowercase terms
const antonymIndex = new Map()

function addToIndex(idx, key, value) {
  const k = key.toLowerCase()
  const v = value.toLowerCase()
  if (!idx.has(k)) idx.set(k, new Set())
  idx.get(k).add(v)
}

for (const item of items) {
  const t = item.term.toLowerCase()
  // Forward synonyms
  for (const syn of (item.synonyms || [])) {
    const synLower = syn.toLowerCase()
    if (termToItem.has(synLower) && synLower !== t) {
      addToIndex(synonymIndex, t, synLower)
      addToIndex(synonymIndex, synLower, t)   // bidirectional
    }
  }
  // Forward antonyms
  for (const ant of (item.antonyms || [])) {
    const antLower = ant.toLowerCase()
    if (termToItem.has(antLower) && antLower !== t) {
      addToIndex(antonymIndex, t, antLower)
      addToIndex(antonymIndex, antLower, t)   // bidirectional
    }
  }
}

// Phrasal verb base-verb index: base word → [items with that base]
const pvBaseIndex = new Map()
for (const item of items) {
  if (!(item.tags || []).includes('phrasal-verb')) continue
  const base = item.term.toLowerCase().split(' ')[0]
  if (!pvBaseIndex.has(base)) pvBaseIndex.set(base, [])
  pvBaseIndex.get(base).push(item)
}

// Keep only base groups with 3+ members (ensures each member has 2+ family relationships)
const pvFamilies = new Map()
for (const [base, pvItems] of pvBaseIndex) {
  if (pvItems.length >= 3) pvFamilies.set(base, pvItems)
}

// Confusable pairs: find Library terms mentioned after trigger phrases in nuance
const confusableIndex = new Map()
for (const item of items) {
  const nuance = (item.nuance || '').toLowerCase()
  const t = item.term.toLowerCase()
  for (const trigger of CONFUSABLE_TRIGGERS) {
    let pos = nuance.indexOf(trigger)
    while (pos !== -1) {
      // Look ahead up to 40 chars to find a Library term
      const segment = nuance.slice(pos + trigger.length, pos + trigger.length + 50)
      for (const [candidateTerm] of termToItem) {
        if (
          candidateTerm !== t &&
          candidateTerm.length >= 3 &&
          segment.startsWith(candidateTerm)
        ) {
          addToIndex(confusableIndex, t, candidateTerm)
          break
        }
      }
      pos = nuance.indexOf(trigger, pos + 1)
    }
  }
}

// ── Relationship builders ─────────────────────────────────────────────────────

/**
 * Build a candidate list of StaticRelEntry for a given item.
 * Returns sorted by priority, deduplicated by targetTerm.
 */
function buildRelationships(item) {
  const t = item.term.toLowerCase()
  const seen = new Set()
  const candidates = []

  function add(targetTerm, direction, strength, explanation) {
    const key = targetTerm.toLowerCase()
    if (key === t) return
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ targetTerm: termToItem.get(key)?.term ?? targetTerm, direction, strength, explanation })
  }

  // Source 1 — Synonyms (strength 3 = strong)
  for (const synTerm of (synonymIndex.get(t) || [])) {
    const synItem = termToItem.get(synTerm)
    if (!synItem) continue
    const directSyn = (item.synonyms || []).map(s => s.toLowerCase()).includes(synTerm)
    const explanation = directSyn
      ? `Listed as a synonym — similar in meaning.`
      : `'${item.term}' is listed as one of its synonyms.`
    add(synTerm, 'synonym', 3, explanation)
  }

  // Source 2 — Antonyms / contrasts (strength 3 = strong)
  for (const antTerm of (antonymIndex.get(t) || [])) {
    const antItem = termToItem.get(antTerm)
    if (!antItem) continue
    const directAnt = (item.antonyms || []).map(a => a.toLowerCase()).includes(antTerm)
    const explanation = directAnt
      ? `Contrasting term — used for opposite situations.`
      : `'${item.term}' is listed as its antonym.`
    add(antTerm, 'contrast', 3, explanation)
  }

  // Source 3 — Phrasal verb family (strength 2 = moderate)
  if ((item.tags || []).includes('phrasal-verb')) {
    const base = t.split(' ')[0]
    if (pvFamilies.has(base)) {
      for (const sibling of pvFamilies.get(base)) {
        if (sibling.term.toLowerCase() === t) continue
        add(
          sibling.term,
          'same_family',
          2,
          `Part of the '${base}' phrasal verb family — same base verb, different meaning.`,
        )
      }
    }
  }

  // Source 4 — Confusable pairs (strength 2)
  for (const confTerm of (confusableIndex.get(t) || [])) {
    const confItem = termToItem.get(confTerm)
    if (!confItem) continue
    add(confTerm, 'confusable', 2, `Often mentioned together — check nuance for the distinction.`)
  }

  return candidates
}

// ── Score items ───────────────────────────────────────────────────────────────

function scoreItem(item, relationships) {
  const t = item.term.toLowerCase()
  let score = 0

  const synCount = relationships.filter(r => r.direction === 'synonym').length
  const antCount = relationships.filter(r => r.direction === 'contrast').length
  const famCount = relationships.filter(r => r.direction === 'same_family').length

  if (synCount + antCount >= 4)                        score += 30
  if (famCount >= 4)                                   score += 25
  if (item.register === 'formal' && item.type === 'word') score += 20
  if (item.register === 'conversational')              score += 10
  if ((item.tags||[]).includes('phrasal-verb'))        score += 10
  if (antCount >= 1)                                   score += 15
  const sourceCount = [synCount, antCount, famCount].filter(c => c > 0).length
  if (sourceCount >= 2)                                score += 10
  if ((item.tags||[]).some(t => CONCRETE_TAGS.has(t))) score -= 30
  // Disqualify under threshold
  if (relationships.length < MIN_RELATIONSHIPS)        score -= 50

  return score
}

// ── Trim to max relationships ─────────────────────────────────────────────────

function trimRelationships(relationships) {
  // Sort by direction priority desc, then strength desc
  const sorted = [...relationships].sort((a, b) => {
    const pa = DIRECTION_PRIORITY[a.direction] ?? 0
    const pb = DIRECTION_PRIORITY[b.direction] ?? 0
    if (pa !== pb) return pb - pa
    return b.strength - a.strength
  })
  return sorted.slice(0, MAX_RELATIONSHIPS)
}

// ── Main loop ─────────────────────────────────────────────────────────────────

const candidates = []

for (const item of items) {
  const relationships = buildRelationships(item)
  if (relationships.length < MIN_RELATIONSHIPS) continue

  const trimmed = trimRelationships(relationships)
  const score   = scoreItem(item, trimmed)
  if (score < 0) continue  // disqualified

  candidates.push({ item, relationships: trimmed, score })
}

// Sort by score desc, take top 500
candidates.sort((a, b) => b.score - a.score)
const selected = candidates.slice(0, MAX_ENTRIES)

// ── Report counters ───────────────────────────────────────────────────────────

const directionCounts = { synonym: 0, contrast: 0, same_family: 0, confusable: 0, same_context: 0 }
let totalRelationships = 0
let maxRel = 0

for (const { relationships } of selected) {
  totalRelationships += relationships.length
  maxRel = Math.max(maxRel, relationships.length)
  for (const r of relationships) {
    directionCounts[r.direction] = (directionCounts[r.direction] || 0) + 1
  }
}

const avgRel = (totalRelationships / selected.length).toFixed(1)

// ── Build TypeScript output ───────────────────────────────────────────────────

function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
}

const lines = [
  `/**`,
  ` * staticRelationshipEntries.ts`,
  ` *`,
  ` * AUTO-GENERATED by data/migrations/generate-static-relationships.js`,
  ` * DO NOT EDIT BY HAND — re-run the generation script instead.`,
  ` *`,
  ` * Static relationship data derived from existing Library fields:`,
  ` *   - Cross-referenced synonyms/antonyms (bidirectional)`,
  ` *   - Phrasal verb base-verb families`,
  ` *   - Confusable pairs from nuance text`,
  ` *`,
  ` * This data is used as a FALLBACK when a VocabItem has no user-generated`,
  ` * relatedEntries. User-generated data always takes priority.`,
  ` *`,
  ` * Generated: ${new Date().toISOString()}`,
  ` * Entries: ${selected.length}`,
  ` * Total relationships: ${totalRelationships}`,
  ` * Avg per entry: ${avgRel}`,
  ` */`,
  ``,
  `export type StaticRelDirection =`,
  `  | 'synonym'`,
  `  | 'contrast'`,
  `  | 'same_family'`,
  `  | 'confusable'`,
  `  | 'same_context'`,
  ``,
  `export interface StaticRelEntry {`,
  `  /** Term of the related Library item (case-sensitive, as in Library) */`,
  `  targetTerm: string`,
  `  direction: StaticRelDirection`,
  `  /** 1 = weak, 2 = moderate, 3 = strong */`,
  `  strength: 1 | 2 | 3`,
  `  explanation: string`,
  `}`,
  ``,
  `/**`,
  ` * Record<term, StaticRelEntry[]> for O(1) lookup.`,
  ` * Keys are the exact term string (case-sensitive, as stored in Library).`,
  ` */`,
  `export const STATIC_RELATIONSHIPS: Record<string, StaticRelEntry[]> = {`,
]

for (const { item, relationships } of selected) {
  lines.push(``)
  lines.push(`  "${esc(item.term)}": [`)
  for (const r of relationships) {
    lines.push(
      `    { targetTerm: "${esc(r.targetTerm)}", direction: "${r.direction}", ` +
      `strength: ${r.strength}, explanation: "${esc(r.explanation)}" },`
    )
  }
  lines.push(`  ],`)
}

lines.push(``)
lines.push(`}`)
lines.push(``)

writeFileSync(OUTPUT, lines.join('\n'), 'utf8')

// ── Report ────────────────────────────────────────────────────────────────────

// Top 20 by relationship count
const top20 = [...selected]
  .sort((a, b) => b.relationships.length - a.relationships.length)
  .slice(0, 20)

console.log(`\n✓ Static relationship generation complete`)
console.log(``)
console.log(`## Static Relationship Coverage Report`)
console.log(``)
console.log(`- Total vocabulary items:            ${items.length}`)
console.log(`- Candidate items scored:            ${candidates.length + items.filter(i => buildRelationships(i).length < MIN_RELATIONSHIPS).length}`)
console.log(`- Static relationship entries:       ${selected.length}`)
console.log(`- Entries skipped (< 4 relations):   ${candidates.length - selected.length + items.length - selected.length - (items.length - candidates.length - (items.length - selected.length - (candidates.length - selected.length)))}`)
console.log(`- Average relationships per entry:   ${avgRel}`)
console.log(`- Max relationships per entry:       ${maxRel}`)
console.log(`- Relationship type counts:`)
console.log(`  - synonym:      ${directionCounts.synonym}`)
console.log(`  - contrast:     ${directionCounts.contrast}`)
console.log(`  - same_family:  ${directionCounts.same_family}`)
console.log(`  - confusable:   ${directionCounts.confusable}`)
console.log(`  - same_context: ${directionCounts.same_context ?? 0}`)
console.log(``)
console.log(`- Top 20 entries by relationship count:`)
top20.forEach(({ item, relationships }) => {
  console.log(`  ${relationships.length.toString().padStart(2)} — ${item.term}`)
})
console.log(``)
console.log(`  Output: ${OUTPUT}`)
