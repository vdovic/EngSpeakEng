/**
 * scripts/migrationNormalize.ts
 * ─────────────────────────────
 * Pure normalization, deduplication and classification logic for the
 * bulk vocabulary migration.  No I/O, no side effects — easy to test.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Category = 'word' | 'phrasal_verb' | 'idiom' | 'phrase' | 'collocation'
/** Maps to the app's ItemType: word → word, idiom → chunk, rest → phrase */
export type AppItemType = 'word' | 'phrase' | 'chunk'

export interface NormalizedEntry {
  /** Display term — case preserved from the raw list */
  term: string
  /** Lowercase key used for deduplication */
  key: string
  /** Fine-grained category for reporting */
  category: Category
  /** App-compatible item type */
  type: AppItemType
  /** Auto-generated tags */
  tags: string[]
}

export interface MigrationReport {
  rawCount: number
  afterTrimCount: number
  uniqueCount: number
  duplicatesRemoved: number
  byCategory: Record<Category, number>
  ambiguous: AmbiguousEntry[]
}

export interface AmbiguousEntry {
  canonical: string
  variants: string[]
  reason: string
}

// ── Classification data ───────────────────────────────────────────────────────

/**
 * Substring patterns that strongly indicate an idiom / fixed expression.
 * Checked against the lowercased term.
 */
const IDIOM_PATTERNS: string[] = [
  'a penny for your thoughts',
  'a piece of cake',
  'a walk in the park',
  'a thick skin',
  'a blessing in disguise',
  'a dime a dozen',
  'a leopard can',
  'a slap on the wrist',
  'a snowball',
  'a wild goose chase',
  'actions speak louder',
  'add insult to injury',
  'all ears',
  'back to square one',
  'barking up the wrong tree',
  'beat around the bush',
  'better late than never',
  'bite off more than you can chew',
  'bite the bullet',
  'blow off steam',
  'break a leg',
  'break the ice',
  'burn the midnight oil',
  'call it a day',
  'caught red-handed',
  'cold turkey',
  'costs an arm and a leg',
  'cry over spilled milk',
  'cut corners',
  'cut to the chase',
  'devil\'s advocate',
  'don\'t bite the hand',
  'don\'t count your chickens',
  'don\'t cry wolf',
  'don\'t judge a book',
  'don\'t put all your eggs',
  'don\'t put it past',
  'easy does it',
  'elephant in the room',
  'every cloud has a silver lining',
  'face the music',
  'fish out of water',
  'get cold feet',
  'get out of hand',
  'get the hang of',
  'give someone the cold shoulder',
  'go down in flames',
  'go the extra mile',
  'grass is always greener',
  'hit the ground running',
  'hit the jackpot',
  'hit the nail on the head',
  'hit the road',
  'hit the sack',
  'in hot water',
  'in over your head',
  'in the same boat',
  'it\'s raining cats and dogs',
  'jump on the bandwagon',
  'jump the gun',
  'jump through hoops',
  'keep your chin up',
  'keep your fingers crossed',
  'kill two birds with one stone',
  'know the ropes',
  'leave no stone unturned',
  'let sleeping dogs lie',
  'let the cat out of the bag',
  'make a long story short',
  'make a mountain out of a molehill',
  'miss the boat',
  'no pain, no gain',
  'not my cup of tea',
  'not playing with a full deck',
  'off the hook',
  'on cloud nine',
  'on the ball',
  'on thin ice',
  'once in a blue moon',
  'out of the blue',
  'pass the buck',
  'piece of cake',
  'pull someone\'s leg',
  'put a sock in it',
  'put all your eggs in one basket',
  'rain on someone\'s parade',
  'read between the lines',
  'rock the boat',
  'sit on the fence',
  'skeleton in the closet',
  'speak of the devil',
  'spill the beans',
  'steal someone\'s thunder',
  'take it with a grain of salt',
  'take the bull by the horns',
  'the ball is in your court',
  'the best of both worlds',
  'the early bird catches the worm',
  'the last straw',
  'the tip of the iceberg',
  'through thick and thin',
  'throw in the towel',
  'time flies',
  'to each their own',
  'twist someone\'s arm',
  'under the weather',
  'under your nose',
  'up in the air',
  'walk on eggshells',
  'water under the bridge',
  'when pigs fly',
  'wrap your head around',
  'you can\'t have your cake',
  'you can\'t judge a book',
  'your guess is as good as mine',
  'zip your lip',
]

