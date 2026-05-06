/**
 * check-static-relationships.js
 *
 * Lightweight QA script for staticRelationshipEntries.ts.
 * Reads migration-vocab.json and the generated static relationship file
 * and asserts key quality invariants.
 *
 * Run: node data/migrations/check-static-relationships.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE    = resolve(__dirname, '../../public/data/migration-vocab.json')
const GENERATED = resolve(__dirname, '../../src/data/staticRelationshipEntries.ts')

// ── Parse source vocab ────────────────────────────────────────────────────────

const items    = JSON.parse(readFileSync(SOURCE, 'utf8'))
const termSet  = new Set(items.map(i => i.term.toLowerCase()))

// ── Parse generated static relationship data ──────────────────────────────────
// Extract entries from the TypeScript source using regex (no compiler needed).

const generatedSource = readFileSync(GENERATED, 'utf8')

// Regex to extract each term block: "term": [ ... ],
// This is a simplified parser for the well-structured output of the gen script.
const blockPattern = /^\s+"([^"]+)":\s*\[([^\]]*)\]/gm
const termBlocks   = {}
let m
while ((m = blockPattern.exec(generatedSource)) !== null) {
  const term = m[1]
  const body = m[2]
  // Extract each relationship object
  const relPattern = /\{[^}]+\}/g
  const rels = []
  let rm
  while ((rm = relPattern.exec(body)) !== null) {
    const obj = rm[0]
    const targetMatch    = obj.match(/targetTerm:\s*"([^"]+)"/)
    const directionMatch = obj.match(/direction:\s*"([^"]+)"/)
    const strengthMatch  = obj.match(/strength:\s*(\d+)/)
    if (targetMatch && directionMatch && strengthMatch) {
      rels.push({
        targetTerm: targetMatch[1],
        direction:  directionMatch[1],
        strength:   parseInt(strengthMatch[1]),
      })
    }
  }
  if (rels.length > 0) termBlocks[term] = rels
}

const entryTerms  = Object.keys(termBlocks)
const entryCount  = entryTerms.length
const allRels     = Object.values(termBlocks).flat()

// ── Metrics ───────────────────────────────────────────────────────────────────

const relCounts = entryTerms.map(t => termBlocks[t].length)
const minRels   = Math.min(...relCounts)
const maxRels   = Math.max(...relCounts)
const avgRels   = (relCounts.reduce((a, b) => a + b, 0) / relCounts.length).toFixed(1)

// % of target terms that exist in the Library
const totalTargets     = allRels.length
const targetsInLib     = allRels.filter(r => termSet.has(r.targetTerm.toLowerCase())).length
const libCoveragePct   = ((targetsInLib / totalTargets) * 100).toFixed(1)

// Entries with any duplicate target terms
const entriesWithDups  = entryTerms.filter(t => {
  const targets = termBlocks[t].map(r => r.targetTerm.toLowerCase())
  return targets.length !== new Set(targets).size
})

// Entries where a relationship points to itself
const selfReferences   = entryTerms.filter(t => {
  return termBlocks[t].some(r => r.targetTerm.toLowerCase() === t.toLowerCase())
})

// Direction distribution
const dirCounts = {}
allRels.forEach(r => { dirCounts[r.direction] = (dirCounts[r.direction] || 0) + 1 })

// Graph-eligible entries (in Library as keys)
const graphEligibleCount = entryTerms.filter(t => termSet.has(t.toLowerCase())).length

console.log(`\n## Static Relationship QA Report`)
console.log(``)
console.log(`### Coverage`)
console.log(`  Total static entries:          ${entryCount}`)
console.log(`  Graph-eligible (in Library):   ${graphEligibleCount}`)
console.log(`  Total relationships:           ${totalTargets}`)
console.log(`  Average per entry:             ${avgRels}`)
console.log(`  Min per entry:                 ${minRels}`)
console.log(`  Max per entry:                 ${maxRels}`)
console.log(`  Target terms in Library:       ${targetsInLib}/${totalTargets} (${libCoveragePct}%)`)
console.log(``)
console.log(`### Direction distribution`)
Object.entries(dirCounts).sort((a, b) => b[1] - a[1]).forEach(([dir, count]) => {
  console.log(`  ${dir.padEnd(15)}: ${count}`)
})
console.log(``)
console.log(`### Data quality checks`)
console.log(`  Entries with duplicate targets: ${entriesWithDups.length}`)
if (entriesWithDups.length > 0) console.log(`    → ${entriesWithDups.slice(0,5).join(', ')}`)
console.log(`  Self-referencing entries:       ${selfReferences.length}`)
if (selfReferences.length > 0) console.log(`    → ${selfReferences.slice(0,5).join(', ')}`)
console.log(``)

// ── Assertions ────────────────────────────────────────────────────────────────

const assertions = [
  {
    label: 'no more than 500 static entries',
    pass:  entryCount <= 500,
  },
  {
    label: 'every entry has at least 4 relationships',
    pass:  minRels >= 4,
  },
  {
    label: 'no entry has more than 10 relationships',
    pass:  maxRels <= 10,
  },
  {
    label: 'at least 80% of target terms exist in Library',
    pass:  targetsInLib / totalTargets >= 0.80,
  },
  {
    label: 'no duplicate relationship targets per entry',
    pass:  entriesWithDups.length === 0,
  },
  {
    label: 'no self-referencing relationships',
    pass:  selfReferences.length === 0,
  },
  {
    label: 'at least 100 graph-eligible entries',
    pass:  graphEligibleCount >= 100,
  },
  {
    label: 'synonym relationships exist (> 50)',
    pass:  (dirCounts['synonym'] ?? 0) > 50,
  },
  {
    label: 'same_family relationships exist (phrasal verb families)',
    pass:  (dirCounts['same_family'] ?? 0) > 100,
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
  console.log(`\n✗ Some assertions failed — review generation script`)
  process.exit(1)
}
