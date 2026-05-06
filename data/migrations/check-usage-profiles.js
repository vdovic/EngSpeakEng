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
// Extract every entry term and its field names from the generated file.

const generatedSource = readFileSync(GENERATED, 'utf8')

// Build a set of terms present in generated output
const termPattern = /^\s+"([^"]+)":\s*\{/gm
const generatedTerms = new Set()
let m
while ((m = termPattern.exec(generatedSource)) !== null) {
  generatedTerms.add(m[1])
}

// Count each field occurrence
const fieldCounts = {
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
const phraseHeavy       = (generatedSource.match(/phraseUsage:\s+"phrase-heavy"/g) || []).length
const collocationHeavy  = (generatedSource.match(/phraseUsage:\s+"collocation-heavy"/g) || []).length

// Count formality values
const formalityInformal     = (generatedSource.match(/formality:\s+"informal"/g) || []).length
const formalityFormal       = (generatedSource.match(/formality:\s+"formal"/g) || []).length
const formalityProfessional = (generatedSource.match(/formality:\s+"professional"/g) || []).length

// Count frequency values
const freqVeryCommon     = (generatedSource.match(/frequency:\s+"very-common"/g) || []).length
const freqAdvancedCommon = (generatedSource.match(/frequency:\s+"advanced-common"/g) || []).length
const freqRare           = (generatedSource.match(/frequency:\s+"rare"/g) || []).length

// ── Coverage analysis ─────────────────────────────────────────────────────────

const HAND_CURATED = new Set([
  'mitigate', 'iffy', 'nuanced', 'keen', 'utterly', 'strife', 'oblivious',
  'abduction', 'gentile', 'unrelatable', 'follow up on', 'lock up', 'wrap up',
  'carry on', 'push ahead', 'work through', 'show up', 'deal with', 'get ahead',
  'talk through', 'get out of hand', 'call it a day', 'a piece of cake',
  'dress up', 'bring to the table', 'ease up',
])

let noProfile        = 0
let withProfile      = 0
let noVisualSignal   = 0  // has profile but only naturalnessHint (no pills/lines)

for (const item of items) {
  if (HAND_CURATED.has(item.term)) continue
  if (!generatedTerms.has(item.term)) {
    noProfile++
  } else {
    withProfile++
    // Approximate: check if the item's block has any signal field besides naturalnessHint
    // We look for the term in the generated source and check following lines
    const termIdx = generatedSource.indexOf(`"${item.term}": {`)
    if (termIdx !== -1) {
      const block = generatedSource.slice(termIdx, termIdx + 400)
      const hasVisualField = /formality:|medium:|phraseUsage:|frequency:/.test(block)
      if (!hasVisualField) noVisualSignal++
    }
  }
}

const total = items.length - HAND_CURATED.size
const coveragePct = ((withProfile / total) * 100).toFixed(1)
const noSignalPct  = ((noVisualSignal / total) * 100).toFixed(1)

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n## Usage Profile QA Report`)
console.log(``)
console.log(`### Coverage`)
console.log(`  Total vocab items (excl. hand-curated): ${total}`)
console.log(`  Items with generated profile:            ${withProfile} (${coveragePct}%)`)
console.log(`  Items without profile:                   ${noProfile}`)
console.log(`  Items profile-only (hint, no signals):  ${noVisualSignal} (${noSignalPct}%)`)
console.log(``)
console.log(`### Field distribution (generated profiles)`)
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

// ── Spot-check assertions ─────────────────────────────────────────────────────
// These are sanity checks — if they fail, the generation rules may have regressed.

const assertions = [
  { label: 'phrasal verbs covered (phrase-heavy ≥ 300)',   pass: phraseHeavy >= 300 },
  { label: 'formal words not over-written (written ≤ 100)', pass: mediumWritten <= 100 },
  { label: 'neutral phrases show spoken (spoken ≥ 300)',   pass: mediumSpoken >= 300 },
  { label: 'coverage ≥ 95%',                               pass: withProfile / total >= 0.95 },
  { label: 'no-signal items ≤ 30%',                        pass: noVisualSignal / total <= 0.30 },
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
