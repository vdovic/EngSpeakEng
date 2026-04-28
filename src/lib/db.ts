import Dexie, { Table } from 'dexie'
import { VocabItem } from '@/types/vocabulary'

class VocabDatabase extends Dexie {
  items!: Table<VocabItem, string>

  constructor() {
    super('SpeakEnglishDB')

    // v1 — original schema (small built-in seed data)
    this.version(1).stores({
      items: 'id, status, type, weeklyFocus, archived, &term, *tags',
    })

    // v2 — bulk migration data available.
    // The upgrade wipes any existing items so load() re-seeds from
    // public/data/migration-vocab.json (all 1 156 enriched entries).
    // User-created words added before this version are intentionally cleared
    // because the app is still in initial setup / development.
    this.version(2)
      .stores({
        items: 'id, status, type, weeklyFocus, archived, &term, *tags',
      })
      .upgrade((tx) => tx.table('items').clear())

    // v3 — add *themes multi-value index.
    // No data wipe — existing items just get themes: [] defaulted in load().
    this.version(3).stores({
      items: 'id, status, type, weeklyFocus, archived, &term, *tags, *themes',
    })

    // v4 — add learned index for filtering.
    // No data wipe — existing items default to learned: undefined (falsy).
    this.version(4).stores({
      items: 'id, status, type, weeklyFocus, archived, learned, &term, *tags, *themes',
    })

    // v5 — remove separate learned concept; merge into mastered status.
    // Any item that was manually marked learned is promoted to mastered.
    this.version(5)
      .stores({
        items: 'id, status, type, weeklyFocus, archived, &term, *tags, *themes',
      })
      .upgrade((tx) =>
        tx
          .table('items')
          .filter((item) => item.learned === true)
          .modify({ status: 'mastered', learned: undefined }),
      )
  }
}

export const db = new VocabDatabase()
