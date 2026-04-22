import { create } from 'zustand'
import { db } from '@/lib/db'
import { VocabItem, VocabItemDraft, UsageLog, ReviewOutcome, ItemStatus } from '@/types/vocabulary'
import { calculateNextReview, isDueToday } from '@/lib/srs'
import { deriveStatus } from '@/lib/mastery'
import { createSeedData } from '@/lib/seed'

interface VocabStore {
  items: VocabItem[]
  loaded: boolean
  load: () => Promise<void>
  addItem: (draft: VocabItemDraft) => Promise<string>
  updateItem: (id: string, patch: Partial<VocabItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  logUsage: (id: string, log: Omit<UsageLog, 'id'>) => Promise<void>
  recordReview: (id: string, outcome: ReviewOutcome) => Promise<void>
  toggleWeeklyFocus: (id: string) => Promise<void>
}

function uid(): string {
  return crypto.randomUUID()
}

export const useVocabStore = create<VocabStore>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    let all = await db.items.filter((i) => !i.archived).toArray()
    if (all.length === 0) {
      const seed = createSeedData()
      await db.items.bulkAdd(seed)
      all = seed
    }
    set({ items: all, loaded: true })
  },

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
    }
    await db.items.add(item)
    set((s) => ({ items: [item, ...s.items] }))
    return item.id
  },

  updateItem: async (id, patch) => {
    const now = new Date().toISOString()
    const full = { ...patch, updatedAt: now }
    await db.items.update(id, full)
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...full } : i)),
    }))
  },

  deleteItem: async (id) => {
    await db.items.update(id, { archived: true })
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

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

  toggleWeeklyFocus: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const weeklyFocus = !item.weeklyFocus
    await db.items.update(id, { weeklyFocus })
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, weeklyFocus } : i)),
    }))
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
