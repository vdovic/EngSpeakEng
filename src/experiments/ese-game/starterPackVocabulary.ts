import { SentenceRepairPrompt } from './sampleData'

const STARTER_PACK_INDEX_URL = '/data/starter-packs/index.json'
const STARTER_PACK_BASE_URL = '/data/starter-packs'
const MIN_PROMPTS = 6

type StarterPackDifficulty = 'B2' | 'C1' | 'Mixed'

interface StarterPackMeta {
  id: string
  difficulty: StarterPackDifficulty
}

interface StarterPackWord {
  term: string
  exampleSentence?: string
  definitionEn?: string
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  tags?: string[]
}

interface StarterPack extends StarterPackMeta {
  words: StarterPackWord[]
}

export interface SentenceRepairPromptSource {
  prompts: SentenceRepairPrompt[]
  packCount: number
  wordCount: number
}

function isB2C1Pack(meta: StarterPackMeta): boolean {
  return meta.difficulty === 'B2' || meta.difficulty === 'C1'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceTerm(sentence: string, term: string, replacement: string): string | null {
  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i')
  if (!pattern.test(sentence)) {
    return null
  }

  return sentence.replace(pattern, replacement)
}

function normaliseChoice(value: string): string {
  return value.trim().toLowerCase()
}

function uniqueChoices(choices: string[]): string[] {
  const seen = new Set<string>()
  return choices.filter((choice) => {
    const key = normaliseChoice(choice)
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function pickReplacement(word: StarterPackWord): string | null {
  const fallbackByRegister = {
    formal: 'do',
    neutral: 'use',
    conversational: 'say',
  } as const

  const [firstTag] = word.tags ?? []
  if (firstTag?.includes('connect')) {
    return 'also'
  }

  return fallbackByRegister[word.register ?? 'neutral'] ?? 'use'
}

function getDistractors(word: StarterPackWord, allWords: StarterPackWord[]): string[] {
  const sameTag = new Set((word.tags ?? []).map(normaliseChoice))
  const fromSameTag = allWords
    .filter((candidate) => candidate.term !== word.term)
    .filter((candidate) =>
      (candidate.tags ?? []).some((tag) => sameTag.has(normaliseChoice(tag))),
    )
    .map((candidate) => candidate.term)

  const fromAnyPack = allWords
    .filter((candidate) => candidate.term !== word.term)
    .map((candidate) => candidate.term)

  return uniqueChoices([...fromSameTag, ...fromAnyPack]).slice(0, 2)
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function toPrompt(
  word: StarterPackWord,
  difficulty: StarterPackDifficulty,
  allWords: StarterPackWord[],
): SentenceRepairPrompt | null {
  if (!word.exampleSentence || !word.definitionEn) {
    return null
  }

  const replacement = pickReplacement(word)
  if (!replacement || normaliseChoice(replacement) === normaliseChoice(word.term)) {
    return null
  }

  const sentence = replaceTerm(word.exampleSentence, word.term, replacement)
  if (!sentence) {
    return null
  }

  const distractors = getDistractors(word, allWords)
  const choices = shuffle(uniqueChoices([word.term, ...distractors])).slice(0, 3)
  if (choices.length < 3 || !choices.includes(word.term)) {
    return null
  }

  const context = [
    word.definitionEn,
    word.nuance,
    word.register ? `Register: ${word.register}.` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    id: `starter-pack-${difficulty.toLowerCase()}-${word.term
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`,
    sentence,
    target: replacement,
    choices,
    correctChoice: word.term,
    explanation: `"${word.term}" is the ${difficulty} choice here. ${context}`,
    difficulty,
    register: word.register,
    tags: word.tags ?? [],
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function loadB2C1SentenceRepairPrompts(): Promise<SentenceRepairPromptSource> {
  const index = await fetchJson<StarterPackMeta[]>(STARTER_PACK_INDEX_URL)
  const selectedPacks = index.filter(isB2C1Pack)

  const packs = await Promise.all(
    selectedPacks.map((pack) =>
      fetchJson<StarterPack>(`${STARTER_PACK_BASE_URL}/${pack.id}.json`),
    ),
  )

  const words = packs.flatMap((pack) => pack.words)
  const prompts = packs
    .flatMap((pack) =>
      pack.words.map((word) => toPrompt(word, pack.difficulty, words)),
    )
    .filter((prompt): prompt is SentenceRepairPrompt => prompt !== null)

  if (prompts.length < MIN_PROMPTS) {
    throw new Error(`Only ${prompts.length} B2-C1 prompts could be built`)
  }

  return {
    prompts,
    packCount: packs.length,
    wordCount: words.length,
  }
}
