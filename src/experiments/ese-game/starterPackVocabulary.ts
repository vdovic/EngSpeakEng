import { PhraseUpgradePrompt, SentenceRepairPrompt } from './sampleData'

const MIGRATION_VOCAB_URL = '/data/migration-vocab.json'
const STARTER_PACK_INDEX_URL = '/data/starter-packs/index.json'
const STARTER_PACK_BASE_URL = '/data/starter-packs'
const MIN_PROMPTS = 6

export type StarterPackDifficulty = 'B2' | 'C1' | 'Mixed'
export type EseVocabularyType = 'word' | 'phrase' | 'chunk'
export type EseVocabularySource = 'migration-vocab' | 'starter-pack'

export interface StarterPackMeta {
  id: string
  title?: string
  theme?: string
  difficulty: StarterPackDifficulty
}

export interface StarterPackWord {
  term: string
  type?: EseVocabularyType
  cefr?: StarterPackDifficulty
  difficulty?: StarterPackDifficulty
  exampleSentence?: string
  workSentence?: string
  definitionEn?: string
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  synonyms?: string[]
  tags?: string[]
  partOfSpeech?: string
  collocations?: string[]
  commonMistakes?: string
}

export interface StarterPackMissionWord extends StarterPackWord {
  id: string
  packId: string
  packTitle: string
  packTheme: string
  difficulty: StarterPackDifficulty
  source: EseVocabularySource
  categories: string[]
  searchableText: string
  qualityScore: number
}

interface StarterPack extends StarterPackMeta {
  words: StarterPackWord[]
}

interface MigrationVocabularyItem extends StarterPackWord {
  id: string
  status?: string
  archived?: boolean
  generationStatus?: string
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

export interface FullLibraryVocabularySource {
  packs: StarterPackMeta[]
  words: StarterPackMissionWord[]
}

let vocabularyPromise: Promise<FullLibraryVocabularySource> | null = null
let sentencePromptPromise: Promise<SentenceRepairPromptSource> | null = null
let phrasePromptPromise: Promise<PhraseUpgradePromptSource> | null = null

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
  if (value.startsWith('I ')) {
    return value
  }

  return value.charAt(0).toLowerCase() + value.slice(1)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getWordId(sourceId: string, term: string): string {
  return `${sourceId}:${slug(term)}`
}

function compactText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function compactArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : []
}

function inferType(word: StarterPackWord): EseVocabularyType {
  if (word.type === 'chunk' || word.type === 'phrase' || word.type === 'word') {
    return word.type
  }

  return word.term.trim().includes(' ') ? 'phrase' : 'word'
}

function buildSearchableText(word: StarterPackWord, packTheme?: string): string {
  return [
    word.term,
    word.definitionEn,
    word.exampleSentence,
    word.workSentence,
    word.nuance,
    word.register,
    word.partOfSpeech,
    packTheme,
    ...(word.tags ?? []),
    ...(word.synonyms ?? []),
    ...(word.collocations ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value))
}

function getCategories(word: StarterPackWord, packTheme?: string): string[] {
  const text = buildSearchableText(word, packTheme)
  const type = inferType(word)
  const categories = new Set<string>()

  if (includesAny(text, ['business', 'professional', 'client', 'stakeholder', 'manager', 'team', 'project', 'office', 'workplace'])) {
    categories.add('business')
  }
  if (includesAny(text, ['meeting', 'presentation', 'agenda', 'discussion', 'recap', 'decision', 'follow-up'])) {
    categories.add('meetings')
  }
  if (includesAny(text, ['email', 'writing', 'written', 'report', 'document', 'message', 'formal phrase'])) {
    categories.add('email')
  }
  if (includesAny(text, ['fluency', 'conversation', 'natural', 'idiom', 'discourse', 'connector'])) {
    categories.add('fluency')
  }
  if (includesAny(text, ['phrasal-verb', 'phrasal verb']) || (word.tags ?? []).includes('phrasal-verb')) {
    categories.add('phrasal verbs')
  }
  if (type === 'chunk' || (word.tags ?? []).includes('chunks')) {
    categories.add('chunks')
  }
  if (type === 'phrase' || word.term.trim().includes(' ')) {
    categories.add('phrases')
  }
  if (categories.size === 0) {
    categories.add(type === 'word' ? 'business' : 'phrases')
  }

  return Array.from(categories)
}

