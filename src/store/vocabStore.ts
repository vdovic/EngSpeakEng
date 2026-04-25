import { create } from 'zustand'
import { db } from '@/lib/db'
import { VocabItem, VocabItemDraft, UsageLog, ReviewOutcome, ItemStatus } from '@/types/vocabulary'
import { calculateNextReview, isDueToday } from '@/lib/srs'
import { deriveStatus } from '@/lib/mastery'
import { createSeedData } from '@/lib/seed'
import { getNextChallengeDate } from '@/lib/challengeSchedule'
import { generateCandidates, validateRelatedEntries } from '@/lib/relatedEntries'

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
  recordReview: (id: string, outcome: ReviewOutcome) => Promise<void>
  toggleWeeklyFocus: (id: string) => Promise<void>
  /** Record one challenge exposure for an item. Advances the SRS counter on
   *  correct answers; on incorrect it keeps the count and retries sooner. */
  recordExposure: (id: string, correct: boolean) => Promise<void>
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
      console.info(`[load] Seeding from migration data: ${seed.length} items`)
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
        console.info(`[load] Top-up: adding ${missing.length} missing migration items`)
        for (const item of missing) {
          await db.items.add(item).catch(() => { /* skip term collisions */ })
        }
        all = (await db.items.filter((i) => !i.archived).toArray()).map((i) => ({
          ...i,
          themes: i.themes ?? [],
        }))
      }
    }

    set({ items: all, loaded: true })

    // Re-trigger enrichment for any items that were 'pending' when the app
    // was previously closed (e.g., tab killed mid-generation).
    const stuck = all.filter((i) => i.generationStatus === 'pending')
    for (const item of stuck) {
      get().enrichItem(item.id).catch(() => {
        // enrichItem handles its own errors; this prevents unhandled rejections
      })
    }
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

      if (candidates.length === 0) {
        await applyPatch(id, { relatedEntriesStatus: 'complete', relatedEntries: [] }, set)
        return
      }

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

      const { entries } = (await res.json()) as { entries: unknown[] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validated = validateRelatedEntries(entries as any, allItems)

      await applyPatch(
        id,
        {
          relatedEntries: validated,
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

  // ── toggleWeeklyFocus ────────────────────────────────────────────────────────
  toggleWeeklyFocus: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const weeklyFocus = !item.weeklyFocus
    await db.items.update(id, { weeklyFocus })
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, weeklyFocus } : i)),
    }))
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
      // Skip if already in focus list and not promoting from inbox
      if (item.weeklyFocus && item.status !== 'inbox') { skipped++; continue }
      const patch: Partial<VocabItem> = { weeklyFocus: true, updatedAt: now }
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

  // ── recordExposure ──────────────────────────────────────────────────────────
  recordExposure: async (id, correct) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const currentCount = item.exposureCount ?? 0
    // Advance on correct; keep on incorrect (retry sooner)
    const newCount = correct ? Math.min(currentCount + 1, 8) : currentCount
    const nextChallengeDate = getNextChallengeDate(newCount, correct)

    await applyPatch(
      id,
      { exposureCount: newCount, nextChallengeDate, updatedAt: new Date().toISOString() },
      set,
    )
  },
}))

export function useDueItems(): VocabItem[] {
  return useVocabStore((s) =>
    s.items.filter(
      (i) => i.status !== 'inbox' && i.status !== 'mastered' && isDueToday(i.review.nextReviewAt)
    )
  )
}

export function useWeeklyFocusItems(): VocabItem[] {
  return useVocabStore((s) => s.items.filter((i) => i.weeklyFocus && i.status !== 'mastered'))
}
