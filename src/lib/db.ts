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
  }
}

export const db = new VocabDatabase()
