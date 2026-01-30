import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  slate: 'bg-slate-100 text-slate-800 border-slate-200',
}

interface StatusBadgeProps {
  label: string
  color?: string
  className?: string
}

export function StatusBadge({
  label,
  color = 'gray',
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        colorMap[color] || colorMap.gray,
        'font-medium',
        className
      )}
    >
      {label}
    </Badge>
  )
}
