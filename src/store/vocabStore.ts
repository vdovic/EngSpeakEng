import { create } from 'zustand'
import { db } from '@/lib/db'
import { VocabItem, VocabItemDraft, UsageLog, ReviewOutcome, ItemStatus, RelatedSuggestion, ChallengeType } from '@/types/vocabulary'
import { StarterPack } from '@/types/starterPacks'
import { calculateNextReview, isDueToday } from '@/lib/srs'
import { deriveStatus } from '@/lib/mastery'
import { createSeedData } from '@/lib/seed'
import { getNextChallengeDate } from '@/lib/challengeSchedule'
import { generateCandidates, validateRelatedEntries } from '@/lib/relatedEntries'
import { useThemesStore } from '@/store/themesStore'
import { getWeekStart, FOCUS_WEEK_LS_KEY } from '@/lib/focusWeek'
import {
  FOCUS_MAX,
  calcFocusPriority,
  getRuleBCandidates,
  computeFocusReset,
  selectEvictionCandidates,
} from '@/lib/focusLogic'
import { deriveLevel } from '@/lib/progressionLogic'
import { updateDifficulty, INITIAL_DIFFICULTY } from '@/lib/difficultyLogic'
import { migrateItem } from '@/lib/migration'

interface VocabStore {
  items: VocabItem[]
  loaded: boolean
  load: () => Promise<void>
  addItem: (draft: VocabItemDraft) => Promise<string>
  enrichItem: (id: string) => Promise<void>
  /** Find related words for an item from within the library via the API. */
  generateRelatedEntries: (id: string) => Promise<void>
  updateItem: (id: string, patch: Partial<VocabItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  logUsage: (id: string, log: Omit<UsageLog, 'id'>) => Promise<void>
  clearUsageLogs: (id: string) => Promise<void>
  recordReview: (id: string, outcome: ReviewOutcome) => Promise<void>
  toggleWeeklyFocus: (id: string) => Promise<void>
  /** Record one challenge exposure for an item. Advances the SRS counter on
   *  correct answers; on incorrect it keeps the count and retries sooner. */
  recordExposure: (id: string, correct: boolean) => Promise<void>

  /**
   * Phase-3 unified challenge attempt recorder.
   * Handles challenge-type-specific side-effects on top of recordExposure:
   *   sentence-production + correct  → sets review.sentenceProduced = true
   *   real-life-use-check + correct  → logs a usage entry; does NOT increment exposure
   *   all other types                → delegates to recordExposure
   */
  recordChallengeAttempt: (
    id: string,
    challengeType: ChallengeType,
    correct: boolean,
    userAnswer?: string,
  ) => Promise<void>
  /** Replace the full themes array for an item. */
  assignThemes: (id: string, themes: string[]) => Promise<void>
  /** Move inbox items to Learning. Returns counts for feedback. */
  moveToLearning: (ids: string[]) => Promise<{ moved: number; skipped: number }>
  /** Set items as immediately due for Daily Challenge (promotes inbox→learning). */
  addToChallenge: (ids: string[]) => Promise<{ added: number; skipped: number }>
  /** Add items to This Week's Focus (promotes inbox→learning). */
  addToWeekFocus: (ids: string[]) => Promise<{ added: number; skipped: number }>
  /** Archive (soft-delete) multiple items at once. */
  deleteItems: (ids: string[]) => Promise<void>
  /** Import all words from a StarterPack into the inbox (no AI enrichment triggered).
   *  Returns the count and the IDs of newly added items for immediate activation. */
  importPack: (pack: StarterPack) => Promise<{ imported: number; skipped: number; ids: string[] }>
  /**
   * Add/remove a single item from Focus This Week.
   * On add: computes priority, sets focusAddedAt, enforces the 50-word cap.
   * On remove: clears focus fields.
   */
  setFocusThisWeek: (id: string, inFocus: boolean) => Promise<void>
  /**
   * Bulk-add multiple items to Focus This Week.
   * Respects the 50-word cap — lowest-priority items are evicted to make room.
   * Returns { added, evicted } counts.
   */
  addToFocusThisWeek: (ids: string[]) => Promise<{ added: number; evicted: number }>
  /**
   * Rule B auto-promote: adds struggling words (≥2 failures in recent reviews)
   * to Focus This Week automatically.
   * Returns the number of words auto-promoted.
   */
  autoPromoteToFocus: () => Promise<number>

  // ── Phase-1 new actions ────────────────────────────────────────────────────

  /**
   * Add items to "My Current Focus" (inFocus).
   * Respects FOCUS_MAX = 150; evicts lowest-priority items if cap is exceeded.
   * Also syncs the legacy weeklyFocus field.
   */
  addToFocus: (ids: string[]) => Promise<{ added: number; evicted: number }>

  /**
   * Remove a single item from focus.
   * Clears both inFocus and weeklyFocus for backward compatibility.
   */
  removeFromFocus: (id: string) => Promise<void>

  /** Tag helpers */
  addTag:    (id: string, tag: string)  => Promise<void>
  removeTag: (id: string, tag: string)  => Promise<void>
}

function uid(): string {
  return crypto.randomUUID()
}

// Helper: write a patch to both IndexedDB and Zustand state atomically
function applyPatch(
  id: string,
  patch: Partial<VocabItem>,
  set: (fn: (s: { items: VocabItem[] }) => { items: VocabItem[] }) => void
) {
  return db.items.update(id, patch).then(() => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  })
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  items: [],
  loaded: false,