function explicitDifficulty(word: StarterPackWord): StarterPackDifficulty | undefined {
  const value = word.cefr ?? word.difficulty
  return value === 'B2' || value === 'C1' ? value : undefined
}

function estimateDifficulty(word: StarterPackWord): StarterPackDifficulty {
  const text = buildSearchableText(word)
  let score = 0

  const explicit = explicitDifficulty(word)
  if (explicit) {
    return explicit
  }

  if (word.register === 'formal') {
    score += 2
  }
  if (word.register === 'conversational') {
    score -= 1
  }
  if (inferType(word) !== 'word') {
    score += 1
  }
  if (word.term.length > 12 || word.term.split(/\s+/).length >= 3) {
    score += 1
  }
  if (word.nuance && word.nuance.length > 120) {
    score += 1
  }
  if (includesAny(text, ['formal', 'precise', 'nuance', 'academic', 'legal', 'strategic', 'idiom', 'phrasal-verb', 'collocation'])) {
    score += 1
  }
  if ((word.tags ?? []).some((tag) => ['c1', 'advanced', 'academic', 'formal'].includes(normaliseChoice(tag)))) {
    score += 2
  }
  if ((word.tags ?? []).some((tag) => ['b1', 'a2', 'beginner'].includes(normaliseChoice(tag)))) {
    score -= 2
  }
  if (includesAny(text, ['easy', 'simple', 'everyday', 'casual'])) {
    score -= 1
  }

  return score >= 2 ? 'C1' : 'B2'
}

function getQualityScore(word: StarterPackWord): number {
  let score = 0

  if (word.workSentence) {
    score += 3
  }
  if (word.exampleSentence) {
    score += 2
  }
  if (word.definitionEn) {
    score += 2
  }
  if (word.nuance) {
    score += 1
  }
  if (word.register) {
    score += 1
  }
  if ((word.tags ?? []).length) {
    score += 1
  }
  if ((word.synonyms ?? []).length) {
    score += 1
  }
  if ((word.collocations ?? []).length) {
    score += 1
  }

  return score
}

function getTheme(word: StarterPackWord, packTheme?: string): string {
  if (packTheme) {
    return packTheme
  }

  const categories = getCategories(word)
  if (categories.includes('meetings')) {
    return 'Meetings & Presentations'
  }
  if (categories.includes('email')) {
    return 'Written Communication'
  }
  if (categories.includes('phrasal verbs')) {
    return 'Phrasal Verbs'
  }
  if (categories.includes('fluency')) {
    return 'Everyday Fluency'
  }
  if (categories.includes('chunks') || categories.includes('phrases')) {
    return 'Phrases & Chunks'
  }
  return 'Business & Professional'
}

function normalizeRegister(value: unknown): StarterPackWord['register'] {
  return value === 'formal' || value === 'neutral' || value === 'conversational'
    ? value
    : 'neutral'
}

