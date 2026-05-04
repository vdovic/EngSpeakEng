import { GraduationCap } from 'lucide-react'
import { ItemStatus } from '@/types/vocabulary'

const CONFIG: Record<ItemStatus, { label: string; className: string; icon?: boolean }> = {
  inbox:      { label: 'New',      className: 'bg-slate-100 text-slate-600' },
  learning:   { label: 'Learning', className: 'bg-blue-100 text-blue-700' },
  stable:     { label: 'Familiar',   className: 'bg-teal-100 text-teal-700' },
  activation: { label: 'Activating', className: 'bg-amber-100 text-amber-700' },
  mastered:   { label: 'Mastered', className: 'bg-violet-100 text-violet-700', icon: true },
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, className, icon } = CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {icon && <GraduationCap size={10} className="shrink-0" />}
      {label}
    </span>
  )
}
