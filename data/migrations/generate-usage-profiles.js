/**
 * generate-usage-profiles.js
 *
 * Derives UsageProfile data for all items in migration-vocab.json from
 * EXISTING fields in the data — no AI calls, no network requests.
 *
 * ── Derivation rules (v3) ──────────────────────────────────────────────────
 *
 *  REGISTER OVERRIDES (applied before all rules)
 *    A small set of items have obviously wrong register in the source data.
 *    These are corrected here before derivation.
 *
 *  MEDIUM OVERRIDES (applied before getMedium)
 *    Explicit overrides for known false positives from the written-marker rule.
 *
 *  REGION OVERRIDES (curated, conservative)
 *    Only clearly British-dominant phrases. Added to profile output.
 *
 *  formality   ← register (conversational→informal, formal→formal, neutral→omit)
 *
 *  medium      ← register + type + tags + nuance content
 *    conversational                → spoken
 *    type=chunk                    → spoken
 *    tags includes phrasal-verb    → spoken (formal → both)   [Rule 2]
 *    formal + type=word            → both, unless FIRST SENTENCE of nuance has
 *                                    a written marker → written  [Rule 3 improved]
 *    neutral phrase/phrasal-verb   → spoken                   [Rule 5]
 *    else                          → omit (defaults to 'both')
 *
 *  phraseUsage ← type + tags
 *    type=chunk                    → phrase-heavy
 *    tags includes idiom           → phrase-heavy
 *    type=phrase AND tags includes phrasal-verb → phrase-heavy  [Rule 1]
 *    tags includes phrasal-verb    → phrase-heavy               [Rule 1]
 *    tags includes collocation-heavy → collocation-heavy
 *    else                          → omit (standalone is default)
 *
 *  frequency   ← HIGH_FREQ lookup + register + type heuristic
 *    HIGH_FREQ set                 → very-common                [Rule 4]
 *    conversational + (phrase|chunk) → very-common              [Rule 4b — v3 fix]
 *    formal + word                 → advanced-common
 *    else                          → omit
 *
 *  region      ← REGION_OVERRIDES (curated list only)
 *
 *  naturalnessHint ← first sentence of nuance (already high-quality usage notes)
 *
 * ── Written markers (Rule 3 — improved in v3) ─────────────────────────────
 *   Only applied to the FIRST SENTENCE of nuance (primary usage context).
 *   Applying to full nuance text caused false positives where 'literary' or
 *   'journalistic' appeared in a secondary clause describing edge-case usage.
 *
 * ── High-frequency neutral phrases (Rule 4) ───────────────────────────────
 *   A curated list of core English phrases that are unambiguously very-common
 *   regardless of their register label.
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

// ── Register overrides — correcting obvious mis-classifications in source data ─
// Only for clear cases where the source register is factually wrong.
const REGISTER_OVERRIDES = {
  'underpass':  'neutral',  // common everyday infrastructure word; not formal vocabulary
  'persistent': 'neutral',  // very common in everyday speech; not inherently formal
  'hazard':     'neutral',  // common in speech ("health hazard", "driving hazard")
}

// ── Medium overrides — explicit corrections for written-marker false positives ─
// These words got medium=written in v2 due to incidental 'literary' mentions in
// secondary nuance clauses, not because their primary usage is written-only.
const MEDIUM_OVERRIDES = {
  'apprehend': 'both',  // primarily spoken in law-enforcement context; literary = secondary cognitive sense
  'animate':   'both',  // common in speech ("What animates this project?"); literary is an edge case
  'arcane':    'both',  // used conversationally ("that's arcane knowledge"); literary = stylistic note
}

// ── Region overrides — curated, conservative list of British-dominant items ───
// Only for phrases where the nuance explicitly states British dominance.
// Keep this list small: only add where the nuance says "dominates", "standard in
// British English", or similarly strong language. Do not guess.
const REGION_OVERRIDES = {
  'crack on':   'british',  // nuance: "British English dominates this phrase"
  'reckon on':  'british',  // nuance: "More British and conversational"
  'get about':  'british',  // nuance: "standard in British English" (not common in American)
  'ring up':    'british',  // nuance: "more common in British English"
}

// ── Written markers (Rule 3 — first-sentence only in v3) ─────────────────────
// Formal words whose FIRST SENTENCE of nuance describes written/literary/academic
// use retain medium=written. All others get medium=both.
// Applying to full-text caused false positives (apprehend, animate, arcane, etc.)
const WRITTEN_MARKERS = [
  'literary',
  'journalistic',
  'written',
  'academic writing',
  'formal writing',
  'essay',
  'scholarly',
  'legal writing',
]

// ── High-frequency neutral phrases (Rule 4) ───────────────────────────────────
// Core English phrases that are unambiguously very-common regardless of register.
// These override the default frequency derivation.
const HIGH_FREQ_PHRASES = new Set([
  'look forward to',
  'find out',
  'give up',
  'set up',
  'take on',
  'figure out',
  'sort out',
  'work out',
  'come up with',
  'run out',
  'point out',
  'bring up',
  'put off',
  'check out',
  'look into',
  'take off',
  'make up',
  'get on with',
  'carry on',
  'turn up',
  'pick up',
  'hold on',
  'calm down',
  'hurry up',
  'get over',
])

// ── Derivation helpers ────────────────────────────────────────────────────────

/**
 * Extracts only the first sentence from nuance text.
 * Used to scope the written-marker check so that incidental mentions of
 * 'literary' or 'journalistic' in secondary clauses don't fire false positives.
 */
