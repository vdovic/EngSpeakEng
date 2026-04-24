import { create } from 'zustand'
import { db } from '@/lib/db'
import { VocabItem, VocabItemDraft, UsageLog, ReviewOutcome, ItemStatus } from '@/types/vocabulary'
import { calculateNextReview, isDueToday } from '@/lib/srs'
import { deriveStatus } from '@/lib/mastery'
import { createSeedData } from '@/lib/seed'
import { getNextChallengeDate } from '@/lib/challengeSchedule'

interface VocabStore {
  items: VocabItem[]
  loaded: boolean
  load: () => Promise<void>
  addItem: (draft: VocabItemDraft) => Promise<string>
  enrichItem: (id: string) => Promise<void>
  updateItem: (id: string, patch: Partial<VocabItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  logUsage: (id: string, log: Omit<UsageLog, 'id'>) => Promise<void>
  recordReview: (id: string, outcome: ReviewOutcome) => Promise<void>
  toggleWeeklyFocus: (id: string) => Promise<void>
  /** Record one challenge exposure for an item. Advances the SRS counter on
   *  correct answers; on incorrect it keeps the count and retries sooner. */
  recordExposure: (id: string, correct: boolean) => Promise<void>
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
    let all = await db.items.filter((i) => !i.archived).toArray()
    if (all.length === 0) {
      // On a fresh install, try to seed from the pre-enriched migration file
      // (served as a static asset). Falls back to the small built-in seed if
      // the file is missing or the fetch fails (e.g., local dev without it).
      let seed: VocabItem[]
      try {
        const res = await fetch('/data/migration-vocab.json')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        seed = (await res.json()) as VocabItem[]
        console.info(`[load] Seeding from migration data: ${seed.length} items`)
      } catch {
        console.info('[load] Migration data not available — using built-in seed')
        seed = createSeedData()
      }
      // bulkAdd is safe here because the DB is empty. If a term collision occurs
      // (shouldn't after dedup) we fall back to a one-by-one insert that skips
      // any violations rather than aborting the entire import.
      try {
        await db.items.bulkAdd(seed)
      } catch {
        for (const item of seed) {
          await db.items.add(item).catch(() => { /* skip duplicates */ })
        }
      }
      all = await db.items.filter((i) => !i.archived).toArray()
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
    } catch (err: unknown) {
      const generationError =
        err instanceof Error ? err.message : 'Generation failed. Please retry.'

      console.error(`[enrichItem] failed for "${item.term}":`, generationError)

      await applyPatch(id, { generationStatus: 'failed', generationError }, set)
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
