/**
 * personalizationLogic.ts — Phase 8
 *
 * Pure scoring and recommendation helpers for the personalised focus set.
 * No side-effects, no React, no store — just data in, data out.
 */

import type { VocabItem } from '@/types/vocabulary'
import type { UserLearningProfile, LearningGoal, LearningContext } from '@/types/profile'

// ── Tag keyword maps ────────────────────────────────────────────────────────────

/** Tags that indicate relevance for each learning goal */
const GOAL_TAGS: Record<LearningGoal, string[]> = {
  'work-communication': ['business', 'professional', 'email', 'formal', 'communication', 'workplace'],
  'meetings':           ['meetings', 'facilitation', 'agile', 'discussion', 'chairing', 'scrum'],
  'presentations':      ['presentations', 'leadership', 'strategy', 'public-speaking', 'pitch'],
  'writing':            ['writing', 'email', 'formal', 'clarity', 'grammar', 'report'],
  'product-management': ['product', 'strategy', 'agile', 'roadmap', 'stakeholder', 'prioritization', 'pm'],
  'general-fluency':    ['conversation', 'idioms', 'everyday', 'phrasal-verbs', 'informal', 'fluency'],
  'exam-preparation':   ['academic', 'formal', 'advanced', 'grammar', 'ielts', 'toefl', 'cambridge'],
  'other':              ['professional', 'business'],
}

/** Tags that indicate relevance for each usage context */
const CONTEXT_TAGS: Record<LearningContext, string[]> = {
  'work-email':    ['email', 'formal', 'writing', 'business', 'professional'],
  'meetings':      ['meetings', 'facilitation', 'agile', 'discussion'],
  'small-talk':    ['conversation', 'everyday', 'idioms', 'informal', 'social'],
  'presentations': ['presentations', 'leadership', 'strategy', 'pitch'],
  'reading':       ['academic', 'formal', 'advanced', 'vocabulary'],
  'listening':     ['conversation', 'idioms', 'listening', 'informal'],
  'travel':        ['travel', 'everyday', 'informal', 'conversation'],
  'academic':      ['academic', 'formal', 'advanced', 'grammar', 'university'],
}

/** Tags inferred from theme names (for items not yet theme-assigned) */
const THEME_KEYWORD_TAGS: Record<string, string[]> = {
  'Business & Professional':    ['business', 'professional', 'corporate', 'workplace'],
  'Meetings & Presentations':   ['meetings', 'presentations', 'facilitation', 'conference'],
  'Written Communication':      ['writing', 'email', 'formal', 'report', 'document'],
  'Leadership & Management':    ['leadership', 'management', 'strategy', 'team', 'delegate'],
  'Negotiations & Persuasion':  ['negotiations', 'persuasion', 'diplomacy', 'influence'],
  'Problem-solving & Analysis': ['analysis', 'problem-solving', 'critical', 'framework'],
  'Everyday Conversation':      ['conversation', 'everyday', 'informal', 'social', 'casual'],
  'Phrasal Verbs':              ['phrasal-verbs', 'phrasal', 'verb'],
  'Idioms & Expressions':       ['idioms', 'expressions', 'fixed-phrases', 'figurative'],
  'Formal & Academic':          ['academic', 'formal', 'advanced', 'university', 'essay'],
  'Transitions & Connectors':   ['transitions', 'connectors', 'discourse', 'linking'],
  'Collocations & Chunks':      ['collocations', 'chunks', 'fixed', 'natural'],
}

// ── Scoring ────────────────────────────────────────────────────────────────────

/**
 * Score a vocabulary item for relevance to the user's learning profile.
 * Returns a numeric score — higher means more relevant.
 * Mastered items (level 3) return –100 so they always sort to the bottom.
 */
export function scoreItemForProfile(
  item: VocabItem,
  profile: UserLearningProfile,
): number {
  // Exclude mastered items from focus candidates
  if ((item.level ?? 0) >= 3) return -100

  let score = 0

  const itemTags   = (item.tags   ?? []).map((t) => t.toLowerCase())
  const itemThemes = item.themes  ?? []

  // ── 1. Direct theme match (strongest signal, 35 pts each) ─────────────────
  const themeOverlap = itemThemes.filter((t) => profile.preferredThemes.includes(t)).length
  score += themeOverlap * 35

  // ── 2. Goal-related tag keywords (up to 3 matches, 15 pts each) ──────────
  const goalKeywords = GOAL_TAGS[profile.goal] ?? []
  const goalHits = itemTags.filter((t) => goalKeywords.some((g) => t.includes(g))).length
  score += Math.min(goalHits, 3) * 15

  // ── 3. Context tag keywords (10 pts per matching context) ────────────────
  for (const ctx of profile.contexts) {
    const ctxKeywords = CONTEXT_TAGS[ctx] ?? []
    if (itemTags.some((t) => ctxKeywords.some((c) => t.includes(c)))) score += 10
  }

  // ── 4. Theme-keyword match for un-assigned items (12 pts per theme) ───────
  //    Catches items that SHOULD belong to a preferred theme but aren't tagged yet.
  for (const pTheme of profile.preferredThemes) {
    const hints = THEME_KEYWORD_TAGS[pTheme] ?? []
    if (itemTags.some((t) => hints.some((h) => t.includes(h)))) score += 12
  }

  // ── 5. Enrichment quality bonus ───────────────────────────────────────────
  if (item.definitionEn)              score += 8
  if (item.exampleSentence)           score += 4
  if ((item.synonyms ?? []).length > 0) score += 2

  // ── 6. Prefer lower-exposure words (more practice potential, 0–8 pts) ────
  const exp = item.exposureCount ?? 0
  score += Math.max(0, 8 - exp)

  // ── 7. Slight preference for actively-studied words (they have more data) ─
  const level = item.level ?? 0
  if (level === 1) score += 5  // Learning
  if (level === 2) score += 3  // Familiar

  return score
}

/**
 * Return up to `maxItems` vocabulary items most relevant to `profile`,
 * sorted by descending relevance score.
 * Excludes archived items and items already mastered (level 3).
 */
export function recommendInitialFocusItems(
  items: VocabItem[],
  profile: UserLearningProfile,
  maxItems: number,
): VocabItem[] {
  const eligible = items.filter((i) => !i.archived && (i.level ?? 0) < 3)

  const scored = eligible.map((item) => ({
    item,
    score: scoreItemForProfile(item, profile),
  }))

  // Stable sort: equal scores keep original library order
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, maxItems).map((s) => s.item)
}
