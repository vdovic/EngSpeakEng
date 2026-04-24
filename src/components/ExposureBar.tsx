import { intervalLabel } from '@/lib/challengeSchedule'

interface Props {
  exposureCount: number | undefined
  nextChallengeDate?: string
  size?: 'sm' | 'md'
}

const MAX_STEPS = 8

/**
 * Visual 0–8 step progress bar for daily-challenge SRS exposure.
 * Shows filled dots for completed steps and an empty dot for each remaining.
 */
export function ExposureBar({ exposureCount, nextChallengeDate, size = 'md' }: Props) {
  const count = Math.min(exposureCount ?? 0, MAX_STEPS)
  const isComplete = count >= MAX_STEPS

  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex items-center gap-2">
      {/* Dots */}
      <div className="flex gap-1">
        {Array.from({ length: MAX_STEPS }, (_, i) => (
          <div
            key={i}
            className={`${dotSize} rounded-full border-2 transition-colors ${
              i < count
                ? 'bg-brand-500 border-brand-500'
                : 'bg-white border-slate-300'
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <span className={`${textSize} font-medium ${isComplete ? 'text-emerald-600' : 'text-slate-500'}`}>
        {isComplete ? (
          '✓ Mastered'
        ) : (
          <>
            {count}/{MAX_STEPS}
            {nextChallengeDate && !isComplete && (
              <span className="text-slate-400 font-normal ml-1">
                (next: {intervalLabel(count)})
              </span>
            )}
          </>
        )}
      </span>
    </div>
  )
}
