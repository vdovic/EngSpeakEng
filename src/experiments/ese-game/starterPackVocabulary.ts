import { PhraseUpgradePrompt, SentenceRepairPrompt } from './sampleData'

const STARTER_PACK_INDEX_URL = '/data/starter-packs/index.json'
const STARTER_PACK_BASE_URL = '/data/starter-packs'
const MIN_PROMPTS = 6

export type StarterPackDifficulty = 'B2' | 'C1' | 'Mixed'

export interface StarterPackMeta {
  id: string
  title?: string
  theme?: string
  difficulty: StarterPackDifficulty
}

export interface StarterPackWord {
  term: string
  exampleSentence?: string
  definitionEn?: string
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  synonyms?: string[]
  tags?: string[]
}

export interface StarterPackMissionWord extends StarterPackWord {
  id: string
  packId: string
  packTitle: string
  packTheme: string
  difficulty: StarterPackDifficulty
}

interface StarterPack extends StarterPackMeta {
  words: StarterPackWord[]
}

export interface SentenceRepairPromptSource {
  prompts: SentenceRepairPrompt[]
  packCount: number
  wordCount: number
  words: StarterPackMissionWord[]
}

export interface PhraseUpgradePromptSource {
  prompts: PhraseUpgradePrompt[]
  packCount: number
  wordCount: number
  words: StarterPackMissionWord[]
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

function sentenceCaseLike(source: string, replacement: string): string {
  if (source[0] !== source[0]?.toUpperCase()) {
    return replacement
  }

  return replacement.charAt(0).toUpperCase() + replacement.slice(1)
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getWordId(packId: string, term: string): string {
  return `${packId}:${slug(term)}`
}

function selectTemptingAlternative(word: StarterPackWord): string | null {
  const candidates = [
    ...(word.synonyms ?? []),
    word.definitionEn?.split(/[;,.(]/)[0],
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.length <= 38))

  return uniqueChoices(candidates).find(
    (candidate) => normaliseChoice(candidate) !== normaliseChoice(word.term),
  ) ?? null
}

function getErrorPattern(word: StarterPackWord): {
  replacement: string
  focus: string
  reason: string
} | null {
  const term = word.term.trim()
  const [firstWord, secondWord] = term.split(/\s+/)
  const synonym = selectTemptingAlternative(word)

  if (term.includes(' on')) {
    return {
      replacement: term.replace(/\bon\b/i, ''),
      focus: 'missing preposition',
      reason: `"${term}" needs "on" before the topic in this context.`,
    }
  }

  if (term.includes(' with')) {
    return {
      replacement: term.replace(/\bwith\b/i, 'to'),
      focus: 'wrong preposition',
      reason: `"${term}" is the fixed phrase here; changing the preposition makes it sound non-native.`,
    }
  }

  if (term.includes(' to')) {
    return {
      replacement: term.replace(/\bto\b/i, 'for'),
      focus: 'wrong preposition',
      reason: `"${term}" is the natural pattern for this idea.`,
    }
  }

  if (term.includes(' of')) {
    return {
      replacement: term.replace(/\bof\b/i, 'about'),
      focus: 'wrong phrase pattern',
      reason: `"${term}" is the expected professional phrase in this sentence.`,
    }
  }

  if (term.includes(' ')) {
    return {
      replacement: synonym ?? firstWord,
      focus: 'phrase precision',
      reason: `"${term}" works as a complete expression; the shorter wording loses the intended professional meaning.`,
    }
  }

  if (word.register === 'formal' && synonym) {
    return {
      replacement: synonym,
      focus: 'register and precision',
      reason: `"${term}" is more precise and more appropriate for this formal context than the plainer alternative.`,
    }
  }

  if (secondWord) {
    return {
      replacement: firstWord,
      focus: 'phrase precision',
      reason: `"${term}" is the complete phrase expected here.`,
    }
  }

  return synonym
    ? {
        replacement: synonym,
        focus: 'word choice',
        reason: `"${term}" is the more natural choice in this exact sentence.`,
      }
    : null
}

function getDistractors(word: StarterPackWord, allWords: StarterPackWord[]): string[] {
  const sameTag = new Set((word.tags ?? []).map(normaliseChoice))
  const fromSameTag = allWords
    .filter((candidate) => candidate.term !== word.term)
    .filter((candidate) =>
      (candidate.tags ?? []).some((tag) => sameTag.has(normaliseChoice(tag))),
    )
    .flatMap((candidate) => [candidate.term, ...(candidate.synonyms ?? []).slice(0, 1)])

  const fromAnyPack = allWords
    .filter((candidate) => candidate.term !== word.term)
    .flatMap((candidate) => [candidate.term, ...(candidate.synonyms ?? []).slice(0, 1)])

  return uniqueChoices([...fromSameTag, ...fromAnyPack]).slice(0, 2)
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function toPrompt(
  word: StarterPackMissionWord,
  difficulty: StarterPackDifficulty,
  allWords: StarterPackMissionWord[],
): SentenceRepairPrompt | null {
  if (!word.exampleSentence || !word.definitionEn) {
    return null
  }

  const errorPattern = getErrorPattern(word)
  if (!errorPattern || normaliseChoice(errorPattern.replacement) === normaliseChoice(word.term)) {
    return null
  }

  const replacement = sentenceCaseLike(word.term, errorPattern.replacement)
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
    errorPattern.reason,
    word.nuance,
    `Meaning: ${word.definitionEn}`,
    word.register ? `Register: ${word.register}.` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const repairedSentence = replaceTerm(sentence, replacement, word.term) ?? word.exampleSentence

  return {
    id: `starter-pack-${word.packId}-${difficulty.toLowerCase()}-${slug(word.term)}`,
    sentence,
    target: replacement,
    choices,
    correctChoice: word.term,
    repairedSentence,
    skillFocus: errorPattern.focus,
    explanation: `${context}`,
    wrongChoiceFeedback: Object.fromEntries(
      choices
        .filter((choice) => choice !== word.term)
        .map((choice) => [
          choice,
          `"${choice}" is related vocabulary, but it does not repair this sentence as naturally as "${word.term}".`,
        ]),
    ),
    difficulty,
    register: word.register,
    tags: word.tags ?? [],
    sourceWordId: word.id,
    sourceTerm: word.term,
  }
}

function toPhraseUpgradePrompt(
  word: StarterPackMissionWord,
  difficulty: StarterPackDifficulty,
): PhraseUpgradePrompt | null {
  if (!word.exampleSentence || !word.definitionEn) {
    return null
  }

  const plainAlternative = selectTemptingAlternative(word)
  if (!plainAlternative || normaliseChoice(plainAlternative) === normaliseChoice(word.term)) {
    return null
  }

  const basicSentence = replaceTerm(
    word.exampleSentence,
    word.term,
    sentenceCaseLike(word.term, plainAlternative),
  )
  if (!basicSentence || basicSentence === word.exampleSentence) {
    return null
  }

  const vagueChoice = replaceTerm(
    word.exampleSentence,
    word.term,
    sentenceCaseLike(word.term, 'a good option'),
  )
  const overdoneChoice = `It is important to note that ${lowerFirst(word.exampleSentence)}`

  const choices = shuffle(
    uniqueChoices([
      word.exampleSentence,
      basicSentence,
      vagueChoice ?? basicSentence,
      overdoneChoice,
    ]),
  ).slice(0, 3)

  if (choices.length < 3 || !choices.includes(word.exampleSentence)) {
    return null
  }

  const focus = word.term.includes(' ') ? 'professional phrase upgrade' : 'precise vocabulary'
  const register = word.register ?? 'neutral'
  const nuance = [
    word.nuance,
    `Register: ${register}.`,
    `Meaning: ${word.definitionEn}`,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    id: `starter-pack-upgrade-${word.packId}-${difficulty.toLowerCase()}-${slug(word.term)}`,
    basicSentence,
    choices,
    correctChoice: word.exampleSentence,
    upgradedSentence: word.exampleSentence,
    whyStronger: `"${word.term}" is more precise and natural in this context than the plainer wording.`,
    nuance,
    skillFocus: focus,
    weakChoiceFeedback: Object.fromEntries(
      choices
        .filter((choice) => choice !== word.exampleSentence)
        .map((choice) => [
          choice,
          'This version is understandable, but it is less precise or less natural than the strongest upgrade.',
        ]),
    ),
    difficulty,
    register,
    tags: word.tags ?? [],
    sourceWordId: word.id,
    sourceTerm: word.term,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function loadStarterPackMissionVocabulary(): Promise<{
  packs: StarterPackMeta[]
  words: StarterPackMissionWord[]
}> {
  const index = await fetchJson<StarterPackMeta[]>(STARTER_PACK_INDEX_URL)
  const selectedPacks = index.filter(isB2C1Pack)

  const packs = await Promise.all(
    selectedPacks.map((pack) =>
      fetchJson<StarterPack>(`${STARTER_PACK_BASE_URL}/${pack.id}.json`),
    ),
  )

  const words = packs.flatMap((pack) =>
    pack.words.map((word) => ({
      ...word,
      id: getWordId(pack.id, word.term),
      packId: pack.id,
      packTitle: pack.title ?? pack.id,
      packTheme: pack.theme ?? pack.title ?? pack.id,
      difficulty: pack.difficulty,
    })),
  )

  return {
    packs: selectedPacks,
    words,
  }
}

export async function loadB2C1SentenceRepairPrompts(): Promise<SentenceRepairPromptSource> {
  const source = await loadStarterPackMissionVocabulary()

  const prompts = source.words
    .map((word) => toPrompt(word, word.difficulty, source.words))
    .filter((prompt): prompt is SentenceRepairPrompt => prompt !== null)

  if (prompts.length < MIN_PROMPTS) {
    throw new Error(`Only ${prompts.length} B2-C1 prompts could be built`)
  }

  return {
    prompts,
    packCount: source.packs.length,
    wordCount: source.words.length,
    words: source.words,
  }
}

export async function loadB2C1PhraseUpgradePrompts(): Promise<PhraseUpgradePromptSource> {
  const source = await loadStarterPackMissionVocabulary()

  const prompts = source.words
    .map((word) => toPhraseUpgradePrompt(word, word.difficulty))
    .filter((prompt): prompt is PhraseUpgradePrompt => prompt !== null)

  if (prompts.length < MIN_PROMPTS) {
    throw new Error(`Only ${prompts.length} B2-C1 phrase upgrade prompts could be built`)
  }

  return {
    prompts,
    packCount: source.packs.length,
    wordCount: source.words.length,
    words: source.words,
  }
}
