/**
 * driveMerge.test.ts
 *
 * Tests for the enhanced mergeImportedVocabItems with usageLogs union merge.
 * Covers the "learner history is sacred" guarantee:
 *   - Usage logs from both devices are always combined by ID
 *   - No usage evidence is lost even when the losing device is the structural winner
 *   - usageCount is never downgraded
 */

import { describe, it, expect } from 'vitest'
import { mergeImportedVocabItems } from '../vocabImportExport'
import type { VocabItem, UsageLog } from '@/types/vocabulary'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<VocabItem> & Pick<VocabItem, 'id' | 'term'>): VocabItem {
  return {
    type:      'word',
    status:    'learning',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    tags:      [],
    themes:    [],
    synonyms:  [],
    antonyms:  [],
    collocations:   [],
    sentenceFrames: [],
    relatedPhrases: [],
    weeklyFocus: false,
    archived:    false,
    review: {
      intervalDays:      1,
      ease:              2.5,
      reviewCount:       0,
      successfulRecalls: 0,
      sentenceProduced:  false,
    },
    activation: {
      requiredUses: 3,
      usageCount:   0,
      usageLogs:    [],
    },
    ...overrides,
  }
}

function makeLog(id: string, usedAt: string): UsageLog {
  return { id, usedAt, channel: 'speaking' }
}

// ── usageLogs union merge ─────────────────────────────────────────────────────

describe('mergeImportedVocabItems — usageLogs union merge', () => {
  it('keeps logs from the local device when remote is older and has no overlap', () => {
    const localLog  = makeLog('log-1', '2024-06-01T10:00:00.000Z')
    const remoteLog = makeLog('log-2', '2024-06-02T10:00:00.000Z')

    const local = makeItem({
      id:        'item-1',
      term:      'mitigate',
      updatedAt: '2024-06-05T00:00:00.000Z',  // local is NEWER
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [localLog] },
    })

    const remote = makeItem({
      id:        'item-1',
      term:      'mitigate',
      updatedAt: '2024-06-01T00:00:00.000Z',  // remote is OLDER
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [remoteLog] },
    })

    const { merged } = mergeImportedVocabItems([local], [remote])
    const result = merged.find((i) => i.id === 'item-1')!

    // Both logs should be present — union merge
    expect(result.activation.usageLogs).toHaveLength(2)
    const logIds = result.activation.usageLogs.map((l) => l.id)
    expect(logIds).toContain('log-1')
    expect(logIds).toContain('log-2')
  })

  it('keeps logs from the remote device when it is newer and has no overlap', () => {
    const localLog  = makeLog('log-A', '2024-06-01T10:00:00.000Z')
    const remoteLog = makeLog('log-B', '2024-06-03T10:00:00.000Z')

    const local = makeItem({
      id:        'item-2',
      term:      'align on',
      updatedAt: '2024-06-02T00:00:00.000Z',  // local is OLDER
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [localLog] },
    })

    const remote = makeItem({
      id:        'item-2',
      term:      'align on',
      updatedAt: '2024-06-04T00:00:00.000Z',  // remote is NEWER
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [remoteLog] },
    })

    const { merged } = mergeImportedVocabItems([local], [remote])
    const result = merged.find((i) => i.id === 'item-2')!

    expect(result.activation.usageLogs).toHaveLength(2)
    const logIds = result.activation.usageLogs.map((l) => l.id)
    expect(logIds).toContain('log-A')
    expect(logIds).toContain('log-B')
  })

  it('deduplicates logs with the same ID — winner version wins', () => {
    const sharedLog = makeLog('shared-log', '2024-06-01T10:00:00.000Z')
    const localShared  = { ...sharedLog, note: 'local note' }
    const remoteShared = { ...sharedLog, note: 'remote note' }

    const local = makeItem({
      id:        'item-3',
      term:      'stakeholder',
      updatedAt: '2024-06-05T00:00:00.000Z',  // local WINS
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [localShared] },
    })

    const remote = makeItem({
      id:        'item-3',
      term:      'stakeholder',
      updatedAt: '2024-06-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [remoteShared] },
    })

    const { merged } = mergeImportedVocabItems([local], [remote])
    const result = merged.find((i) => i.id === 'item-3')!

    // Only one log (deduplicated), and it should be the local (winner's) version
    expect(result.activation.usageLogs).toHaveLength(1)
    expect(result.activation.usageLogs[0].note).toBe('local note')
  })

  it('logs are sorted by usedAt after merge', () => {
    const logEarly = makeLog('early', '2024-01-01T10:00:00.000Z')
    const logLate  = makeLog('late',  '2024-12-01T10:00:00.000Z')
    const logMid   = makeLog('mid',   '2024-06-01T10:00:00.000Z')

    const local = makeItem({
      id:        'item-4',
      term:      'bandwidth',
      updatedAt: '2024-12-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 2, usageLogs: [logEarly, logLate] },
    })

    const remote = makeItem({
      id:        'item-4',
      term:      'bandwidth',
      updatedAt: '2024-06-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [logMid] },
    })

    const { merged } = mergeImportedVocabItems([local], [remote])
    const result = merged.find((i) => i.id === 'item-4')!

    const sortedIds = result.activation.usageLogs.map((l) => l.id)
    expect(sortedIds).toEqual(['early', 'mid', 'late'])
  })

  it('usageCount never decreases below merged log count', () => {
    const local = makeItem({
      id:        'item-5',
      term:      'cumbersome',
      updatedAt: '2024-06-01T00:00:00.000Z',
      activation: {
        requiredUses: 3,
        usageCount:   5,   // manually set higher than log count
        usageLogs:    [makeLog('l1', '2024-01-01T00:00:00.000Z')],
      },
    })

    const remote = makeItem({
      id:        'item-5',
      term:      'cumbersome',
      updatedAt: '2024-05-01T00:00:00.000Z',
      activation: {
        requiredUses: 3,
        usageCount:   2,
        usageLogs:    [
          makeLog('l2', '2024-02-01T00:00:00.000Z'),
          makeLog('l3', '2024-03-01T00:00:00.000Z'),
        ],
      },
    })

    const { merged } = mergeImportedVocabItems([local], [remote])
    const result = merged.find((i) => i.id === 'item-5')!

    expect(result.activation.usageLogs).toHaveLength(3)
    // usageCount should be max(5, 3) = 5 (local's manual count preserved)
    expect(result.activation.usageCount).toBe(5)
  })

  it('tracks logsUnionMerged count correctly', () => {
    const item1Local = makeItem({
      id: 'a', term: 'alpha',
      updatedAt: '2024-06-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [makeLog('l1', '2024-01-01T00:00:00.000Z')] },
    })
    const item1Remote = makeItem({
      id: 'a', term: 'alpha',
      updatedAt: '2024-05-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 1, usageLogs: [makeLog('l2', '2024-02-01T00:00:00.000Z')] },
    })

    const item2Local = makeItem({
      id: 'b', term: 'beta',
      updatedAt: '2024-06-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    })
    const item2Remote = makeItem({
      id: 'b', term: 'beta',
      updatedAt: '2024-05-01T00:00:00.000Z',
      activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    })

    const result = mergeImportedVocabItems([item1Local, item2Local], [item1Remote, item2Remote])

    // Only item1 had new logs added via union merge
    expect(result.logsUnionMerged).toBe(1)
  })
})

