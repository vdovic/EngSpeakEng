/**
 * check-usage-profiles.js
 *
 * Lightweight QA report for the generated usage profiles.
 * Reads migration-vocab.json and usageProfilesGenerated.ts and prints
 * a coverage + distribution summary to help catch regressions.
 *
 * Does NOT require running a build — reads source files directly.
 *
 * Run: node data/migrations/check-usage-profiles.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE    = resolve(__dirname, '../../public/data/migration-vocab.json')
const GENERATED = resolve(__dirname, '../../src/data/usageProfilesGenerated.ts')

// ── Parse source vocab ────────────────────────────────────────────────────────

const items = JSON.parse(readFileSync(SOURCE, 'utf8'))

// ── Parse generated profiles (light TS extraction — no TS compiler needed) ───

const generatedSource = readFileSync(GENERATED, 'utf8')

// Build a map of term -> fields from the generated output
const blockRe = /\"([^\"]+)\":\s*\{([^}]+)\}/g
const profileMap = {}
let m
while ((m = blockRe.exec(generatedSource)) !== null) {
  const term = m[1]
  const body = m[2]
  const fields = {}
  const fieldRe = /(\w+):\s*\"([^\"]+)\"/g
  let fm
  while ((fm = fieldRe.exec(body)) !== null) {
    fields[fm[1]] = fm[2]
  }
  profileMap[term] = fields
}

// Count field occurrences
const fieldCounts = {
  region:          0,
  formality:       0,
  medium:          0,
  phraseUsage:     0,
  frequency:       0,
  naturalnessHint: 0,
}

for (const field of Object.keys(fieldCounts)) {
  const re = new RegExp(`^\\s+${field}:`, 'gm')
  const matches = generatedSource.match(re)
  fieldCounts[field] = matches ? matches.length : 0
}

// Count medium values
const mediumSpoken  = (generatedSource.match(/medium:\s+"spoken"/g) || []).length
const mediumWritten = (generatedSource.match(/medium:\s+"written"/g) || []).length
const mediumBoth    = (generatedSource.match(/medium:\s+"both"/g) || []).length

// Count phraseUsage values
const phraseHeavy      = (generatedSource.match(/phraseUsage:\s+"phrase-heavy"/g) || []).length
const collocationHeavy = (generatedSource.match(/phraseUsage:\s+"collocation-heavy"/g) || []).length

// Count formality values
const formalityInformal     = (generatedSource.match(/formality:\s+"informal"/g) || []).length
const formalityFormal       = (generatedSource.match(/formality:\s+"formal"/g) || []).length
const formalityProfessional = (generatedSource.match(/formality:\s+"professional"/g) || []).length

// Count frequency values
const freqVeryCommon     = (generatedSource.match(/frequency:\s+"very-common"/g) || []).length
const freqAdvancedCommon = (generatedSource.match(/frequency:\s+"advanced-common"/g) || []).length
const freqRare           = (generatedSource.match(/frequency:\s+"rare"/g) || []).length

// Count region values
const regionBritish  = (generatedSource.match(/region:\s+"british"/g) || []).length
const regionAmerican = (generatedSource.match(/region:\s+"american"/g) || []).length

// ── Coverage analysis ─────────────────────────────────────────────────────────

const HAND_CURATED = new Set([
  'mitigate', 'iffy', 'nuanced', 'keen', 'utterly', 'strife', 'oblivious',
  'abduction', 'gentile', 'unrelatable', 'follow up on', 'lock up', 'wrap up',
  'carry on', 'push ahead', 'work through', 'show up', 'deal with', 'get ahead',
  'talk through', 'get out of hand', 'call it a day', 'a piece of cake',
  'dress up', 'bring to the table', 'ease up',
])

let noProfile      = 0
let withProfile    = 0
let noVisualSignal = 0

for (const item of items) {
  if (HAND_CURATED.has(item.term)) continue
  if (!profileMap[item.term]) {
    noProfile++
  } else {
    withProfile++
    const p = profileMap[item.term]
    const hasVisualField = p.formality || p.medium || p.phraseUsage || p.frequency || p.region
    if (!hasVisualField) noVisualSignal++
  }
}

const total        = items.length - HAND_CURATED.size
const coveragePct  = ((withProfile / total) * 100).toFixed(1)
const noSignalPct  = ((noVisualSignal / total) * 100).toFixed(1)

// ── Check specific known terms ────────────────────────────────────────────────

// Conversational chunks that should have very-common frequency
// Exclude hand-curated items — those are managed separately in usageProfiles.ts
const convChunks = items.filter(i =>
  i.register === 'conversational' &&
  i.type === 'chunk' &&
  !HAND_CURATED.has(i.term)
)
const chunksWithVeryCommon = convChunks.filter(i => profileMap[i.term]?.frequency === 'very-common')

// False positives that should now be medium=both
const falsePositiveTerms = ['apprehend', 'animate', 'arcane']
const falsePositiveFixed = falsePositiveTerms.filter(t => profileMap[t]?.medium === 'both')

// British region phrases that should have region=british
const britishPhrases = ['crack on', 'reckon on', 'get about', 'ring up']
const britishWithRegion = britishPhrases.filter(t => profileMap[t]?.region === 'british')

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n## Usage Profile QA Report (v3)`)
console.log(``)
console.log(`### Coverage`)
console.log(`  Total vocab items (excl. hand-curated): ${total}`)
console.log(`  Items with generated profile:            ${withProfile} (${coveragePct}%)`)
console.log(`  Items without profile:                   ${noProfile}`)
console.log(`  Items profile-only (hint, no signals):  ${noVisualSignal} (${noSignalPct}%)`)
console.log(``)
console.log(`### Field distribution (generated profiles)`)
console.log(`  region:           ${fieldCounts.region}`)
console.log(`    ↳ british:      ${regionBritish}`)
console.log(`    ↳ american:     ${regionAmerican}`)
console.log(`  formality:        ${fieldCounts.formality}`)
console.log(`    ↳ informal:     ${formalityInformal}`)
console.log(`    ↳ formal:       ${formalityFormal}`)
console.log(`    ↳ professional: ${formalityProfessional}`)
console.log(`  medium:           ${fieldCounts.medium}`)
console.log(`    ↳ spoken:       ${mediumSpoken}`)
console.log(`    ↳ written:      ${mediumWritten}`)
console.log(`    ↳ both:         ${mediumBoth}`)
console.log(`  phraseUsage:      ${fieldCounts.phraseUsage}`)
console.log(`    ↳ phrase-heavy:      ${phraseHeavy}`)
console.log(`    ↳ collocation-heavy: ${collocationHeavy}`)
console.log(`  frequency:        ${fieldCounts.frequency}`)
console.log(`    ↳ very-common:     ${freqVeryCommon}`)
console.log(`    ↳ advanced-common: ${freqAdvancedCommon}`)
console.log(`    ↳ rare:            ${freqRare}`)
console.log(`  naturalnessHint:  ${fieldCounts.naturalnessHint}`)
console.log(``)
console.log(`### Specific checks`)
console.log(`  Conv. chunks with very-common: ${chunksWithVeryCommon.length} / ${convChunks.length}`)
console.log(`  False positives fixed (→both): ${falsePositiveFixed.length} / ${falsePositiveTerms.length} (${falsePositiveTerms.join(', ')})`)
console.log(`  British region set:            ${britishWithRegion.length} / ${britishPhrases.length} (${britishPhrases.join(', ')})`)
console.log(``)

// ── Assertions ────────────────────────────────────────────────────────────────

const assertions = [
  {
    label: 'phrasal verbs covered (phrase-heavy ≥ 300)',
    pass:  phraseHeavy >= 300,
  },
  {
    label: 'formal medium=written remains ≤ 50 (first-sentence rule reduces false positives)',
    pass:  mediumWritten <= 50,
  },
  {
    label: 'neutral phrases show spoken (spoken ≥ 300)',
    pass:  mediumSpoken >= 300,
  },
  {
    label: 'coverage ≥ 95%',
    pass:  withProfile / total >= 0.95,
  },
  {
    label: 'no-signal items ≤ 30%',
    pass:  noVisualSignal / total <= 0.30,
  },
  {
    label: 'conversational chunks get very-common (all chunks covered)',
    pass:  chunksWithVeryCommon.length === convChunks.length,
  },
  {
    label: 'false positives apprehend/animate/arcane are medium=both',
    pass:  falsePositiveFixed.length === falsePositiveTerms.length,
  },
  {
    label: 'crack on has region=british',
    pass:  profileMap['crack on']?.region === 'british',
  },
  {
    label: 'alleging correctly remains medium=written (journalistic in first sentence)',
    pass:  profileMap['alleging']?.medium === 'written',
  },
]

console.log(`### Assertions`)
let allPassed = true
for (const { label, pass } of assertions) {
  const icon = pass ? '✓' : '✗'
  console.log(`  ${icon} ${label}`)
  if (!pass) allPassed = false
}

if (allPassed) {
  console.log(`\n✓ All assertions passed`)
} else {
  console.log(`\n✗ Some assertions failed — review generation rules`)
  process.exit(1)
}