function normalizeWord(
  word: StarterPackWord,
  source: EseVocabularySource,
  sourceId: string,
  packTitle: string,
  packTheme: string,
  difficulty?: StarterPackDifficulty,
): StarterPackMissionWord | null {
  const term = compactText(word.term)
  const definitionEn = compactText(word.definitionEn)
  const exampleSentence = compactText(word.exampleSentence)
  const workSentence = compactText(word.workSentence)

  if (!term || !definitionEn || (!exampleSentence && !workSentence)) {
    return null
  }

  const normalized: StarterPackWord = {
    ...word,
    term,
    type: inferType(word),
    cefr: explicitDifficulty(word),
    difficulty: explicitDifficulty(word),
    exampleSentence,
    workSentence,
    definitionEn,
    nuance: compactText(word.nuance),
    register: normalizeRegister(word.register),
    synonyms: compactArray(word.synonyms),
    tags: compactArray(word.tags),
    partOfSpeech: compactText(word.partOfSpeech),
    collocations: compactArray(word.collocations),
    commonMistakes: compactText(word.commonMistakes),
  }
  const theme = getTheme(normalized, packTheme)
  const categories = getCategories(normalized, theme)

  return {
    ...normalized,
    id: getWordId(sourceId, term),
    packId: sourceId,
    packTitle,
    packTheme: theme,
    difficulty: difficulty === 'Mixed' ? estimateDifficulty(normalized) : difficulty ?? estimateDifficulty(normalized),
    source,
    categories,
    searchableText: buildSearchableText(normalized, theme),
    qualityScore: getQualityScore(normalized),
  }
}

function selectTemptingAlternative(word: StarterPackWord): string | null {
  const candidates = [
    ...(word.synonyms ?? []),
    word.definitionEn?.split(/[;,.(]/)[0],
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.length <= 42))

  return uniqueChoices(candidates).find(
    (candidate) => normaliseChoice(candidate) !== normaliseChoice(word.term),
  ) ?? null
}

