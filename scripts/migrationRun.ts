/**
 * scripts/migrationRun.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-TIME bulk migration runner.
 *
 * Reads data/migrations/seed-words-raw.txt, normalises + deduplicates the
 * entries, enriches each one via the Anthropic API (10 concurrent), and
 * writes a VocabItem[] JSON file that the app imports on first load.
 *
 * Usage:
 *   npm run migrate
 *   # ANTHROPIC_API_KEY is read from .env.local automatically, or export it:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run migrate
 *
 * The script is RESUMABLE: progress is saved after every successful item.
 * Interrupted runs can be continued by simply re-running the command.
 * Previously-failed items are retried on each run.
 *
 * Output files:
 *   public/data/migration-vocab.json           ← static asset; app imports on first load
 *   data/migrations/migration-report.json      ← statistics + category breakdown
 *   data/migrations/ambiguous-duplicates.json  ← near-duplicates for manual review
 *   data/migrations/migration-progress.json    ← resume file (gitignored)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import {
  normalizeAndDeduplicate,
  normalizeKey,
  type NormalizedEntry,
  type MigrationReport,
} from './migrationNormalize.js'

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const RAW_FILE       = resolve(ROOT, 'data/migrations/seed-words-raw.txt')
const PROGRESS_FILE  = resolve(ROOT, 'data/migrations/migration-progress.json')
const REPORT_FILE    = resolve(ROOT, 'data/migrations/migration-report.json')
const AMBIGUOUS_FILE = resolve(ROOT, 'data/migrations/ambiguous-duplicates.json')
const OUTPUT_FILE    = resolve(ROOT, 'public/data/migration-vocab.json')

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * Rate-limit strategy for a free / Tier-1 Anthropic key:
 *   50 req/min  AND  10,000 output tokens/min
 * Each card is ~700 tokens → max ~14 cards/min safely.
 * With CONCURRENCY=1 and MIN_DELAY=4 500 ms we get ≈ 9 req/min — well inside both caps.
 * Increase CONCURRENCY (and reduce MIN_DELAY) if you have a higher-tier key.
 */
const CONCURRENCY   = 1
const MIN_DELAY_MS  = 4_500   // minimum pause between API calls
/** Single source of truth. Override via ANTHROPIC_MODEL env var if needed. */
const MODEL         = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'
const MAX_TOKENS    = 1200
/** Retry config for 429 rate-limit errors */
const MAX_RETRIES   = 6
const RETRY_BASE_MS = 10_000  // 10 s initial wait, doubles each attempt → 10, 20, 40, 80, 160, 320 s

// ── Prompt (must stay in sync with api/enrich.ts) ────────────────────────────

const SYSTEM_PROMPT = `You are an expert English teacher helping a professional learner at B2–C1 level \
build active vocabulary through spaced repetition. When asked to generate a vocabulary study card, \
return ONLY a valid JSON object — no markdown fences, no commentary, no extra text.

Required JSON structure:
{
  "definitionEn": "Clear 1–2 sentence plain-English explanation",
  "partOfSpeech": "verb | noun | adjective | adverb | phrase | chunk | etc.",
  "synonyms": ["3–5 close synonyms or near-equivalents"],
  "antonyms": ["1–3 antonyms; empty array [] when not applicable"],
  "exampleSentence": "Natural, modern example sentence showing real usage",
  "workSentence": "Example in a professional, work or meeting context",
  "nuance": "What makes this word distinctive vs its closest synonyms. Include register, tone, and context.",
  "register": "formal OR neutral OR conversational",
  "collocations": ["3–5 common collocations or fixed expressions"],
  "sentenceFrames": ["2–3 reusable sentence templates using ___ as placeholder"],
  "etymology": "Brief etymology if memorable and helpful; empty string otherwise",
  "memoryCue": "A vivid mnemonic, image, or memory hook",
  "commonMistakes": "The most common learner error or confusion; empty string if none",
  "realLifeTask": "One specific, actionable challenge — e.g. Say this in your next standup when describing a blocker."
}`

// ── Types ─────────────────────────────────────────────────────────────────────

