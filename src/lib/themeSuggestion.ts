/**
 * themeSuggestion.ts
 *
 * Lightweight heuristic for suggesting themes from a word or phrase.
 * Shared by QuickAddModal (display suggestions to user) and
 * vocabStore.enrichItem (auto-apply after successful enrichment).
 *
 * Returns 0–2 theme names from the provided `available` list.
 * Designed to have very few false positives — silent misses are safer
 * than unwanted auto-assignments.
 */

/**
 * Common particles used in English phrasal verbs.
 * If a multi-word term ends with one of these, it's likely a phrasal verb.
 */
export const PHRASAL_PARTICLES = new Set([
  'up', 'down', 'out', 'off', 'on', 'away', 'back',
  'over', 'through', 'into', 'around', 'along', 'apart', 'aside', 'in',
])

/**
 * Per-theme keyword lists — order matters (first match wins within a theme).
 * Kept intentionally short: false positives > missed suggestions.
 */
export const THEME_HINTS: Array<[string, string[]]> = [
  ['Phrasal Verbs',            []],  // handled separately by particle detection
  ['Idioms & Expressions',     ['bite the', 'on the fence', 'kick the', 'break a leg', 'hit the nail', 'under the weather', 'cost an arm', 'spill the beans', 'burn bridges']],
  ['Business & Professional',  ['leverage', 'synergy', 'stakeholder', 'bandwidth', 'pipeline', 'deadline', 'initiative', 'milestone', 'roadmap', 'deliverable', 'align', 'scale', 'pivot', 'corporate', 'KPI', 'ROI', 'headcount', 'capacity']],
  ['Meetings & Presentations', ['agenda', 'standup', 'retrospective', 'action item', 'follow-up', 'facilitate', 'chair', 'minutes', 'deck', 'slide', 'brief', 'pitch']],
  ['Written Communication',    ['pursuant', 'herewith', 'sincerely', 'attached please', 'as per', 'I am writing', 'kind regards', 'please find']],
  ['Leadership & Management',  ['delegate', 'appraisal', 'performance review', 'empower', 'accountability', 'mentor', 'coach', 'headcount', 'direct report']],
  ['Transitions & Connectors', ['however', 'furthermore', 'therefore', 'consequently', 'nevertheless', 'moreover', 'notwithstanding', 'whereas', 'despite', 'in contrast', 'as a result', 'in addition']],
  ['Formal & Academic',        ['pursuant to', 'hereby', 'aforementioned', 'therein', 'whereby', 'henceforth', 'inasmuch', 'ex parte', 'prima facie']],
  ['Everyday Conversation',    ['catch up', 'small talk', 'break the ice', 'how are you', 'long time no see', "what's up", 'hang out']],
  ['Negotiations & Persuasion',['negotiate', 'concession', 'counter-offer', 'common ground', 'win-win', 'leverage', 'trade-off', 'bottom line', 'walk away']],
  ['Problem-solving & Analysis',['root cause', 'hypothesis', 'framework', 'drill down', 'deep dive', 'trade-off', 'iterate', 'troubleshoot', 'diagnose']],
  ['Collocations & Chunks',    ['make a point', 'take a look', 'have a go', 'pay attention', 'keep in mind', 'as a matter of', 'for the time being']],
]

/**
 * Returns 0–2 theme names from `available` that are good matches for `term`.
 * Never throws; returns an empty array on any error.
 */
export function suggestThemes(term: string, available: string[]): string[] {
  if (!term.trim() || available.length === 0) return []
  const lower = term.toLowerCase().trim()
  const words  = lower.split(/\s+/)
  const result: string[] = []

  // Rule 1: phrasal verb — 2+ words, last word is a particle
  if (
    words.length >= 2 &&
    PHRASAL_PARTICLES.has(words[words.length - 1]) &&
    available.includes('Phrasal Verbs')
  ) {
    result.push('Phrasal Verbs')
  }

  // Rule 2: keyword matching per theme
  for (const [theme, keywords] of THEME_HINTS) {
    if (!available.includes(theme)) continue
    if (result.includes(theme)) continue
    if (keywords.length > 0 && keywords.some((kw) => lower.includes(kw))) {
      result.push(theme)
    }
    if (result.length >= 2) break
  }

  return result
}
