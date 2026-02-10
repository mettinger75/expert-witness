import { cn } from '@/lib/utils'

export function LoadingSpinner({
  className,
  size = 'default',
}: {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn('animate-spin rounded-full border-2 border-[#D8DCE3] border-t-[#C9A84C]', sizeClasses[size])}
      />
    </div>
  )
}