/** Matches src/types/vocabulary.ts VocabItem — duplicated here to avoid Vite alias issues */
interface MigrationVocabItem {
  id: string
  term: string
  type: 'word' | 'phrase' | 'chunk'
  status: 'inbox'
  createdAt: string
  updatedAt: string
  tags: string[]
  translations: Record<string, never>
  synonyms: string[]
  antonyms: string[]
  collocations: string[]
  sentenceFrames: string[]
  relatedPhrases: string[]
  review: {
    intervalDays: number
    ease: number
    reviewCount: number
    successfulRecalls: number
    sentenceProduced: boolean
  }
  activation: {
    requiredUses: number
    usageCount: number
    usageLogs: never[]
  }
  weeklyFocus: boolean
  archived: boolean
  generationStatus: 'complete'
  // Enriched fields (populated by Claude)
  definitionEn?: string
  partOfSpeech?: string
  exampleSentence?: string
  workSentence?: string
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  commonMistakes?: string
  etymology?: string
  memoryCue?: string
  realLifeTask?: string
}

interface ProgressFile {
  startedAt: string
  completed: Record<string, MigrationVocabItem>          // normalized key → item
  failed: Record<string, { term: string; error: string }> // normalized key → failure
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID()
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(filePath)
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

/** Parse .env.local and inject into process.env (won't override existing vars) */
function loadEnvLocal(): void {
  const envPath = resolve(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  }
}

function loadProgress(): ProgressFile {
  if (!existsSync(PROGRESS_FILE)) {
    return { startedAt: new Date().toISOString(), completed: {}, failed: {} }
  }
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as ProgressFile
  } catch {
    console.warn('⚠   Progress file is corrupt — starting fresh.')
    return { startedAt: new Date().toISOString(), completed: {}, failed: {} }
  }
}

