import { ItemType } from '@/types/vocabulary'

const CONFIG: Record<ItemType, { label: string; className: string }> = {
  word:   { label: 'Word',   className: 'bg-violet-100 text-violet-700' },
  phrase: { label: 'Phrase', className: 'bg-sky-100 text-sky-700' },
  chunk:  { label: 'Chunk',  className: 'bg-rose-100 text-rose-700' },
}

export function TypeBadge({ type }: { type: ItemType }) {
  const { label, className } = CONFIG[type]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