  // ── load ────────────────────────────────────────────────────────────────────
  load: async () => {
    let all = (await db.items.filter((i) => !i.archived).toArray()).map((i) => ({
      ...i,
      themes: i.themes ?? [],
    }))

    // Always fetch the migration file so we can top-up any items that were
    // missing from an earlier deployment (e.g., the file previously had only
    // 529 items and now has 1 156). On a completely fresh DB we seed normally;
    // on an existing DB we silently add only the items not yet present.
    let migrationSeed: VocabItem[] = []
    try {
      const res = await fetch('/data/migration-vocab.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      migrationSeed = (await res.json()) as VocabItem[]
    } catch {
      // Migration file unavailable — fall back to built-in seed for empty DB only
    }

    if (all.length === 0) {
      // Fresh install
      const seed = migrationSeed.length > 0 ? migrationSeed : createSeedData()
      try {
        await db.items.bulkAdd(seed)
      } catch {
        for (const item of seed) {
          await db.items.add(item).catch(() => { /* skip duplicates */ })
        }
      }
      all = (await db.items.filter((i) => !i.archived).toArray()).map((i) => ({
        ...i,
        themes: i.themes ?? [],
      }))
    } else if (migrationSeed.length > all.length) {
      // Top-up: add any migration items not yet in the DB (identified by id).
      // This handles the case where an earlier deployment had fewer items.
      const existingIds = new Set(all.map((i) => i.id))
      const missing = migrationSeed.filter((i) => !existingIds.has(i.id))
      if (missing.length > 0) {
        for (const item of missing) {
          await db.items.add(item).catch(() => { /* skip term collisions */ })
        }
        all = (await db.items.filter((i) => !i.archived).toArray()).map((i) => ({
          ...i,
          themes: i.themes ?? [],
        }))
      }
    }

    // ── Weekly Focus reset ────────────────────────────────────────────────────
    // If a new week has started since the last load, evict the lowest-priority
    // focus items (keep top 65%) to make room for fresh struggling/new words.
    const storedWeek = localStorage.getItem(FOCUS_WEEK_LS_KEY)
    const currentWeek = getWeekStart()
    if (storedWeek && storedWeek !== currentWeek) {
      const focusItems = all.filter((i) => i.weeklyFocus || i.inFocus)
      const activeThemes = useThemesStore.getState().themes
      const { removedIds } = computeFocusReset(focusItems, activeThemes)
      if (removedIds.length > 0) {
        const now = new Date().toISOString()
        for (const id of removedIds) {
          await db.items.update(id, {
            weeklyFocus: false,
            inFocus: false,
            focusAddedAt: undefined,
            focusPriority: undefined,
            updatedAt: now,
          })
        }
        // Refresh all after reset
        all = (await db.items.filter((i) => !i.archived).toArray()).map((i) => ({
          ...i,
          themes: i.themes ?? [],
        }))
      }
    }
    // Always update the stored week key
    localStorage.setItem(FOCUS_WEEK_LS_KEY, currentWeek)

    // ── Phase-1 migration ────────────────────────────────────────────────────
    // Idempotent: populates level, inFocus, difficultyScore for items that
    // were created before these fields existed.  Fast-path skips already-
    // migrated items.  Writes are fire-and-forget so load() isn't blocked.
    const migrated = all.map(migrateItem)
    const needsWrite = migrated.filter((m, i) => m !== all[i])
    if (needsWrite.length > 0) {
      db.items.bulkPut(needsWrite).catch(() => {})
    }

    set({ items: migrated, loaded: true })

    // Re-trigger enrichment for any items that were 'pending' when the app
    // was previously closed (e.g., tab killed mid-generation).
    const stuck = all.filter((i) => i.generationStatus === 'pending')
    for (const item of stuck) {
      get().enrichItem(item.id).catch(() => {
        // enrichItem handles its own errors; this prevents unhandled rejections
      })
    }

    // Rule B auto-promote: add newly struggling words to Focus (fire-and-forget)
    get().autoPromoteToFocus().catch(() => {})
  },

  // ── addItem ─────────────────────────────────────────────────────────────────
  addItem: async (draft) => {
    const now = new Date().toISOString()
    const item: VocabItem = {
      id: uid(),
      term: draft.term,
      type: draft.type,
      status: draft.status ?? 'inbox',
      createdAt: now,
      updatedAt: now,
      sourceType: draft.sourceType,
      sourceText: draft.sourceText,
      tags: draft.tags ?? [],
      themes: [],
      definitionEn: draft.definitionEn,
      translations: {},
      synonyms: [],
      antonyms: [],
      collocations: [],
      sentenceFrames: [],
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
      // Mark as pending so the UI can show a loading state immediately
      generationStatus: 'pending',
      // Phase-1 fields
      level: 0,
      inFocus: false,
      difficultyScore: INITIAL_DIFFICULTY,
    }

    try {
      await db.items.add(item)
    } catch (err: unknown) {
      // Dexie throws a ConstraintError when the unique &term index is violated.
      const name = (err as { name?: string }).name
      if (name === 'ConstraintError') {
        throw new Error(`"${item.term}" is already in your vocabulary.`)
      }
      throw err
    }

    set((s) => ({ items: [item, ...s.items] }))

    // ── Kick off enrichment in the background (non-blocking) ──────────────────
    // addItem returns immediately; the word appears in the UI with a
    // 'pending' badge while the API call runs in the background.
    get().enrichItem(item.id).catch(() => {
      // enrichItem handles its own errors internally
    })

    return item.id
  },

  // ── enrichItem ───────────────────────────────────────────────────────────────
  // Calls POST /api/enrich, then writes the returned fields to the item.
  // Can be called manually (retry) or automatically from addItem.
  enrichItem: async (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    // Show spinner immediately
    await applyPatch(id, { generationStatus: 'pending', generationError: undefined }, set)

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: item.term, type: item.type }),
      })

      if (!res.ok) {
        // Try to parse a JSON error body; fall back to HTTP status text
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const { enriched } = (await res.json()) as { enriched: Partial<VocabItem> }

      await applyPatch(
        id,
        {
          ...enriched,
          generationStatus: 'complete',
          generationError: undefined,
          updatedAt: new Date().toISOString(),
        },
        set
      )

      // After successful enrichment, auto-generate related entries.
      // Fire-and-forget — enrichItem's callers are not affected by this.
      get().generateRelatedEntries(id).catch(() => {})
    } catch (err: unknown) {
      const generationError =
        err instanceof Error ? err.message : 'Generation failed. Please retry.'

      console.error(`[enrichItem] failed for "${item.term}":`, generationError)

      await applyPatch(id, { generationStatus: 'failed', generationError }, set)
    }
  },

  // ── generateRelatedEntries ──────────────────────────────────────────────────
  // Calls POST /api/relatedEntries to find library-internal related words.
  // Fire-and-forget: can be called manually or after enrichItem succeeds.
  generateRelatedEntries: async (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    // Mark as pending
    await applyPatch(id, { relatedEntriesStatus: 'pending' }, set)

    try {
      const allItems = get().items
      const candidates = generateCandidates(item, allItems, 15)

      // Even with 0 library candidates we still call the API so Claude can
      // return "suggestions" (words not yet in the library worth adding).
      // Only skip the network call when the item itself is missing a term.

      const simplify = (v: VocabItem) => ({
        id: v.id,
        term: v.term,
        partOfSpeech: v.partOfSpeech,
        definitionEn: v.definitionEn,
        synonyms: v.synonyms,
        type: v.type,
      })

      const res = await fetch('/api/relatedEntries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: simplify(item),
          candidates: candidates.map(simplify),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const { entries, suggestions = [] } = (await res.json()) as {
        entries: unknown[]
        suggestions?: unknown[]
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validated = validateRelatedEntries(entries as any, allItems)

      await applyPatch(
        id,
        {
          relatedEntries: validated,
          relatedSuggestions: suggestions as RelatedSuggestion[],
          relatedEntriesStatus: 'complete',
          updatedAt: new Date().toISOString(),
        },
        set,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Related entries generation failed.'
      console.error(`[generateRelatedEntries] failed for "${item.term}":`, msg)
      await applyPatch(id, { relatedEntriesStatus: 'failed' }, set)
    }
  },

  // ── updateItem ──────────────────────────────────────────────────────────────
  updateItem: async (id, patch) => {
    const now = new Date().toISOString()
    const full = { ...patch, updatedAt: now }
    await db.items.update(id, full)
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...full } : i)),
    }))
  },

  // ── deleteItem ──────────────────────────────────────────────────────────────
  deleteItem: async (id) => {
    await db.items.update(id, { archived: true })
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  // ── logUsage ────────────────────────────────────────────────────────────────
  logUsage: async (id, logEntry) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const newLog: UsageLog = { id: uid(), ...logEntry }
    const logs = [...item.activation.usageLogs, newLog]
    const usageCount = logs.length

    const updatedActivation = { ...item.activation, usageLogs: logs, usageCount }
    const updatedItem = { ...item, activation: updatedActivation }
    const newStatus: ItemStatus = deriveStatus(updatedItem)

    await db.items.update(id, {
      activation: updatedActivation,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })

    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, activation: updatedActivation, status: newStatus } : i
      ),
    }))
  },

  // ── clearUsageLogs ───────────────────────────────────────────────────────────
  clearUsageLogs: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const updatedActivation = { ...item.activation, usageLogs: [], usageCount: 0 }
    const updatedItem = { ...item, activation: updatedActivation }
    const newStatus: ItemStatus = deriveStatus(updatedItem)

    await db.items.update(id, {
      activation: updatedActivation,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })

    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, activation: updatedActivation, status: newStatus } : i
      ),
    }))
  },

  // ── recordReview ─────────────────────────────────────────────────────────────
  recordReview: async (id, outcome) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const { nextReviewAt, intervalDays, ease } = calculateNextReview(
      item.review.intervalDays,
      item.review.ease,
      outcome
    )

    const successful = outcome === 'good' || outcome === 'easy'
    const successfulRecalls = item.review.successfulRecalls + (successful ? 1 : 0)
    const reviewCount = item.review.reviewCount + 1

    const newReview = {
      ...item.review,
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt,
      intervalDays,
      ease,
      reviewCount,
      successfulRecalls,
    }

    const updatedItem = { ...item, review: newReview }
    const newStatus: ItemStatus = deriveStatus(updatedItem)

    await db.items.update(id, {
      review: newReview,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })

    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, review: newReview, status: newStatus } : i
      ),
    }))
  },

  // ── toggleWeeklyFocus ─────────────────────────────────────────────────────────
  // Kept for backwards compatibility — delegates to setFocusThisWeek.
  toggleWeeklyFocus: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    await get().setFocusThisWeek(id, !item.weeklyFocus)
  },

  // ── setFocusThisWeek ──────────────────────────────────────────────────────────
  setFocusThisWeek: async (id, inFocus) => {
    const now = new Date().toISOString()
    const items = get().items
    const item = items.find((i) => i.id === id)
    if (!item) return

    if (!inFocus) {
      // Removing from focus — clear both fields + metadata
      const patch = {
        weeklyFocus: false, inFocus: false,
        focusAddedAt: undefined, focusPriority: undefined, updatedAt: now,
      }
      await applyPatch(id, patch, set)
      return
    }

    // Adding to focus — compute priority
    const activeThemes = useThemesStore.getState().themes
    const priority = calcFocusPriority(item, activeThemes)

    // Enforce cap: evict lowest-priority item if at limit
    const currentFocus = items.filter((i) => i.weeklyFocus || i.inFocus)
    if (currentFocus.length >= FOCUS_MAX) {
      const [evictId] = selectEvictionCandidates(currentFocus, 1, activeThemes)
      if (evictId) {
        const evicting = items.find((i) => i.id === evictId)
        if (evicting && (evicting.focusPriority ?? 0) < priority) {
          const evictPatch = {
            weeklyFocus: false, inFocus: false,
            focusAddedAt: undefined, focusPriority: undefined, updatedAt: now,
          }
          await applyPatch(evictId, evictPatch, set)
        } else {
          return // cap reached, new item has lower priority — skip
        }
      } else {
        return
      }
    }

    const addPatch = {
      weeklyFocus: true, inFocus: true,
      focusAddedAt: now, focusPriority: priority, updatedAt: now,
    }
    await applyPatch(id, addPatch, set)
  },

  // ── addToFocusThisWeek ────────────────────────────────────────────────────────
  addToFocusThisWeek: async (ids) => {
    const now = new Date().toISOString()
    const activeThemes = useThemesStore.getState().themes
    let added = 0
    let evicted = 0

    for (const id of ids) {
      const items = get().items
      const item = items.find((i) => i.id === id)
      if (!item || item.weeklyFocus || item.inFocus) continue

      const priority = calcFocusPriority(item, activeThemes)
      const currentFocus = items.filter((i) => i.weeklyFocus || i.inFocus)

      if (currentFocus.length >= FOCUS_MAX) {
        const [evictId] = selectEvictionCandidates(currentFocus, 1, activeThemes)
        if (!evictId) continue
        const evicting = items.find((i) => i.id === evictId)
        if (!evicting || (evicting.focusPriority ?? 0) >= priority) continue
        await applyPatch(evictId, {
          weeklyFocus: false, inFocus: false,
          focusAddedAt: undefined, focusPriority: undefined, updatedAt: now,
        }, set)
        evicted++
      }

      await applyPatch(id, {
        weeklyFocus: true, inFocus: true,
        focusAddedAt: now, focusPriority: priority, updatedAt: now,
      }, set)
      added++
    }

    return { added, evicted }
  },

  // ── autoPromoteToFocus ────────────────────────────────────────────────────────
  // Rule B: auto-add struggling words (failures > successes, reviewed ≥ 3 times).
  // Capped so it never floods the focus list.
  autoPromoteToFocus: async () => {
    const items = get().items
    const focusCount = items.filter((i) => i.weeklyFocus).length
    const available = FOCUS_MAX - focusCount
    if (available <= 0) return 0

    const candidates = getRuleBCandidates(items)
    const toAdd = candidates.slice(0, Math.min(available, 5)) // max 5 auto-adds per run
    if (toAdd.length === 0) return 0

    const { added } = await get().addToFocusThisWeek(toAdd.map((i) => i.id))
    return added
  },

  // ── assignThemes ─────────────────────────────────────────────────────────────
  assignThemes: async (id, themes) => {
    await applyPatch(id, { themes, updatedAt: new Date().toISOString() }, set)
  },

  // ── moveToLearning ───────────────────────────────────────────────────────────
  moveToLearning: async (ids) => {
    const now = new Date().toISOString()
    let moved = 0, skipped = 0
    for (const id of ids) {
      const item = get().items.find((i) => i.id === id)
      if (!item || item.status !== 'inbox') { skipped++; continue }
      await applyPatch(id, { status: 'learning' as ItemStatus, updatedAt: now }, set)
      moved++
    }
    return { moved, skipped }
  },

  // ── addToChallenge ───────────────────────────────────────────────────────────
  addToChallenge: async (ids) => {
    const now = new Date().toISOString()
    let added = 0, skipped = 0
    for (const id of ids) {
      const item = get().items.find((i) => i.id === id)
      if (!item) { skipped++; continue }
      // Skip items fully mastered via challenge
      if ((item.exposureCount ?? 0) >= 8) { skipped++; continue }
      // Skip if already immediately due (already in the queue) and not inbox
      const alreadyDue = !item.nextChallengeDate ||
        Date.now() >= new Date(item.nextChallengeDate).getTime()
      if (alreadyDue && item.status !== 'inbox') { skipped++; continue }
      const patch: Partial<VocabItem> = { nextChallengeDate: now, updatedAt: now }
      if (item.status === 'inbox') patch.status = 'learning' as ItemStatus
      await applyPatch(id, patch, set)
      added++
    }
    return { added, skipped }
  },

  // ── addToWeekFocus ───────────────────────────────────────────────────────────
  addToWeekFocus: async (ids) => {
    const now = new Date().toISOString()
    let added = 0, skipped = 0
    for (const id of ids) {
      const item = get().items.find((i) => i.id === id)
      if (!item) { skipped++; continue }
      if ((item.weeklyFocus || item.inFocus) && item.status !== 'inbox') { skipped++; continue }
      const patch: Partial<VocabItem> = { weeklyFocus: true, inFocus: true, updatedAt: now }
      if (item.status === 'inbox') patch.status = 'learning' as ItemStatus
      await applyPatch(id, patch, set)
      added++
    }
    return { added, skipped }
  },

  // ── deleteItems ──────────────────────────────────────────────────────────────
  deleteItems: async (ids) => {
    const now = new Date().toISOString()
    await db.transaction('rw', db.items, async () => {
      for (const id of ids) {
        await db.items.update(id, { archived: true, updatedAt: now })
      }
    })
    set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }))
  },

  // ── importPack ──────────────────────────────────────────────────────────────
  // Bulk-imports all words from a starter pack into the inbox.
  // Uses db.items.bulkAdd (NOT addItem) so AI enrichment is NOT triggered.
  // Words already in the library (by term) are silently skipped.
  importPack: async (pack: StarterPack) => {
    const now = new Date().toISOString()
    const existingTerms = new Set(get().items.map((i) => i.term.toLowerCase()))

    const toAdd: VocabItem[] = []
    let skipped = 0

    for (const word of pack.words) {
      if (existingTerms.has(word.term.toLowerCase())) {
        skipped++
        continue
      }
      const item: VocabItem = {
        id: uid(),
        term: word.term,
        type: word.type,
        status: 'inbox',
        createdAt: now,
        updatedAt: now,
        sourceType: undefined,
        sourceText: undefined,
        tags: word.tags ?? [],
        themes: word.themes ?? [],
        definitionEn: word.definitionEn,
        translations: {},
        exampleSentence: word.exampleSentence,
        synonyms: word.synonyms ?? [],
        antonyms: word.antonyms ?? [],
        nuance: word.nuance,
        register: word.register,
        collocations: [],
        sentenceFrames: [],
        relatedPhrases: [],
        partOfSpeech: word.partOfSpeech,
        realLifeTask: word.realLifeTask,
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
        // undefined = pre-enriched seed data, no AI generation needed
        generationStatus: undefined,
        // Phase-1 fields
        level: 0,
        inFocus: false,
        difficultyScore: INITIAL_DIFFICULTY,
      }
      toAdd.push(item)
      existingTerms.add(word.term.toLowerCase())
    }

    if (toAdd.length > 0) {
      // bulkAdd skips duplicates via error catching; items already there stay untouched
      try {
        await db.items.bulkAdd(toAdd)
      } catch {
        // If bulkAdd fails (e.g. partial constraint errors), add one by one
        for (const item of toAdd) {
          await db.items.add(item).catch(() => { /* skip any remaining duplicates */ })
        }
      }
      set((s) => ({ items: [...toAdd, ...s.items] }))
    }

    // Auto-create the pack's theme in themesStore (no-op if it already exists)
    useThemesStore.getState().addTheme(pack.theme)

    // Rule C: auto-add first 15–20 imported words to Focus This Week
    if (toAdd.length > 0) {
      const focusIds = toAdd.slice(0, Math.min(20, toAdd.length)).map((i) => i.id)
      get().addToFocusThisWeek(focusIds).catch(() => {})
    }

    return { imported: toAdd.length, skipped, ids: toAdd.map((i) => i.id) }
  },

  // ── addToFocus ───────────────────────────────────────────────────────────────
  // Phase-1 replacement for addToFocusThisWeek — uses focusLogic FOCUS_MAX=150.
  addToFocus: async (ids) => {
    const now = new Date().toISOString()
    const activeThemes = useThemesStore.getState().themes
    let added = 0
    let evicted = 0

    for (const id of ids) {
      const items = get().items
      const item = items.find((i) => i.id === id)
      if (!item || item.inFocus || item.weeklyFocus) continue

      const priority = calcFocusPriority(item, activeThemes)
      const currentFocus = items.filter((i) => i.inFocus || i.weeklyFocus)

      if (currentFocus.length >= FOCUS_MAX) {
        const [evictId] = selectEvictionCandidates(currentFocus, 1, activeThemes)
        if (!evictId) continue
        const evicting = items.find((i) => i.id === evictId)
        if (!evicting || (evicting.focusPriority ?? 0) >= priority) continue
        await applyPatch(evictId, {
          inFocus: false, weeklyFocus: false,
          focusAddedAt: undefined, focusPriority: undefined, updatedAt: now,
        }, set)
        evicted++
      }

      await applyPatch(id, {
        inFocus: true, weeklyFocus: true,
        focusAddedAt: now, focusPriority: priority, updatedAt: now,
      }, set)
      added++
    }

    return { added, evicted }
  },

  // ── removeFromFocus ───────────────────────────────────────────────────────────
  removeFromFocus: async (id) => {
    const now = new Date().toISOString()
    await applyPatch(id, {
      inFocus: false, weeklyFocus: false,
      focusAddedAt: undefined, focusPriority: undefined, updatedAt: now,
    }, set)
  },

  // ── addTag / removeTag ────────────────────────────────────────────────────────
  addTag: async (id, tag) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const normalized = tag.trim().toLowerCase()
    if (!normalized || item.tags.includes(normalized)) return
    await applyPatch(id, { tags: [...item.tags, normalized], updatedAt: new Date().toISOString() }, set)
  },

  removeTag: async (id, tag) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    await applyPatch(id, { tags: item.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }, set)
  },

  // ── recordExposure ──────────────────────────────────────────────────────────
  recordExposure: async (id, correct) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const currentCount = item.exposureCount ?? 0
    // Advance on correct; keep on incorrect (retry sooner)
    const newCount = correct ? Math.min(currentCount + 1, 8) : currentCount
    const nextChallengeDate = getNextChallengeDate(newCount, correct)
    const now = new Date().toISOString()

    // Derive updated level from the post-exposure state
    const updatedForLevel = { ...item, exposureCount: newCount }
    const newLevel = deriveLevel(updatedForLevel)

    await applyPatch(
      id,
      {
        exposureCount:   newCount,
        nextChallengeDate,
        lastExposureAt:  now,
        difficultyScore: updateDifficulty(item.difficultyScore, correct),
        level:           newLevel,
        updatedAt:       now,
      },
      set,
    )
  },

  // ── recordChallengeAttempt ──────────────────────────────────────────────────
  recordChallengeAttempt: async (id, challengeType, correct, _userAnswer) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const now = new Date().toISOString()

    // ── sentence-production: mark sentenceProduced on success ─────────────
    if (challengeType === 'sentence-production' && correct) {
      if (!item.review.sentenceProduced) {
        const newReview = { ...item.review, sentenceProduced: true }
        // Derive level so that exp=8 + sentenceProduced → level=3 (Mastered)
        const updatedForLevel = { ...item, review: newReview }
        const newLevel = deriveLevel(updatedForLevel)
        // Write sentenceProduced first; recordExposure below will see this state.
        await applyPatch(id, { review: newReview, level: newLevel, updatedAt: now }, set)
      }
      // Fall through: also advance exposure/SRS for sentence-production
      await get().recordExposure(id, correct)
      return
    }

    // ── real-life-use-check: log usage; do NOT change exposure count ───────
    if (challengeType === 'real-life-use-check') {
      if (correct) {
        // "Yes, I used it" — store a speaking usage log for this word
        await get().logUsage(id, {
          usedAt: now,
          channel: 'speaking',
          note:    'Used in real life — confirmed in Daily Challenge',
        })
      }
      // Do not call recordExposure: exposure is already at 8 and the SRS
      // schedule is managed externally once the word is fully drilled.
      return
    }

    // ── all other challenge types → standard exposure recording ────────────
    await get().recordExposure(id, correct)
  },


}))

export function useDueItems(): VocabItem[] {
  return useVocabStore((s) =>
    s.items.filter(
      (i) =>
        i.status !== 'inbox' &&
        i.status !== 'mastered' &&
        isDueToday(i.review.nextReviewAt)
    )
  )
}

/** Returns Focus This Week items sorted by priority desc (highest priority first). */
export function useWeeklyFocusItems(): VocabItem[] {
  return useVocabStore((s) =>
    s.items
      .filter((i) => i.weeklyFocus && i.status !== 'mastered')
      .sort((a, b) => (b.focusPriority ?? 0) - (a.focusPriority ?? 0)),
  )
}

/** Alias — prefer this name in new code. */
export const useFocusThisWeekItems = useWeeklyFocusItems