/** Verbs that commonly head phrasal verbs */
const PHRASAL_VERB_HEADS = new Set([
  'act', 'add', 'ask', 'back', 'be', 'blow', 'boss', 'branch', 'break',
  'bring', 'brush', 'bug', 'bump', 'burn', 'butt', 'call', 'calm', 'carry',
  'catch', 'chalk', 'check', 'cheer', 'chill', 'clam', 'clean', 'close',
  'come', 'count', 'crack', 'cut', 'deal', 'do', 'drag', 'dress', 'drop',
  'ease', 'eat', 'fall', 'figure', 'fill', 'find', 'fix', 'flip', 'follow',
  'freak', 'gear', 'get', 'give', 'go', 'grow', 'hand', 'hang', 'heat',
  'hold', 'hurry', 'jack', 'jot', 'keep', 'key', 'kick', 'knock', 'knuckle',
  'laugh', 'lay', 'lead', 'leave', 'let', 'level', 'lie', 'light', 'live',
  'lock', 'log', 'look', 'make', 'mess', 'mix', 'move', 'nod', 'note',
  'open', 'opt', 'own', 'pack', 'pass', 'pay', 'pick', 'pitch', 'play',
  'point', 'pop', 'pull', 'push', 'put', 'read', 'rely', 'ring', 'roll',
  'rub', 'run', 'sail', 'save', 'scope', 'see', 'sell', 'send', 'set',
  'settle', 'show', 'shut', 'sit', 'size', 'slow', 'snap', 'sort', 'sound',
  'speak', 'speed', 'spit', 'split', 'stand', 'stay', 'step', 'stick',
  'take', 'talk', 'tear', 'think', 'throw', 'tie', 'track', 'try', 'turn',
  'use', 'vouch', 'wake', 'walk', 'warm', 'wash', 'watch', 'wear', 'weigh',
  'whip', 'wind', 'work', 'wrap', 'write', 'zero', 'zone', 'zoom',
])

/** Particles that follow verb heads in phrasal verbs */
const PARTICLES = new Set([
  'about', 'across', 'after', 'ahead', 'along', 'apart', 'around', 'aside',
  'at', 'away', 'back', 'behind', 'by', 'down', 'for', 'forward', 'in',
  'into', 'off', 'on', 'onto', 'out', 'over', 'past', 'through', 'to',
  'together', 'toward', 'towards', 'under', 'up', 'upon', 'with',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Canonical dedup key: lowercase, no parenthetical content, single spaces */
export function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, ' ') // "get along (with)" → "get along  "
    .replace(/['']/g, "'")          // smart quotes → straight
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve parenthetical alternative into an explicit term: "get along (with)" → "get along with" */
function resolveParenthetical(raw: string): string {
  return raw
    .replace(/\s*\(([^)]*)\)/g, (_, inner) => (inner.trim() ? ' ' + inner.trim() : ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function isIdiom(lower: string): boolean {
  return IDIOM_PATTERNS.some((p) => lower.includes(p))
}

function isPhrasalVerb(lower: string): boolean {
  const words = lower.split(/\s+/)
  if (words.length < 2) return false
  if (!PHRASAL_VERB_HEADS.has(words[0])) return false
  // Must contain at least one particle somewhere after the head
  return words.slice(1).some((w) => PARTICLES.has(w))
}

function tagsFor(category: Category): string[] {
  switch (category) {
    case 'idiom':       return ['idiom', 'chunks']
    case 'phrasal_verb': return ['phrasal-verb']
    case 'word':        return ['vocabulary']
    case 'phrase':      return ['vocabulary']
    case 'collocation': return ['vocabulary']
  }
}

function classifyEntry(term: string): { category: Category; type: AppItemType } {
  const lower = term.toLowerCase()
  const words = lower.split(/\s+/)

  if (isIdiom(lower))        return { category: 'idiom',       type: 'chunk' }
  if (words.length === 1)    return { category: 'word',        type: 'word'  }
  if (isPhrasalVerb(lower)) return { category: 'phrasal_verb', type: 'phrase' }
  return                            { category: 'phrase',       type: 'phrase' }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function normalizeAndDeduplicate(rawLines: string[]): {
  entries: NormalizedEntry[]
  report: MigrationReport
  ambiguous: AmbiguousEntry[]
} {
  // ── Step 1: trim + filter blanks
  const trimmed = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const rawCount = trimmed.length

  // ── Step 2: resolve parentheticals, build key map
  // key → array of raw variants seen
  const keyToVariants = new Map<string, string[]>()

  for (const raw of trimmed) {
    const resolved = resolveParenthetical(raw)
    const key = normalizeKey(resolved)
    const existing = keyToVariants.get(key)
    if (existing) {
      existing.push(raw)
    } else {
      keyToVariants.set(key, [raw])
    }
  }

  // ── Step 3: choose canonical form and flag ambiguous
  const entries: NormalizedEntry[] = []
  const ambiguous: AmbiguousEntry[] = []
  const byCat: Record<Category, number> = {
    word: 0, phrasal_verb: 0, idiom: 0, phrase: 0, collocation: 0,
  }

  for (const [key, variants] of keyToVariants) {
    // Pick canonical: prefer the first occurrence that is already resolved
    const resolved = resolveParenthetical(variants[0])
    const { category, type } = classifyEntry(resolved)

    entries.push({
      term: resolved,
      key,
      category,
      type,
      tags: tagsFor(category),
    })

    byCat[category]++

    // Flag near-duplicates that differ beyond whitespace/parens
    if (variants.length > 1) {
      const distinctForms = [...new Set(variants.map(resolveParenthetical))]
      if (distinctForms.length > 1) {
        ambiguous.push({
          canonical: resolved,
          variants: distinctForms,
          reason: 'Multiple distinct surface forms collapsed to the same key',
        })
      }
    }
  }

  const report: MigrationReport = {
    rawCount,
    afterTrimCount: trimmed.length,
    uniqueCount: entries.length,
    duplicatesRemoved: rawCount - entries.length,
    byCategory: byCat,
    ambiguous,
  }

  return { entries, report, ambiguous }
}
