import { ItemType } from '@/types/vocabulary'

const CONFIG: Record<ItemType, { label: string; className: string }> = {
  word:          { label: 'Word',         className: 'bg-violet-100 text-violet-700' },
  phrase:        { label: 'Phrase',       className: 'bg-sky-100 text-sky-700' },
  chunk:         { label: 'Chunk',        className: 'bg-rose-100 text-rose-700' },
  idiom:         { label: 'Idiom',        className: 'bg-amber-100 text-amber-700' },
  'phrasal-verb':{ label: 'Phrasal verb', className: 'bg-emerald-100 text-emerald-700' },
  collocation:   { label: 'Collocation',  className: 'bg-indigo-100 text-indigo-700' },
}

export function TypeBadge({ type }: { type: ItemType }) {
  const cfg = CONFIG[type] ?? CONFIG.word
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
