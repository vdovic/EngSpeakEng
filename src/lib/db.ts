import Dexie, { Table } from 'dexie'
import { VocabItem } from '@/types/vocabulary'

class VocabDatabase extends Dexie {
  items!: Table<VocabItem, string>

  constructor() {
    super('SpeakEnglishDB')
    this.version(1).stores({
      items: 'id, status, type, weeklyFocus, archived, &term, *tags',
    })
  }
}

export const db = new VocabDatabase()
