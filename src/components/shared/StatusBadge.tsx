import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const colorMap: Record<string, string> = {
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  green: 'bg-[#E8F5EE] text-[#15803d] border-[#bbf7d0]',
  yellow: 'bg-[#fefce8] text-[#a16207] border-[#fef08a]',
  red: 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]',
  purple: 'bg-purple-50 text-purple-800 border-purple-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
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
