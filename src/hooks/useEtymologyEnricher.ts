import { useEffect, useState, useRef } from 'react'
import { useVocabStore } from '@/store/vocabStore'

export interface EtymologyProgress {
  done: number
  total: number
}

/**
 * Scans all vocabulary items for missing etymology and silently fills
 * them in via POST /api/etymology, 5 at a time.
 *
 * Returns a progress object while running, null when finished (or nothing
 * to do).
 */
export function useEtymologyEnricher(): EtymologyProgress | null {
  const items = useVocabStore((s) => s.items)
  const updateItem = useVocabStore((s) => s.updateItem)
  const [progress, setProgress] = useState<EtymologyProgress | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    // Only run once per mount; skip if already running
    if (runningRef.current) return

    const missing = items.filter((i) => !i.etymology && i.generationStatus !== 'pending')
    if (missing.length === 0) return

    runningRef.current = true
    let cancelled = false
    const total = missing.length
    let done = 0

    setProgress({ done: 0, total })

    async function run() {
      const BATCH = 5
      const DELAY_MS = 1200 // stay safely under Anthropic rate limits

      for (let i = 0; i < missing.length; i += BATCH) {
        if (cancelled) break

        const batch = missing.slice(i, i + BATCH)

        await Promise.allSettled(
          batch.map(async (item) => {
            if (cancelled) return
            try {
              const r = await fetch('/api/etymology', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term: item.term, type: item.type }),
              })
              if (!r.ok) return

              const data: { etymology?: string; memoryCue?: string } = await r.json()

              const patch: Record<string, string> = {}
              if (data.etymology) patch.etymology = data.etymology
              // Refresh memoryCue only if the word doesn't have one yet
              if (data.memoryCue && !item.memoryCue) patch.memoryCue = data.memoryCue

              if (Object.keys(patch).length > 0) {
                await updateItem(item.id, patch as any)
              }
            } catch {
              // silently skip on error; word stays in DB unchanged
            }

            if (!cancelled) {
              done++
              setProgress({ done, total })
            }
          })
        )

        if (i + BATCH < missing.length && !cancelled) {
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
  }, []) // intentionally run only once on mount

  return progress
}
