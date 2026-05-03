import { useEffect, useState, useRef } from 'react'
import { useVocabStore } from '@/store/vocabStore'

export interface RelationshipEnrichProgress {
  done: number
  total: number
  currentTerm: string
}

/**
 * Scans all vocabulary items that have never had their word relationship graph
 * built, and generates it for each one by calling generateRelatedEntries().
 *
 * Runs automatically in the background when the Library page mounts.
 * Processes 4 words concurrently with a 1.5 s pause between batches to stay
 * within Anthropic rate limits.
 *
 * Returns a progress object while running, null when done (or nothing to do).
 */
export function useRelationshipEnricher(): RelationshipEnrichProgress | null {
  const items = useVocabStore((s) => s.items)
  const generateRelatedEntries = useVocabStore((s) => s.generateRelatedEntries)
  const [progress, setProgress] = useState<RelationshipEnrichProgress | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    if (runningRef.current) return

    // Only words that have never been processed (skip complete, pending, failed)
    const unprocessed = items.filter(
      (i) =>
        i.relatedEntriesStatus !== 'complete' &&
        i.relatedEntriesStatus !== 'pending' &&
        i.relatedEntriesStatus !== 'failed',
    )

    if (unprocessed.length === 0) return

    runningRef.current = true
    let cancelled = false
    const total = unprocessed.length
    let done = 0

    setProgress({ done: 0, total, currentTerm: '' })

    async function run() {
      const BATCH = 4
      const DELAY_MS = 1500

      for (let i = 0; i < unprocessed.length; i += BATCH) {
        if (cancelled) break
        const batch = unprocessed.slice(i, i + BATCH)

        await Promise.allSettled(
          batch.map(async (item) => {
            if (cancelled) return
            try {
              await generateRelatedEntries(item.id)
            } catch {
              // silently skip — store already marks item as 'failed'
            }
            if (!cancelled) {
              done++
              setProgress({ done, total, currentTerm: item.term })
            }
          }),
        )

        if (i + BATCH < unprocessed.length && !cancelled) {
          await new Promise((r) => setTimeout(r, DELAY_MS))
        }
      }

      if (!cancelled) {
        runningRef.current = false
        setProgress(null)
      }
    }

    run()

    return () => {
      cancelled = true
      runningRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  return progress
}