function extractFirstSentence(nuance) {
  if (!nuance) return ''
  const text = nuance.trim()
  const sentenceEnd = text.search(/\.\s+[A-Z"']|\.$/m)
  return sentenceEnd !== -1 ? text.slice(0, sentenceEnd + 1) : text
}

function getFormality(register) {
  if (register === 'conversational') return 'informal'
  if (register === 'formal')         return 'formal'
  return undefined  // 'neutral' is the default — don't set it
}

function getMedium(register, type, tags, nuance) {
  const isPhrasalVerb = tags.includes('phrasal-verb')

  // Conversational register → always spoken
  if (register === 'conversational') return 'spoken'

  // Chunks (set phrases, idioms) → always spoken
  if (type === 'chunk') return 'spoken'

  // Rule 2: phrasal verbs → spoken (formal phrasal verbs → both)
  if (isPhrasalVerb) {
    return register === 'formal' ? 'both' : 'spoken'
  }

  // Rule 3 (improved v3): formal words → both, unless FIRST SENTENCE of nuance
  // contains a written marker → written.
  // Using first-sentence only to avoid false positives from secondary clauses.
  if (register === 'formal' && type === 'word') {
    const firstSentenceLower = extractFirstSentence(nuance).toLowerCase()
    return WRITTEN_MARKERS.some(m => firstSentenceLower.includes(m)) ? 'written' : 'both'
  }

  // Rule 5: neutral phrases → spoken
  if (type === 'phrase' && (!register || register === 'neutral')) {
    return 'spoken'
  }

  // Everything else: omit (defaults to 'both' in the UI)
  return undefined
}

function getPhraseUsage(type, tags) {
  if (type === 'chunk')                           return 'phrase-heavy'
  if (tags.includes('idiom'))                     return 'phrase-heavy'
  // Rule 1: phrasal verbs are always phrase-heavy
  if (type === 'phrase' && tags.includes('phrasal-verb')) return 'phrase-heavy'
  if (tags.includes('phrasal-verb'))              return 'phrase-heavy'
  if (tags.includes('collocation-heavy'))         return 'collocation-heavy'
  // 'standalone' is the default — omit it
  return undefined
}

function getFrequency(term, register, type) {
  // Rule 4: curated high-frequency phrases override everything
  if (HIGH_FREQ_PHRASES.has(term)) return 'very-common'
  // Rule 4b (v3): conversational phrases AND chunks are very-common
  // v2 only included type=phrase; v3 extends to type=chunk (idioms, set phrases)
  if (register === 'conversational' && (type === 'phrase' || type === 'chunk')) return 'very-common'
  // Advanced-common: formal words that are genuinely common in professional use
  if (register === 'formal' && type === 'word') return 'advanced-common'
  // 'common' is the most neutral default — omit to avoid noise
  return undefined
}

/**
 * Extracts the first sentence of the nuance field for display as a hint.
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
 * Escape a string for safe inclusion in a double-quoted JS string.
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
let skippedHandCurated   = 0
let skippedNoSignal      = 0
let registerOverridden   = 0

// Counters for the regeneration report
let pvWithPhraseHeavy    = 0
let pvWithMedium         = 0
let formalChangedToBoth  = 0
let formalStillWritten   = 0
let neutralGainedSignal  = 0
let noSignalCount        = 0
let chunkWithVeryCommon  = 0
let mediumOverrideCount  = 0
let regionOverrideCount  = 0

for (const item of items) {
  const term = item.term

  // Skip hand-curated entries
  if (HAND_CURATED.has(term)) {
    skippedHandCurated++
    continue
  }

  const origRegister = item.register ?? 'neutral'
  const register     = REGISTER_OVERRIDES[term] ?? origRegister
  const type         = item.type ?? 'word'
  const tags         = item.tags ?? []

  if (REGISTER_OVERRIDES[term]) registerOverridden++

  const formality   = getFormality(register)
  // Apply MEDIUM_OVERRIDES before getMedium (explicit corrections for known false positives)
  const medium      = MEDIUM_OVERRIDES[term] ?? getMedium(register, type, tags, item.nuance)
  const phraseUsage = getPhraseUsage(type, tags)
  const frequency   = getFrequency(term, register, type)
  const region      = REGION_OVERRIDES[term]
  const hint        = extractHint(item.nuance)

  if (MEDIUM_OVERRIDES[term]) mediumOverrideCount++
  if (region)                 regionOverrideCount++

  // Build the profile object — only include non-undefined fields
  const profile = {}
  if (region)      profile.region      = region
  if (formality)   profile.formality   = formality
  if (medium)      profile.medium      = medium
  if (phraseUsage) profile.phraseUsage = phraseUsage
  if (frequency)   profile.frequency   = frequency
  if (hint)        profile.naturalnessHint = hint

  // Skip if absolutely no signals (very rare; every item should have nuance)
  const fieldCount = Object.keys(profile).length
  if (fieldCount === 0) {
    skippedNoSignal++
    noSignalCount++
    continue
  }

  entries.push({ term, profile })

  // ── Counters for report ──────────────────────────────────────────────────
  if (phraseUsage === 'phrase-heavy' && tags.includes('phrasal-verb')) pvWithPhraseHeavy++
  if (medium && tags.includes('phrasal-verb')) pvWithMedium++
  if (medium === 'both' && origRegister === 'formal' && type === 'word') formalChangedToBoth++
  if (medium === 'written' && register === 'formal' && type === 'word') formalStillWritten++
  if (origRegister === 'neutral' && !REGISTER_OVERRIDES[term] && (medium || phraseUsage || frequency)) {
    neutralGainedSignal++
  }
  if (!formality && !medium && !phraseUsage && !frequency) noSignalCount++
  if (frequency === 'very-common' && type === 'chunk') chunkWithVeryCommon++
}

// ── Build TypeScript output ───────────────────────────────────────────────────

const lines = [
  `/**`,
  ` * usageProfilesGenerated.ts`,
  ` *`,
  ` * AUTO-GENERATED by data/migrations/generate-usage-profiles.js`,
  ` * DO NOT EDIT BY HAND — re-run the generation script instead.`,
  ` *`,
  ` * Derived from existing VocabItem fields in migration-vocab.json.`,
  ` * Generation rules v3:`,
  ` *   region       ← REGION_OVERRIDES (curated British-dominant phrases)`,
  ` *   formality    ← register`,
  ` *   medium       ← MEDIUM_OVERRIDES (explicit) or register + type + tags + first-sentence written-markers`,
  ` *   phraseUsage  ← type + tags (phrasal-verb tag → phrase-heavy)`,
  ` *   frequency    ← HIGH_FREQ_PHRASES lookup + register + type (chunk included)`,
  ` *   naturalnessHint ← first sentence of nuance`,
  ` *`,
  ` * v3 changes over v2:`,
  ` *   - Written-marker check now scoped to FIRST SENTENCE only (reduces false positives)`,
  ` *   - Explicit medium overrides for apprehend/animate/arcane`,
  ` *   - conversational chunks now get frequency=very-common (not just phrases)`,
  ` *   - Region signal added for clearly British-dominant phrases`,
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
  if (profile.region)           lines.push(`    region:           "${profile.region}",`)
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

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n✓ Usage profile generation complete (rules v3)`)
console.log(``)
console.log(`## Usage Profile Regeneration Report (v3)`)
console.log(``)
console.log(`- Total vocabulary items:                  ${items.length}`)
console.log(`- Generated profiles (v2):                 1138`)
console.log(`- Generated profiles (v3):                 ${entries.length}`)
console.log(`- Hand-curated profiles preserved:         ${skippedHandCurated}`)
console.log(`- Register overrides applied:              ${registerOverridden}`)
console.log(`- Medium overrides applied:                ${mediumOverrideCount}  (apprehend/animate/arcane → both)`)
console.log(`- Region overrides applied:                ${regionOverrideCount}  (British-dominant phrases)`)
console.log(`- Phrasal verbs with phrase-heavy:         ${pvWithPhraseHeavy}`)
console.log(`- Phrasal verbs with spoken/both medium:   ${pvWithMedium}`)
console.log(`- Formal words changed from written→both:  ${formalChangedToBoth}`)
console.log(`- Formal words still medium=written:       ${formalStillWritten}  (first sentence has written markers)`)
console.log(`- Conv. chunks with very-common frequency: ${chunkWithVeryCommon}`)
console.log(`- Neutral entries now showing signals:     ${neutralGainedSignal}`)
console.log(`- Items still without any visual signal:   ${noSignalCount}`)
console.log(``)
console.log(`  Output: ${OUTPUT}`)
