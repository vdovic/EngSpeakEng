import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Star, Plus } from 'lucide-react'
import { useVocabStore, useWeeklyFocusItems } from '@/store/vocabStore'
import { StatusBadge } from '@/components/StatusBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { UsageProgress } from '@/components/UsageProgress'
import { LogUsageModal } from '@/components/LogUsageModal'
import { usagePoints } from '@/lib/mastery'
import { VocabItem } from '@/types/vocabulary'

const USAGE_PROMPTS = [
  'Use this in your next meeting about priorities.',
  'Include this in an email to a stakeholder.',
  'Use this when discussing scope or risk.',
  'Try this in your daily standup.',
  'Use this when clarifying a misunderstanding.',
  'Use this in a Confluence page or Jira comment.',
  'Try this in a retrospective.',
]

function getPrompts(item: VocabItem): string[] {
  const base = USAGE_PROMPTS
  const seed = item.term.length
  return [
    base[seed % base.length],
    base[(seed + 2) % base.length],
    base[(seed + 4) % base.length],
  ]
}

export function ActiveWeekPage() {
  const navigate = useNavigate()
  const weeklyItems = useWeeklyFocusItems()
  const { toggleWeeklyFocus, items } = useVocabStore()
  const [logTarget, setLogTarget] = useState<{ id: string; term: string } | null>(null)

  const nonFocusItems = items.filter((i) => !i.weeklyFocus && i.status !== 'mastered' && i.status !== 'inbox')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">
      <div className="flex items-center gap-2 mb-2">
        <Target size={20} className="text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Active This Week</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        These are your priority words for this week. Use each at least 3 times in real life.
      </p>

      {weeklyItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
          <Star size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600 mb-1">No active items this week</p>
          <p className="text-sm text-slate-400 mb-4">
            Star items from the library or item detail to track them here.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            Browse library
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {weeklyItems.map((item) => {
            const usesDone = usagePoints(item.activation.usageLogs)
            const prompts = getPrompts(item)

            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <button
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">{item.term}</span>
                      <TypeBadge type={item.type} />
                      <StatusBadge status={item.status} />
                    </div>
                    {item.definitionEn && (
                      <p className="text-xs text-slate-500 line-clamp-1">{item.definitionEn}</p>
                    )}
                  </button>
                  <button
                    onClick={() => toggleWeeklyFocus(item.id)}
                    className="text-amber-400 hover:text-amber-600 transition-colors mt-0.5"
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                </div>

                {/* Usage progress */}
                <div className="px-4 pb-3">
                  <UsageProgress done={usesDone} needed={3} size="sm" />
                </div>

                {/* Prompts */}
                <div className="bg-amber-50 border-t border-amber-100 px-4 py-3 space-y-1.5">
                  {prompts.map((prompt, i) => (
                    <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                      <span className="font-bold shrink-0">→</span>
                      {prompt}
                    </p>
                  ))}
                </div>

                {/* Log button */}
                <div className="px-4 py-3 border-t border-slate-100">
                  <button
                    onClick={() => setLogTarget({ id: item.id, term: item.term })}
                    className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                  >
                    <Plus size={15} />
                    I used it
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add more items */}
      {nonFocusItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Add more items to this week</h2>
          <div className="space-y-2">
            {nonFocusItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                <button
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="flex-1 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">{item.term}</span>
                  {item.definitionEn && (
                    <p className="text-xs text-slate-400 line-clamp-1">{item.definitionEn}</p>
                  )}
                </button>
                <button
                  onClick={() => toggleWeeklyFocus(item.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                >
                  <Star size={16} />
                </button>
              </div>
            ))}
            {nonFocusItems.length > 5 && (
              <button
                onClick={() => navigate('/library')}
                className="w-full text-center text-xs text-brand-600 py-2 hover:underline"
              >
                Browse all {nonFocusItems.length} items in library →
              </button>
            )}
          </div>
        </div>
      )}

      {logTarget && (
        <LogUsageModal
          itemId={logTarget.id}
          term={logTarget.term}
          onClose={() => setLogTarget(null)}
        />
      )}
    </div>
  )
}
