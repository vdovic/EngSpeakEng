import { StarterPackMissionWord } from './starterPackVocabulary'

export type RecallEvaluationStatus =
  | 'correct'
  | 'accepted-synonym'
  | 'partial'
  | 'wrong-register'
  | 'incorrect'

export interface RecallPrompt {
  id: string
  sourceWordId: string
  sourceTerm: string
  sentence: string
  target: string
  answerLength: number
  meaningHint: string
  nuanceHint: string
  firstLetterHint?: string
  acceptedAnswers: string[]
  saferAlternatives: string[]
  register?: StarterPackMissionWord['register']
  difficulty: StarterPackMissionWord['difficulty']
  tags: string[]
}

export interface RecallEvaluation {
  status: RecallEvaluationStatus
  isCorrect: boolean
  score: 0 | 0.5 | 1
  title: string
  feedback: string
  betterAnswer: string
}

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function withoutLeadingArticle(value: string): string {
  return value.replace(/^(a|an|the)\s+/i, '').trim()
}

function answerKeys(value: string): string[] {
  const normalized = normalizeAnswer(value)
  const articleFree = withoutLeadingArticle(normalized)
  return Array.from(new Set([normalized, articleFree].filter(Boolean)))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function maskTarget(sentence: string, target: string): string | null {
  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i')
  if (!pattern.test(sentence)) {
    return null
  }

  return sentence.replace(pattern, '_____')
}

function hasRecallContext(word: StarterPackMissionWord): boolean {
  return Boolean(
    word.definitionEn &&
      (word.workSentence || word.exampleSentence) &&
      (
        word.type === 'phrase' ||
        word.type === 'chunk' ||
        word.categories.includes('phrasal verbs')
      ) &&
      word.qualityScore >= 8 &&
      (word.nuance || word.commonMistakes) &&
      ((word.tags ?? []).length > 0 || (word.collocations ?? []).length > 0),
  )
}

function contextRecallPrompt(sentence: string, word: StarterPackMissionWord): string {
  const context = sentence.replace(/\s+/g, ' ').trim()
  const register = word.register ? `${word.register} ` : ''
  return `Use the ${register}expression for this idea: ${word.definitionEn} Context: ${context} Expression: _____`
}

function bestSentence(word: StarterPackMissionWord): string | undefined {
  return word.workSentence ?? word.exampleSentence
}

function isSafeAcceptedSynonym(word: StarterPackMissionWord, synonym: string): boolean {
  const normalized = normalizeAnswer(synonym)
  const target = normalizeAnswer(word.term)

  if (!normalized || normalized === target || normalized.length > 36) {
    return false
  }
  if (normalized.split(/\s+/).length > 4) {
    return false
  }
  if (word.type !== 'word' && normalized.split(/\s+/).length !== target.split(/\s+/).length) {
    return false
  }
  if (['thing', 'stuff', 'good option', 'bad thing', 'issue'].includes(normalized)) {
    return false
  }

  return true
}

function nextWordAfterBlank(sentence: string): string | null {
  const [, afterBlank] = sentence.split('_____')
  const nextWord = afterBlank?.trim().match(/^[a-z]+/i)?.[0]
  return nextWord ? nextWord.toLowerCase() : null
}

function acceptedAnswers(word: StarterPackMissionWord, clozeSentence: string): string[] {
  const nextWord = nextWordAfterBlank(clozeSentence)
  const fixedPrepositionFollows =
    word.type === 'word' &&
    Boolean(nextWord && ['by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with'].includes(nextWord))
  const safeSynonyms = (word.synonyms ?? []).filter((synonym) =>
    isSafeAcceptedSynonym(word, synonym) &&
      !fixedPrepositionFollows &&
      !normalizeAnswer(synonym).split(/\s+/).some((part) =>
        ['by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with'].includes(part),
      ),
  )

  return Array.from(new Set([word.term, ...safeSynonyms]))
}

function getNuanceHint(word: StarterPackMissionWord): string {
  const register = word.register ? `Register: ${word.register}.` : 'Register: neutral.'
  const nuance = word.nuance ?? word.commonMistakes ?? ''
  const tags = word.tags?.length ? `Tags: ${word.tags.slice(0, 3).join(', ')}.` : ''

  return [register, nuance, tags].filter(Boolean).join(' ')
}

function getFirstLetterHint(word: StarterPackMissionWord): string | undefined {
  if (word.difficulty !== 'C1' && word.type === 'word') {
    return undefined
  }

  return word.term
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join(' ')
}

export function buildRecallPrompts(words: StarterPackMissionWord[]): RecallPrompt[] {
  return words
    .map((word): RecallPrompt | null => {
      const sentence = bestSentence(word)
      const clozeSentence = sentence
        ? maskTarget(sentence, word.term) ?? (hasRecallContext(word)
          ? contextRecallPrompt(sentence, word)
          : null)
        : null

      if (!sentence || !clozeSentence || !word.definitionEn) {
        return null
      }

      const answers = acceptedAnswers(word, clozeSentence)

      return {
        id: `full-library-recall-${word.id}`,
        sourceWordId: word.id,
        sourceTerm: word.term,
        sentence: clozeSentence,
        target: word.term,
        answerLength: word.term.length,
        meaningHint: word.definitionEn,
        nuanceHint: getNuanceHint(word),
        firstLetterHint: getFirstLetterHint(word),
        acceptedAnswers: answers,
        saferAlternatives: (word.synonyms ?? []).slice(0, 4),
        register: word.register,
        difficulty: word.difficulty,
        tags: Array.from(new Set([...(word.tags ?? []), ...word.categories])).slice(0, 4),
      }
    })
    .filter((prompt): prompt is RecallPrompt => prompt !== null)
}

function hasSharedCoreWords(answer: string, target: string): boolean {
  const answerWords = new Set(normalizeAnswer(answer).split(/\s+/).filter((word) => word.length > 2))
  const targetWords = normalizeAnswer(target).split(/\s+/).filter((word) => word.length > 2)

  if (!answerWords.size || !targetWords.length) {
    return false
  }

  const shared = targetWords.filter((word) => answerWords.has(word)).length
  return shared > 0 && shared / targetWords.length >= 0.5
}

function looksLikeRegisterMismatch(prompt: RecallPrompt, answer: string): boolean {
  const normalized = normalizeAnswer(answer)

  if (prompt.register === 'formal') {
    return ['stuff', 'things', 'a lot', 'really good', 'bad thing'].some((term) =>
      normalized.includes(term),
    )
  }

  if (prompt.register === 'conversational') {
    return ['hereby', 'notwithstanding', 'in accordance with'].some((term) =>
      normalized.includes(term),
    )
  }

  return false
}

export function evaluateRecallAnswer(prompt: RecallPrompt, rawAnswer: string): RecallEvaluation {
  const answer = rawAnswer.trim()
  const answerKeySet = new Set(answerKeys(answer))
  const target = prompt.target

  if (!answer) {
    return {
      status: 'incorrect',
      isCorrect: false,
      score: 0,
      title: 'No answer yet',
      feedback: `The expected answer is "${target}". Try to produce the phrase from the meaning and register hints before checking feedback.`,
      betterAnswer: target,
    }
  }

  if (answerKeys(target).some((key) => answerKeySet.has(key))) {
    return {
      status: 'correct',
      isCorrect: true,
      score: 1,
      title: 'Exact recall',
      feedback: `"${target}" fits the sentence, collocation, and register.`,
      betterAnswer: target,
    }
  }

  const acceptedSynonym = prompt.acceptedAnswers.find((candidate) =>
    answerKeys(candidate).some((key) => answerKeySet.has(key)),
  )
  if (acceptedSynonym) {
    return {
      status: 'accepted-synonym',
      isCorrect: true,
      score: 1,
      title: 'Accepted alternative',
      feedback: `"${answer}" works here. "${target}" is still the target expression to add to active vocabulary.`,
      betterAnswer: target,
    }
  }

  if (looksLikeRegisterMismatch(prompt, answer)) {
    return {
      status: 'wrong-register',
      isCorrect: false,
      score: 0,
      title: 'Register mismatch',
      feedback: `"${answer}" does not match the expected ${prompt.register ?? 'professional'} register. In this context, "${target}" sounds more natural and controlled.`,
      betterAnswer: target,
    }
  }

  if (hasSharedCoreWords(answer, target)) {
    return {
      status: 'partial',
      isCorrect: false,
      score: 0.5,
      title: 'Partially correct',
      feedback: `"${answer}" is close, but the collocation or word order is not quite native here. Use the complete phrase "${target}".`,
      betterAnswer: target,
    }
  }

  return {
    status: 'incorrect',
    isCorrect: false,
    score: 0,
    title: 'Not this context',
    feedback: `"${answer}" does not express the target meaning naturally in this sentence. "${target}" is the stronger professional choice.`,
    betterAnswer: target,
  }
}
