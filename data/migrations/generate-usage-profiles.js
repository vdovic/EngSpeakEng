/**
 * generate-usage-profiles.js
 *
 * Derives UsageProfile data for all items in migration-vocab.json from
 * EXISTING fields in the data — no AI calls, no network requests.
 *
 * Derivation rules:
 *   formality   ← register (conversational→informal, formal→formal, neutral→omit)
 *   medium      ← register + type  (conversational/chunk→spoken, formal→written, else omit)
 *   phraseUsage ← type + tags (chunk→phrase-heavy, phrase+idiom tag→phrase-heavy, else omit)
 *   frequency   ← register + type heuristic (see below)
 *   naturalnessHint ← first sentence of nuance (already high-quality usage notes)
 *
 * Output: src/data/usageProfilesGenerated.ts
 *
 * Run: node data/migrations/generate-usage-profiles.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE  = resolve(__dirname, '../../public/data/migration-vocab.json')
const OUTPUT  = resolve(__dirname, '../../src/data/usageProfilesGenerated.ts')

// ── Terms already hand-curated in usageProfiles.ts ───────────────────────────
// These will be skipped; the hand-curated versions take precedence.
const HAND_CURATED = new Set([
  'mitigate', 'iffy', 'nuanced', 'keen', 'utterly', 'strife', 'oblivious',
  'abduction', 'gentile', 'unrelatable', 'follow up on', 'lock up', 'wrap up',
  'carry on', 'push ahead', 'work through', 'show up', 'deal with', 'get ahead',
  'talk through', 'get out of hand', 'call it a day', 'a piece of cake',
  'dress up', 'bring to the table', 'ease up',
])

// ── Derivation helpers ────────────────────────────────────────────────────────

function getFormality(register) {
  if (register === 'conversational') return 'informal'
  if (register === 'formal')         return 'formal'
  return undefined  // 'neutral' is the default — don't set it
}

function getMedium(register, type) {
  // Spoken bias: conversational register OR set phrases/idioms
  if (register === 'conversational') return 'spoken'
  if (type === 'chunk')              return 'spoken'
  // Written bias: formal register (words and phrases)
  if (register === 'formal')         return 'written'
  // Everything else is 'both' (the default) — omit it
  return undefined
}

function getPhraseUsage(type, tags) {
  if (type === 'chunk')                    return 'phrase-heavy'
  if (tags.includes('idiom'))              return 'phrase-heavy'
  if (tags.includes('collocation-heavy'))  return 'collocation-heavy'
  // 'standalone' is the default — omit it
  return undefined
}

function getFrequency(register, type, tags) {
  // Very common: basic conversational phrases used in everyday settings
  if (register === 'conversational' && type === 'phrase') return 'very-common'
  // Advanced-common: formal words that are genuinely common in professional use
  if (register === 'formal' && type === 'word') return 'advanced-common'
  // 'common' is the most neutral default — omit it to avoid noise
  return undefined
}

/**
 * Extracts the first sentence of the nuance field.
 * Caps at 180 characters without breaking a word.
 * Returns undefined for empty/missing nuance.
 */
function extractHint(nuance) {
  if (!nuance || nuance.trim().length === 0) return undefined

  const text = nuance.trim()

  // Find first sentence boundary: '. ' followed by uppercase, or end of string
  const sentenceEnd = text.search(/\.\s+[A-Z"']|\.$/m)
  let hint = sentenceEnd !== -1 ? text.slice(0, sentenceEnd + 1) : text

  // Cap at 180 chars, don't break mid-word
  if (hint.length > 180) {
    const truncated = hint.slice(0, 180)
    const lastSpace = truncated.lastIndexOf(' ')
    hint = (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + '…'
  }

  return hint.length >= 10 ? hint : undefined
}

/**
 * Escape a string for safe inclusion in a TypeScript template literal or
 * single-quoted string. We'll use double-quoted JS strings.
 */
function esc(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw   = readFileSync(SOURCE, 'utf8')
const items = JSON.parse(raw)

const entries = []
let skippedHandCurated = 0
let skippedNoSignal    = 0

for (const item of items) {
  const term = item.term

  // Skip hand-curated entries
  if (HAND_CURATED.has(term)) {
    skippedHandCurated++
    continue
  }

  const register = item.register ?? 'neutral'
  const type     = item.type ?? 'word'
  const tags     = item.tags ?? []

  const formality    = getFormality(register)
  const medium       = getMedium(register, type)
  const phraseUsage  = getPhraseUsage(type, tags)
  const frequency    = getFrequency(register, type, tags)
  const hint         = extractHint(item.nuance)

  // Build the profile object — only include non-undefined fields
  const profile = {}
  if (formality)   profile.formality   = formality
  if (medium)      profile.medium      = medium
  if (phraseUsage) profile.phraseUsage = phraseUsage
  if (frequency)   profile.frequency   = frequency
  if (hint)        profile.naturalnessHint = hint

  // Skip if absolutely no signals (shouldn't happen since every item has nuance)
  const fieldCount = Object.keys(profile).length
  if (fieldCount === 0) {
    skippedNoSignal++
    continue
  }

  entries.push({ term, profile })
}

// ── Build TypeScript output ───────────────────────────────────────────────────

const lines = [
  `/**`,
  ` * usageProfilesGenerated.ts`,
  ` *`,
  ` * AUTO-GENERATED by data/migrations/generate-usage-profiles.js`,
  ` * DO NOT EDIT BY HAND — re-run the generation script instead.`,
  ` *`,
  ` * Derived from existing VocabItem fields in migration-vocab.json:`,
  ` *   formality    ← register`,
  ` *   medium       ← register + type`,
  ` *   phraseUsage  ← type + tags`,
  ` *   frequency    ← register + type heuristic`,
  ` *   naturalnessHint ← first sentence of nuance`,
  ` *`,
  ` * Hand-curated entries in usageProfiles.ts override these.`,
  ` * Generated: ${new Date().toISOString()}`,
  ` * Entries: ${entries.length}`,
  ` */`,
  ``,
  `import type { UsageProfile } from '@/types/vocabulary'`,
  ``,
  `export const USAGE_PROFILES_GENERATED: Record<string, UsageProfile> = {`,
]

for (const { term, profile } of entries) {
  lines.push(``)
  lines.push(`  "${esc(term)}": {`)
  if (profile.formality)        lines.push(`    formality:        "${profile.formality}",`)
  if (profile.medium)           lines.push(`    medium:           "${profile.medium}",`)
  if (profile.phraseUsage)      lines.push(`    phraseUsage:      "${profile.phraseUsage}",`)
  if (profile.frequency)        lines.push(`    frequency:        "${profile.frequency}",`)
  if (profile.naturalnessHint)  lines.push(`    naturalnessHint:  "${esc(profile.naturalnessHint)}",`)
  lines.push(`  },`)
}

lines.push(``)
lines.push(`}`)
lines.push(``)

writeFileSync(OUTPUT, lines.join('\n'), 'utf8')

console.log(`\n✓ Usage profile generation complete`)
console.log(`  Entries written:          ${entries.length}`)
console.log(`  Hand-curated (skipped):   ${skippedHandCurated}`)
console.log(`  No signal (skipped):      ${skippedNoSignal}`)
console.log(`  Output: ${OUTPUT}`)
