/**
 * UsageProfileCard.tsx
 *
 * Compact "usage intelligence" display for a vocabulary item.
 *
 * Shows:
 *   - Formality + frequency pills (1 row)
 *   - Short signal lines (region, medium, phrase tendency) — max 3
 *   - A single naturalness hint — the most actionable signal
 *
 * Design rules:
 *   - Maximum 5 lines of content total
 *   - Naturalness hint is the strategic differentiator; always prioritise it
 *   - Never show more than 2 domain chips
 *   - Phrase/collocation tendency is only shown when non-standard
 *   - Region is only shown when there is a genuine bias
 *   - "Neutral", "international", and "standalone" are default assumptions
 *     and are deliberately NOT surfaced unless there is something interesting to say
 */

import { Lightbulb, BarChart2 } from 'lucide-react'
import type { UsageProfile } from '@/types/vocabulary'

// ── Display helpers ────────────────────────────────────────────────────────────

interface Badge {
  label: string
  className: string
}

function getFormalityBadge(formality: UsageProfile['formality']): Badge | null {
  switch (formality) {
    case 'informal':     return { label: 'Informal',     className: 'bg-slate-100 text-slate-600' }
    case 'neutral':      return null // default — not interesting to surface
    case 'formal':       return { label: 'Formal',       className: 'bg-blue-50 text-blue-700 border border-blue-200' }
    case 'academic':     return { label: 'Academic',     className: 'bg-purple-50 text-purple-700 border border-purple-200' }
    case 'professional': return { label: 'Professional', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' }
    default:             return null
  }
}

function getFrequencyBadge(frequency: UsageProfile['frequency']): Badge | null {
  switch (frequency) {
    case 'very-common':     return { label: 'Very common',      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    case 'common':          return null // default — not very interesting to surface
    case 'advanced-common': return { label: 'Advanced, common', className: 'bg-violet-50 text-violet-700 border border-violet-200' }
    case 'rare':            return { label: 'Rare',             className: 'bg-rose-50 text-rose-600 border border-rose-200' }
    default:                return null
  }
}

/** Returns a human-friendly medium label, or null if 'both' (the most common case). */
export function getMediumLabel(medium: UsageProfile['medium']): string | null {
  switch (medium) {
    case 'spoken':  return 'Mostly spoken'
    case 'written': return 'Mostly written'
    case 'both':    return null // don't clutter with the obvious default
    default:        return null
  }
}

/** Returns a human-friendly phrase-usage label, or null for the default (standalone). */
export function getPhraseUsageLabel(phraseUsage: UsageProfile['phraseUsage']): string | null {
  switch (phraseUsage) {
    case 'phrase-heavy':      return 'Often used in fixed phrases'
    case 'collocation-heavy': return 'Strong collocation word — prefers specific partners'
    case 'standalone':        return null // default — not interesting
    default:                  return null
  }
}

/** Returns a human-friendly region label, or null for neutral/international. */
export function getRegionLabel(region: UsageProfile['region']): string | null {
  switch (region) {
    case 'british':       return 'More natural in British English'
    case 'american':      return 'More natural in American English'
    case 'mixed':         return 'Common in both British and American English'
    case 'international': return null // neutral — not worth surfacing
    default:              return null
  }
}

/**
 * Returns all human-friendly signal lines for a profile, in priority order.
 * Callers may truncate to their preferred max count.
 */
export function getUsageProfileLines(profile: UsageProfile): string[] {
  const lines: string[] = []
  const regionLine     = profile.region     ? getRegionLabel(profile.region)         : null
  const mediumLine     = profile.medium     ? getMediumLabel(profile.medium)          : null
  const phraseUsageLine = profile.phraseUsage ? getPhraseUsageLabel(profile.phraseUsage) : null
  if (phraseUsageLine) lines.push(phraseUsageLine) // phrase tendency is the most actionable
  if (regionLine)      lines.push(regionLine)
  if (mediumLine)      lines.push(mediumLine)
  return lines
}

// ── Component ─────────────────────────────────────────────────────────────────

interface UsageProfileCardProps {
  profile: UsageProfile
}

export function UsageProfileCard({ profile }: UsageProfileCardProps) {
  // Collect pills
  const pills: Badge[] = []
  const formalityBadge  = profile.formality  ? getFormalityBadge(profile.formality)   : null
  const frequencyBadge  = profile.frequency  ? getFrequencyBadge(profile.frequency)   : null
  if (formalityBadge) pills.push(formalityBadge)
  if (frequencyBadge) pills.push(frequencyBadge)

  // Collect signal lines (max 3)
  const signalLines = getUsageProfileLines(profile).slice(0, 3)

  // Domains — only show first 2, only if non-empty
  const domains = (profile.domains ?? []).slice(0, 2)

  const hasContent =
    pills.length > 0 ||
    signalLines.length > 0 ||
    !!profile.naturalnessHint ||
    domains.length > 0

  if (!hasContent) return null

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <BarChart2 size={13} className="text-slate-400 shrink-0" />
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Usage Profile</h3>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-2">

        {/* Formality + frequency pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((p, i) => (
              <span
                key={i}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.className}`}
              >
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* Signal lines — medium, phrase tendency, region */}
        {signalLines.length > 0 && (
          <ul className="space-y-0.5">
            {signalLines.map((line, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        )}

        {/* Domain chips — only if present, only first 2 */}
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {domains.map((d) => (
              <span
                key={d}
                className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full capitalize"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Naturalness hint — the most valuable signal for the learner */}
        {profile.naturalnessHint && (
          <p className="flex items-start gap-1.5 text-xs text-slate-500 italic leading-relaxed">
            <Lightbulb size={11} className="shrink-0 mt-[2px] text-amber-400" />
            {profile.naturalnessHint}
          </p>
        )}

      </div>
    </div>
  )
}
