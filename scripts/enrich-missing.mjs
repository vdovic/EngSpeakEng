/**
 * scripts/enrich-missing.mjs
 *
 * Calls the Anthropic API for every item that is missing enrichment,
 * then writes the results to public/enrichment-patch.json so the
 * browser can fetch it and patch IndexedDB.
 *
 * Usage:  node scripts/enrich-missing.mjs
 */

import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const API_KEY = process.env.ANTHROPIC_API_KEY
if (!API_KEY) { console.error('ANTHROPIC_API_KEY env var is required'); process.exit(1) }
const MODEL   = 'claude-haiku-4-5'

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
  "relatedPhrases": ["2–4 related phrases, idioms, or expressions that share meaning or context"],
  "etymology": "Brief etymology if memorable and helpful; empty string otherwise",
  "memoryCue": "A vivid mnemonic, image, or memory hook",
  "commonMistakes": "The most common learner error or confusion; empty string if none",
  "realLifeTask": "One specific, actionable challenge — e.g. Say this in your next standup when describing a blocker."
}`

// All 47 items that need enrichment
const ITEMS = [
  {"id":"09a8adeb-a2aa-47fa-9f45-1216fdc7938a","term":"conclude","type":"word"},
  {"id":"0ad0f223-6067-4e03-ba8c-657a66a03d1d","term":"show of hands","type":"phrase"},
  {"id":"169df104-f583-4da7-a01e-3491648fdd97","term":"verbatim","type":"word"},
  {"id":"174c52f5-1731-4edf-96c4-ddcc2ae198cd","term":"quorum","type":"word"},
  {"id":"1d9d3c53-7cb5-4ddd-969b-05a62a84e760","term":"build on","type":"phrase"},
  {"id":"20109092-9fad-4a5a-9935-17244f8a1454","term":"any other business","type":"phrase"},
  {"id":"20f03b63-e9f9-4dd6-86e3-b2f5ad075a1a","term":"prick","type":"word"},
  {"id":"251d2ffd-2ad2-425b-9bde-ea179a1306f8","term":"reiterate","type":"word"},
  {"id":"27ddc171-1bca-4439-a304-004e31ee5908","term":"illustrate","type":"word"},
  {"id":"295581f4-4f18-4295-b4ad-7fdf44e35063","term":"parking lot","type":"phrase"},
  {"id":"2a40e6bb-4140-4ac6-93bc-ab4cd05738a1","term":"close the loop","type":"phrase"},
  {"id":"2f588c1b-7e40-4178-b364-220fc76c31b2","term":"exact","type":"word"},
  {"id":"332961bb-d7e3-4358-87ec-038898525447","term":"agenda item","type":"phrase"},
  {"id":"35bf7678-63c9-4b72-92a5-42f53beaec52","term":"raise","type":"word"},
  {"id":"387d7383-d3d3-47ea-9cbf-2271f4b8eea0","term":"unanimous","type":"word"},
  {"id":"3f1b4657-7043-48da-b490-7bc6615fffb0","term":"defer","type":"word"},
  {"id":"455e1e2b-f634-4e29-b8a2-5f4e8eed13d9","term":"take the floor","type":"phrase"},
  {"id":"49b31519-8727-4c78-9af6-c60e5b4f4124","term":"adjourn","type":"word"},
  {"id":"4ed52423-0dc6-4696-9ea4-434a57b53884","term":"move on","type":"phrase"},
  {"id":"64a57ab9-5d93-4f7d-94d6-d704a6b3c473","term":"open the floor","type":"phrase"},
  {"id":"66d138b2-cdbe-4c04-9877-9a56a72becd2","term":"bail","type":"word"},
  {"id":"673b2751-76e8-4a4f-85f6-effad636cf64","term":"circling back","type":"phrase"},
  {"id":"67dd528f-5ec2-4590-a46a-3ff6835b0e49","term":"minutes","type":"word"},
  {"id":"67fe3b6c-4ef1-4bd5-9ddc-cf5c2c2f72f2","term":"table","type":"word"},
  {"id":"6b3f95e9-501a-44ab-8a0a-47f5c9cf31a6","term":"outline","type":"word"},
  {"id":"7209e6ce-345c-4bf2-aff3-eef62d80266f","term":"blow out","type":"phrase"},
  {"id":"74250968-6b5b-4fe0-ac83-3159b9859c6b","term":"wrath","type":"word"},
  {"id":"79e92bd0-396c-45a8-bbdc-9198de05a77d","term":"brief","type":"word"},
  {"id":"85e87d29-c7ad-4ddb-8fba-1468443e0b15","term":"walk through","type":"phrase"},
  {"id":"8883ae92-602f-4ab6-8a41-ab8d8bacda6a","term":"pick up on","type":"phrase"},
  {"id":"941cb9ee-d1d1-454e-bdd3-d677cf5a7abf","term":"adjourn sine die","type":"phrase"},
  {"id":"94453b19-c2d8-4200-8bdc-18943d8c863b","term":"address","type":"word"},
  {"id":"971ddc29-e9dd-4ae2-aa44-0b72e06f3ad1","term":"highlight","type":"word"},
  {"id":"9ad562b1-adb2-4377-be9b-682abf1488d4","term":"showcase","type":"word"},
  {"id":"9cc7b8db-9bb3-4928-999a-f5c4aeefe6bf","term":"transition","type":"word"},
  {"id":"9d9b6733-3b4b-4152-98ba-ae2716b0fe65","term":"ground rules","type":"phrase"},
  {"id":"a361827f-7431-4c39-bcd0-af827baaa9b5","term":"jerk","type":"word"},
  {"id":"a4b3805d-043d-4181-8485-1bfc852c9fa9","term":"clarify","type":"word"},
  {"id":"b67c412a-cac5-471c-85c9-ca416c9ca630","term":"facilitate","type":"word"},
  {"id":"c7a1b1a0-cbe1-46b1-a482-9212b475d777","term":"convene","type":"word"},
  {"id":"cea6e721-dc07-4862-8735-68912d28aa92","term":"action point","type":"phrase"},
  {"id":"d523a8c6-19f0-45a5-8a52-bb70102336eb","term":"run through","type":"phrase"},
  {"id":"d84a4831-7a47-42e5-b325-8451c10bee68","term":"elaborate","type":"word"},
  {"id":"e2aad67e-c5d6-40d1-92f6-9585d56a4877","term":"on the same page","type":"phrase"},
  {"id":"f4715a9b-5ecf-40be-915b-9f2cd2d378f3","term":"propose","type":"word"},
  {"id":"fb738b8c-4bf5-4384-a767-b6e569724f96","term":"grow up","type":"phrase"},
  {"id":"fe42029a-e796-4663-a7a3-8f95c7aa5a4b","term":"pop","type":"word"},
]

const client = new Anthropic({ apiKey: API_KEY })

async function enrichOne(item) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Generate a vocabulary study card for the ${item.type}: "${item.term}"` }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

async function run() {
  const results = []
  const CONCURRENCY = 5
  const delay = ms => new Promise(r => setTimeout(r, ms))

  for (let i = 0; i < ITEMS.length; i += CONCURRENCY) {
    const batch = ITEMS.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(batch.map(enrichOne))

    batchResults.forEach((res, j) => {
      const item = batch[j]
      if (res.status === 'fulfilled') {
        results.push({ id: item.id, term: item.term, enriched: res.value })
        console.log(`  ✓ ${item.term}`)
      } else {
        console.error(`  ✗ ${item.term}: ${res.reason?.message ?? res.reason}`)
      }
    })

    const done = Math.min(i + CONCURRENCY, ITEMS.length)
    console.log(`[${done}/${ITEMS.length}] batch done`)
    if (done < ITEMS.length) await delay(500)
  }

  // Write results to public/ so the browser can fetch /enrichment-patch.json
  const outDir = join(__dir, '..', 'public')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'enrichment-patch.json')
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
  console.log(`\nWrote ${results.length} enriched items → public/enrichment-patch.json`)
  console.log('Now open the browser console and run the patch script.')
}

run().catch(err => { console.error(err); process.exit(1) })
