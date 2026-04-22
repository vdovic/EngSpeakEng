interface Props {
  done: number
  needed: number
  size?: 'sm' | 'md'
}

export function UsageProgress({ done, needed, size = 'md' }: Props) {
  const dots = Array.from({ length: needed }, (_, i) => i < done)
  const label = `${done}/${needed}`

  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`${dotSize} rounded-full border-2 transition-colors ${
              filled ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">Used {label}</span>
    </div>
  )
}