function saveProgress(progress: ProgressFile): void {
  writeJson(PROGRESS_FILE, progress)
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

/**
 * Runs `tasks` with at most `concurrency` in-flight at once.
 * Returns settled results in the same order as the tasks array.
 * Never throws — all errors are captured in the result.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const idx = nextIndex++
      if (idx >= tasks.length) break
      try {
        results[idx] = { status: 'fulfilled', value: await tasks[idx]() }
      } catch (e) {
        results[idx] = { status: 'rejected', reason: e }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  )
  return results
}

// ── Enrichment ────────────────────────────────────────────────────────────────

/** Sleep helper */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function enrichEntry(
  client: Anthropic,
  entry: NormalizedEntry
): Promise<MigrationVocabItem> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1)  // 8s, 16s, 32s…
      process.stdout.write(`\n    ↻  rate-limited "${entry.term}" — retrying in ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})`)
      await sleep(waitMs)
    }

    let message: Awaited<ReturnType<typeof client.messages.create>>
    try {
      message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate a vocabulary study card for the ${entry.type}: "${entry.term}"`,
          },
        ],
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Retry on 429; surface all other errors immediately
      if (msg.includes('429') || msg.toLowerCase().includes('rate_limit') || msg.toLowerCase().includes('rate limit')) {
        lastError = err instanceof Error ? err : new Error(msg)
        continue
      }
      throw err
    }

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip markdown fences, BOM, leading/trailing whitespace
    const cleaned = raw
      .replace(/^\uFEFF/, '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    if (!cleaned) throw new Error('Empty response from Claude')

    // Attempt JSON parse — surface parse errors immediately (not retriable)
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>
    } catch (parseErr: unknown) {
      throw new Error(
        `JSON parse failed for "${entry.term}": ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\nRaw: ${raw.slice(0, 200)}`
      )
    }

    return buildItem(entry, parsed)
  }

  throw lastError ?? new Error(`Max retries exceeded for "${entry.term}"`)
}

function buildItem(entry: NormalizedEntry, enriched: Record<string, unknown>): MigrationVocabItem {
  const now = new Date().toISOString()
  const VALID_REGISTERS = new Set(['formal', 'neutral', 'conversational'])

  return {
    id: uid(),
    term: entry.term,
    type: entry.type,
    status: 'inbox',
    createdAt: now,
    updatedAt: now,
    tags: entry.tags,
    translations: {},
    synonyms: Array.isArray(enriched.synonyms)
      ? (enriched.synonyms as string[]).filter((s) => typeof s === 'string')
      : [],
    antonyms: Array.isArray(enriched.antonyms)
      ? (enriched.antonyms as string[]).filter((s) => typeof s === 'string')
      : [],
    collocations: Array.isArray(enriched.collocations)
      ? (enriched.collocations as string[]).filter((s) => typeof s === 'string')
      : [],
    sentenceFrames: Array.isArray(enriched.sentenceFrames)
      ? (enriched.sentenceFrames as string[]).filter((s) => typeof s === 'string')
      : [],
    relatedPhrases: [],
    review: {
      intervalDays: 0,
      ease: 2.5,
      reviewCount: 0,
      successfulRecalls: 0,
      sentenceProduced: false,
    },
    activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    weeklyFocus: false,
    archived: false,
    generationStatus: 'complete',
    definitionEn:
      typeof enriched.definitionEn === 'string' ? enriched.definitionEn : undefined,
    partOfSpeech:
      typeof enriched.partOfSpeech === 'string' ? enriched.partOfSpeech : undefined,
    exampleSentence:
      typeof enriched.exampleSentence === 'string' ? enriched.exampleSentence : undefined,
    workSentence:
      typeof enriched.workSentence === 'string' ? enriched.workSentence : undefined,
    nuance: typeof enriched.nuance === 'string' ? enriched.nuance : undefined,
    register: VALID_REGISTERS.has(enriched.register as string)
      ? (enriched.register as 'formal' | 'neutral' | 'conversational')
      : undefined,
    commonMistakes:
      typeof enriched.commonMistakes === 'string' ? enriched.commonMistakes : undefined,
    etymology: typeof enriched.etymology === 'string' ? enriched.etymology : undefined,
    memoryCue: typeof enriched.memoryCue === 'string' ? enriched.memoryCue : undefined,
    realLifeTask:
      typeof enriched.realLifeTask === 'string' ? enriched.realLifeTask : undefined,
  }
}

// ── Test mode (--test) ────────────────────────────────────────────────────────

const TEST_TERMS = [
  'abduction',
  'abide',
  'a piece of cake',
  'look forward to',
  'compassion fatigue',
]

async function runTest(entries: NormalizedEntry[], apiKey: string): Promise<void> {
  console.log('\n🧪  TEST MODE — enriching 5 sample entries\n')

  const client = new Anthropic({ apiKey })
  let passed = 0

  for (const term of TEST_TERMS) {
    const key = normalizeKey(term)
    const entry = entries.find((e) => e.key === key)
    if (!entry) {
      console.warn(`    ⚠   "${term}" not found in normalized entries (key="${key}")`)
      continue
    }

    process.stdout.write(`    Testing "${entry.term}" (${entry.category})… `)
    try {
      const item = await enrichEntry(client, entry)
      console.log(`✓`)
      console.log(`      definition : ${(item.definitionEn ?? '').slice(0, 80)}…`)
      console.log(`      synonyms   : ${item.synonyms.slice(0, 3).join(', ')}`)
      passed++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗`)
      console.error(`      Error: ${msg}`)
    }
  }

  console.log('')
  if (passed === TEST_TERMS.length) {
    console.log(`✅  Test passed (${passed}/${TEST_TERMS.length}). Run \`npm run migrate\` for the full migration.`)
  } else {
    console.error(`❌  Test failed (${passed}/${TEST_TERMS.length} passed). Fix the issue before running the full migration.`)
    process.exit(1)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isTest = args.includes('--test')

  const SEP = '━'.repeat(60)
  console.log(SEP)
  console.log('  SpeakEnglish — Bulk Vocabulary Migration')
  console.log(SEP)

  // ── Load env ───────────────────────────────────────────────────────────────
  loadEnvLocal()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('\n❌  ANTHROPIC_API_KEY is not set.')
    console.error('    Add it to .env.local or export it in your shell, then re-run.\n')
    process.exit(1)
  }

  // ── Read raw vocabulary file ───────────────────────────────────────────────
  if (!existsSync(RAW_FILE)) {
    console.error(`\n❌  Raw file not found:\n    ${RAW_FILE}\n`)
    process.exit(1)
  }

  const rawLines = readFileSync(RAW_FILE, 'utf-8').split('\n')

  // ── Normalise + deduplicate ────────────────────────────────────────────────
  const { entries, report, ambiguous } = normalizeAndDeduplicate(rawLines)

  // ── Header info ────────────────────────────────────────────────────────────
  console.log(`\n  Model      : ${MODEL}`)
  console.log(`  Raw lines  : ${rawLines.length}`)
  console.log(`  Unique     : ${report.uniqueCount}  (${report.duplicatesRemoved} duplicates removed)`)
  console.log(`  By category:`)
  for (const [cat, count] of Object.entries(report.byCategory)) {
    if (count > 0) console.log(`    ${cat.padEnd(14)} ${count}`)
  }
  if (ambiguous.length > 0) {
    console.log(`  Ambiguous  : ${ambiguous.length}`)
  }

  // ── Test mode: quick smoke-test, then exit ─────────────────────────────────
  if (isTest) {
    await runTest(entries, apiKey)
    return
  }

  // ── Load progress (resume support) ────────────────────────────────────────
  const progress = loadProgress()
  const completedKeys = new Set(Object.keys(progress.completed))
  // Failed items are NOT in completedKeys, so they are automatically retried
  const toProcess = entries.filter((e) => !completedKeys.has(e.key))
  const previouslyFailed = Object.keys(progress.failed).length

  if (completedKeys.size > 0) {
    console.log(
      `\n⏩  Resuming — ${completedKeys.size} already done, ${previouslyFailed} previously failed (will retry), ${toProcess.length} remaining`
    )
  } else {
    console.log(`\n🚀  Starting fresh — ${toProcess.length} entries to enrich`)
  }

  // ── Enrich entries ─────────────────────────────────────────────────────────
  let batchSucceeded = 0
  let batchFailed = 0

  if (toProcess.length > 0) {
    const client = new Anthropic({ apiKey })
    let done = 0

    const tasks = toProcess.map(
      (entry): (() => Promise<MigrationVocabItem>) =>
        async () => {
          let item: MigrationVocabItem
          try {
            item = await enrichEntry(client, entry)
          } catch (err: unknown) {
            const error = err instanceof Error ? err.message : String(err)
            progress.failed[entry.key] = { term: entry.term, error }
            saveProgress(progress)
            batchFailed++
            process.stdout.write('\n')
            console.error(`    ✗  "${entry.term}"  →  ${error}`)
            throw err
          }

          // Success — persist immediately so a crash doesn't lose this item
          progress.completed[entry.key] = item
          delete progress.failed[entry.key]
          saveProgress(progress)
          batchSucceeded++
          done++

          process.stdout.write(
            `\r  [${done}/${toProcess.length}] ✓  ${entry.term.slice(0, 45).padEnd(45)}`
          )

          // Proactive throttle: pause between requests to stay under rate limits
          await sleep(MIN_DELAY_MS)
          return item
        }
    )

    console.log(`\n⚡  Enriching with ${CONCURRENCY} concurrent requests…\n`)
    await runWithConcurrency(tasks, CONCURRENCY)
    process.stdout.write('\n')

    console.log(`\n📊  Batch result: ${batchSucceeded} succeeded, ${batchFailed} failed`)

    // ── Fail loud if nothing succeeded at all ──────────────────────────────
    // Prevents silently writing an empty [] to the output file when the API
    // key or model name is wrong and every single request 404s.
    if (batchSucceeded === 0 && toProcess.length > 0) {
      const sampleError = Object.values(progress.failed)[0]?.error ?? 'unknown'
      throw new Error(
        `All ${toProcess.length} enrichment requests failed.\n` +
        `  Sample error: ${sampleError}\n` +
        `  Check ANTHROPIC_API_KEY and ANTHROPIC_MODEL, then re-run.`
      )
    }
  } else {
    console.log('\n    (nothing new to enrich — writing output files)')
  }

  // ── Write output files ─────────────────────────────────────────────────────
  const allItems = Object.values(progress.completed)
  const failedItems = Object.values(progress.failed)

  // Guard: refuse to overwrite a previous good output with an empty array
  if (allItems.length === 0) {
    throw new Error(
      'No completed items to write — migration-vocab.json would be empty.\n' +
      'Fix the errors above, then re-run `npm run migrate`.'
    )
  }

  console.log('\n💾  Writing output files…')

  // public/data/migration-vocab.json — served as a static asset by Vite/Vercel
  writeJson(OUTPUT_FILE, allItems)
  console.log(`    ✓  migration-vocab.json           ${allItems.length} items written`)

  // migration-report.json
  const fullReport: MigrationReport & {
    failedCount: number
    failedItems: typeof failedItems
  } = { ...report, failedCount: failedItems.length, failedItems }
  writeJson(REPORT_FILE, fullReport)
  console.log(`    ✓  migration-report.json`)

  // ambiguous-duplicates.json
  writeJson(AMBIGUOUS_FILE, ambiguous)
  console.log(`    ✓  ambiguous-duplicates.json      ${ambiguous.length} entries`)

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log('')
  if (failedItems.length > 0) {
    console.log(`⚠   ${failedItems.length} items still failing — re-run \`npm run migrate\` to retry.`)
  } else {
    console.log(`✅  All ${allItems.length} entries enriched successfully!`)
  }

  console.log('\n' + SEP)
  console.log('  Next step: git add public/data/migration-vocab.json && git commit')
  console.log('  The app will import it automatically on first load.')
  console.log(SEP + '\n')
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`\n💥  Fatal: ${msg}\n`)
  process.exit(1)
})