function getPlainUpgradeAlternative(word: StarterPackWord): string | null {
  const synonym = selectTemptingAlternative(word)
  if (synonym) {
    return synonym
  }

  const definitionLead = word.definitionEn
    ?.split(/[;.(]/)[0]
    ?.replace(/^(to|a|an|the)\s+/i, '')
    .trim()

  if (
    definitionLead &&
    definitionLead.length >= 4 &&
    definitionLead.length <= 58 &&
    !definitionLead.includes(':') &&
    normaliseChoice(definitionLead) !== normaliseChoice(word.term)
  ) {
    return definitionLead
  }

  return null
}

function replaceParticle(term: string, replacementParticle: string): string | null {
  const parts = term.trim().split(/\s+/)
  if (parts.length < 2) {
    return null
  }

  return [...parts.slice(0, -1), replacementParticle].join(' ')
}

function getErrorPattern(word: StarterPackWord): {
  replacement: string
  focus: string
  reason: string
} | null {
  const term = word.term.trim()
  const [firstWord] = term.split(/\s+/)
  const synonym = selectTemptingAlternative(word)

  if ((word.type === 'chunk' || (word.tags ?? []).includes('idiom')) && term.includes(' ')) {
    return {
      replacement: synonym ?? firstWord,
      focus: 'idiom and chunk precision',
      reason: `"${term}" works as a complete expression; swapping out one part or using a plainer substitute weakens the idiom.`,
    }
  }

  if (term.includes(' on')) {
    return {
      replacement: term.replace(/\bon\b/i, ''),
      focus: 'verb + preposition pattern',
      reason: `"${term}" needs "on" before the topic in this context.`,
    }
  }

  if (term.includes(' with')) {
    return {
      replacement: term.replace(/\bwith\b/i, 'to'),
      focus: 'fixed phrase pattern',
      reason: `"${term}" is the fixed phrase here; changing the preposition makes it sound non-native.`,
    }
  }

  if (term.includes(' to')) {
    return {
      replacement: term.replace(/\bto\b/i, 'for'),
      focus: 'collocation pattern',
      reason: `"${term}" is the natural pattern for this idea.`,
    }
  }

  if (term.includes(' of')) {
    return {
      replacement: term.replace(/\bof\b/i, 'about'),
      focus: 'phrase precision',
      reason: `"${term}" is the expected professional phrase in this sentence.`,
    }
  }

  const particleAlternatives: Record<string, string> = {
    up: 'out',
    out: 'up',
    off: 'out',
    in: 'on',
    into: 'in',
    on: 'in',
    over: 'through',
    through: 'over',
    back: 'again',
    away: 'off',
    down: 'up',
  }
  const lastWord = term.split(/\s+/).at(-1)?.toLowerCase()
  const replacementParticle = lastWord ? particleAlternatives[lastWord] : undefined
  const particleReplacement = replacementParticle
    ? replaceParticle(term, replacementParticle)
    : null

  if (
    particleReplacement &&
    ((word.tags ?? []).includes('phrasal-verb') || term.split(/\s+/).length === 2)
  ) {
    return {
      replacement: particleReplacement,
      focus: 'phrasal verb particle',
      reason: `"${term}" needs this particle in the source context; changing it creates the wrong idiom or direction.`,
    }
  }

  if (term.includes(' ')) {
    return {
      replacement: synonym ?? firstWord,
      focus: 'phrase precision',
      reason: `"${term}" works as a complete expression; the shorter wording loses the intended meaning.`,
    }
  }

  return synonym
    ? {
        replacement: synonym,
        focus: word.register === 'formal' ? 'register and precision' : 'word choice',
        reason: `"${term}" is the more natural choice in this exact sentence.`,
      }
    : null
}

function getDistractors(word: StarterPackMissionWord, allWords: StarterPackMissionWord[]): string[] {
  const sameCategory = new Set(word.categories)
  const sameTag = new Set((word.tags ?? []).map(normaliseChoice))
  const samePartOfSpeech = compactText(word.partOfSpeech)
  const sourceDistractors = [...(word.synonyms ?? [])]

  const fromSameArea = allWords
    .filter((candidate) => candidate.id !== word.id)
    .filter((candidate) => candidate.type === word.type)
    .filter((candidate) => candidate.difficulty === word.difficulty)
    .filter((candidate) =>
      samePartOfSpeech ? candidate.partOfSpeech === samePartOfSpeech : true,
    )
    .filter((candidate) =>
      candidate.categories.some((category) => sameCategory.has(category)) ||
      (candidate.tags ?? []).some((tag) => sameTag.has(normaliseChoice(tag))),
    )
    .filter((candidate) => Math.abs(candidate.term.length - word.term.length) <= 12)
    .flatMap((candidate) => [candidate.term])

  return uniqueChoices([...sourceDistractors, ...fromSameArea])
    .filter((choice) => isUsefulDistractor(choice, word))
    .slice(0, 6)
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function buildChoices(correctChoice: string, alternatives: string[], count = 3): string[] {
  const distractors = uniqueChoices(alternatives)
    .filter((choice) => normaliseChoice(choice) !== normaliseChoice(correctChoice))

  return shuffle([correctChoice, ...shuffle(distractors).slice(0, count - 1)])
}

function hasStrongPromptContext(word: StarterPackMissionWord): boolean {
  return Boolean(
    word.definitionEn &&
      (word.workSentence || word.exampleSentence) &&
      (
        word.nuance ||
        word.commonMistakes ||
        word.register !== 'neutral' ||
        (word.synonyms ?? []).length >= 2 ||
        (word.collocations ?? []).length > 0 ||
        (word.tags ?? []).length > 0
      ),
  )
}

function isUsefulDistractor(choice: string, word: StarterPackMissionWord): boolean {
  const normalized = normaliseChoice(choice)
  const choiceWordCount = choice.trim().split(/\s+/).length
  const targetWordCount = word.term.trim().split(/\s+/).length
  const weakSingleWords = new Set([
    'be',
    'do',
    'get',
    'go',
    'just',
    'make',
    'take',
    'thing',
    'use',
    'what',
  ])

  if (choice.length < 4 || weakSingleWords.has(normalized)) {
    return false
  }

  if (targetWordCount >= 2 && choiceWordCount === 1 && choice.length < 7) {
    return false
  }

  return choiceWordCount <= targetWordCount + 1
}

function hasNaturalIdiomFrame(sentence: string, term: string): boolean {
  const normalizedTerm = normaliseChoice(term)
  const normalizedSentence = normaliseChoice(sentence)

  if (normalizedTerm === 'around the corner') {
    return /\b(is|are|was|were|be|been|being|seems|looks|feels)\s+around the corner\b/.test(normalizedSentence)
  }

  return true
}

function bestSentence(word: StarterPackMissionWord): string | undefined {
  return word.workSentence ?? word.exampleSentence
}

function buildContext(word: StarterPackMissionWord, extra?: string): string {
  return [
    extra,
    word.nuance,
    word.register ? `Register: ${word.register}.` : undefined,
    word.tags?.length ? `Tags: ${word.tags.slice(0, 3).join(', ')}.` : undefined,
    `Meaning: ${word.definitionEn}`,
  ]
    .filter(Boolean)
    .join(' ')
}

function buildPromptId(prefix: string, word: StarterPackMissionWord): string {
  return `${prefix}-${word.id}`
}

function toPrompt(
  word: StarterPackMissionWord,
  difficulty: StarterPackDifficulty,
  allWords: StarterPackMissionWord[],
): SentenceRepairPrompt | null {
  const sentenceSource = bestSentence(word)
  if (!sentenceSource || !hasStrongPromptContext(word)) {
    return null
  }
  if (!hasNaturalIdiomFrame(sentenceSource, word.term)) {
    return null
  }

  const errorPattern = getErrorPattern(word)
  if (!errorPattern || normaliseChoice(errorPattern.replacement) === normaliseChoice(word.term)) {
    return null
  }

  const replacement = sentenceCaseLike(word.term, errorPattern.replacement)
  const sentence = replaceTerm(sentenceSource, word.term, replacement)
  if (!sentence || sentence === sentenceSource || sentence.includes('  ')) {
    return null
  }

  const distractors = getDistractors(word, allWords)
  const choices = buildChoices(word.term, distractors)
  if (choices.length < 3) {
    return null
  }

  const repairedSentence = replaceTerm(sentence, replacement, word.term) ?? sentenceSource

  return {
    id: buildPromptId('full-library-repair', word),
    sentence,
    target: replacement,
    choices,
    correctChoice: word.term,
    repairedSentence,
    skillFocus: errorPattern.focus,
    explanation: buildContext(
      word,
      `${errorPattern.reason} Source: ${word.workSentence ? 'work context' : 'example context'}.`,
    ),
    wrongChoiceFeedback: Object.fromEntries(
      choices
        .filter((choice) => choice !== word.term)
        .map((choice) => [
          choice,
          `"${choice}" is related, but it does not fit the collocation, register, or meaning of this sentence as well as "${word.term}".`,
        ]),
    ),
    difficulty,
    register: word.register,
    tags: uniqueChoices([...(word.tags ?? []), ...word.categories]).slice(0, 4),
    sourceWordId: word.id,
    sourceTerm: word.term,
  }
}

function toPhraseUpgradePrompt(
  word: StarterPackMissionWord,
  difficulty: StarterPackDifficulty,
): PhraseUpgradePrompt | null {
  const sentenceSource = bestSentence(word)
  if (!sentenceSource || !hasStrongPromptContext(word)) {
    return null
  }

  const plainAlternative = getPlainUpgradeAlternative(word)
  if (!plainAlternative || normaliseChoice(plainAlternative) === normaliseChoice(word.term)) {
    return null
  }

  const basicSentence = replaceTerm(
    sentenceSource,
    word.term,
    sentenceCaseLike(word.term, plainAlternative),
  )
  if (
    !basicSentence ||
    basicSentence === sentenceSource ||
    basicSentence.includes('  ') ||
    !hasNaturalIdiomFrame(sentenceSource, word.term)
  ) {
    return null
  }

  const overdoneChoice = `It is important to note that ${lowerFirst(sentenceSource)}`

  const choices = buildChoices(
    sentenceSource,
    [
      basicSentence,
      overdoneChoice,
    ],
  )

  if (choices.length < 3) {
    return null
  }

  const focus = word.type === 'word' ? 'precise vocabulary' : 'natural chunk or phrase'

  return {
    id: buildPromptId('full-library-upgrade', word),
    basicSentence,
    choices,
    correctChoice: sentenceSource,
    upgradedSentence: sentenceSource,
    whyStronger: [
      `"${word.term}" gives the sentence stronger ${word.register === 'formal' ? 'professional register' : 'natural precision'} than the plainer wording.`,
      word.nuance,
      word.workSentence ? 'The source sentence comes from a workplace context.' : undefined,
    ].filter(Boolean).join(' '),
    nuance: buildContext(word),
    skillFocus: focus,
    weakChoiceFeedback: Object.fromEntries(
      choices
        .filter((choice) => choice !== sentenceSource)
        .map((choice) => [
          choice,
          choice === overdoneChoice
            ? 'This version is grammatically possible, but the framing is wordy and less direct than the stronger professional sentence.'
            : 'This version is understandable, but it loses some register, precision, or natural collocation from the stronger option.',
        ]),
    ),
    difficulty,
    register: word.register,
    tags: uniqueChoices([...(word.tags ?? []), ...word.categories]).slice(0, 4),
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

async function loadFullLibraryVocabulary(): Promise<FullLibraryVocabularySource> {
  const [migrationVocabulary, index] = await Promise.all([
    fetchJson<MigrationVocabularyItem[]>(MIGRATION_VOCAB_URL),
    fetchJson<StarterPackMeta[]>(STARTER_PACK_INDEX_URL),
  ])
  const selectedPacks = index.filter(isB2C1Pack)
  const packs = await Promise.all(
    selectedPacks.map((pack) =>
      fetchJson<StarterPack>(`${STARTER_PACK_BASE_URL}/${pack.id}.json`),
    ),
  )

  const starterWords = packs.flatMap((pack) =>
    pack.words
      .map((word) =>
        normalizeWord(
          word,
          'starter-pack',
          pack.id,
          pack.title ?? pack.id,
          pack.theme ?? pack.title ?? pack.id,
          pack.difficulty,
        ),
      )
      .filter((word): word is StarterPackMissionWord => word !== null),
  )

  const migrationWords = migrationVocabulary
    .filter((word) => !word.archived && word.generationStatus !== 'failed')
    .map((word) =>
      normalizeWord(
        word,
        'migration-vocab',
        'migration-vocab',
        'Full Vocabulary Library',
        '',
      ),
    )
    .filter((word): word is StarterPackMissionWord => word !== null)

  const byTerm = new Map<string, StarterPackMissionWord>()
  for (const word of [...migrationWords, ...starterWords]) {
    const key = normaliseChoice(word.term)
      const existing = byTerm.get(key)
      if (!existing) {
        byTerm.set(key, word)
        continue
      }

      const preferred = word.qualityScore > existing.qualityScore ? word : existing
      const fallback = preferred.id === word.id ? existing : word
      byTerm.set(key, {
        ...fallback,
        ...preferred,
        id: existing.id,
        source: existing.source === 'starter-pack' || word.source === 'starter-pack'
          ? 'starter-pack'
          : preferred.source,
        categories: uniqueChoices([...existing.categories, ...word.categories]),
        tags: uniqueChoices([...(existing.tags ?? []), ...(word.tags ?? [])]),
        synonyms: uniqueChoices([...(existing.synonyms ?? []), ...(word.synonyms ?? [])]),
        searchableText: `${existing.searchableText} ${word.searchableText}`,
        qualityScore: Math.max(existing.qualityScore, word.qualityScore),
      })
  }

  return {
    packs: selectedPacks,
    words: Array.from(byTerm.values()),
  }
}

export async function loadStarterPackMissionVocabulary(): Promise<FullLibraryVocabularySource> {
  vocabularyPromise ??= loadFullLibraryVocabulary()
  return vocabularyPromise
}

export async function loadB2C1SentenceRepairPrompts(): Promise<SentenceRepairPromptSource> {
  sentencePromptPromise ??= loadStarterPackMissionVocabulary().then((source) => {
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
  })

  return sentencePromptPromise
}

export async function loadB2C1PhraseUpgradePrompts(): Promise<PhraseUpgradePromptSource> {
  phrasePromptPromise ??= loadStarterPackMissionVocabulary().then((source) => {
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
  })

  return phrasePromptPromise
}