// ── Standard merge behaviour (regression tests) ───────────────────────────────

describe('mergeImportedVocabItems — standard behaviour', () => {
  it('adds brand new items from remote', () => {
    const local  = makeItem({ id: 'a', term: 'alpha' })
    const remote = makeItem({ id: 'b', term: 'beta' })

    const { merged, added } = mergeImportedVocabItems([local], [remote])
    expect(added).toBe(1)
    expect(merged).toHaveLength(2)
  })

  it('skips remote items whose term already exists with a different ID', () => {
    const local  = makeItem({ id: 'a', term: 'alpha' })
    const remote = makeItem({ id: 'b', term: 'Alpha ' })  // same term, different case/spaces

    const { skippedDuplicates, merged } = mergeImportedVocabItems([local], [remote])
    expect(skippedDuplicates).toBe(1)
    expect(merged).toHaveLength(1)
  })

  it('keeps local when both have same ID and local is newer', () => {
    const local = makeItem({
      id:         'a',
      term:       'alpha',
      updatedAt:  '2024-06-10T00:00:00.000Z',
      definitionEn: 'local definition',
    })
    const remote = makeItem({
      id:         'a',
      term:       'alpha',
      updatedAt:  '2024-06-01T00:00:00.000Z',
      definitionEn: 'remote definition',
    })

    const { merged, updatedExisting } = mergeImportedVocabItems([local], [remote])
    expect(updatedExisting).toBe(0)
    expect(merged[0].definitionEn).toBe('local definition')
  })

  it('takes remote when it is newer', () => {
    const local = makeItem({
      id:         'a',
      term:       'alpha',
      updatedAt:  '2024-01-01T00:00:00.000Z',
      definitionEn: 'old definition',
    })
    const remote = makeItem({
      id:         'a',
      term:       'alpha',
      updatedAt:  '2024-12-01T00:00:00.000Z',
      definitionEn: 'new definition',
    })

    const { merged, updatedExisting } = mergeImportedVocabItems([local], [remote])
    expect(updatedExisting).toBe(1)
    expect(merged[0].definitionEn).toBe('new definition')
  })
})
