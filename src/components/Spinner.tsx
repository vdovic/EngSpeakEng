const SIZE_CLS = {
  sm: 'w-5 h-5 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-8 h-8 border-2',
} as const

interface SpinnerProps {
  size?: keyof typeof SIZE_CLS
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${SIZE_CLS[size]} border-brand-500 border-t-transparent rounded-full animate-spin ${className}`}
    />
  )
}
