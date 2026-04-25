import { ItemStatus } from '@/types/vocabulary'

const CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  inbox:      { label: 'NEW',         className: 'bg-slate-100 text-slate-600' },
  learning:   { label: 'LEARNING',    className: 'bg-blue-100 text-blue-700' },
  stable:     { label: 'STABILISING', className: 'bg-teal-100 text-teal-700' },
  activation: { label: 'ACTIVATING',  className: 'bg-amber-100 text-amber-700' },
  mastered:   { label: 'MASTERED',    className: 'bg-emerald-100 text-emerald-700' },
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
