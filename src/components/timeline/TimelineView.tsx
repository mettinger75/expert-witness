'use client'

import { TimelineEntry } from '@/components/timeline/TimelineEntry'
import { EmptyState } from '@/components/shared/EmptyState'
import type { MedicalRecordsTimelineRow } from '@/types/database.types'
import { Clock } from 'lucide-react'

interface TimelineViewProps {
  entries: MedicalRecordsTimelineRow[]
  onEdit: (entry: MedicalRecordsTimelineRow) => void
  onDelete: (id: string) => void
}

export function TimelineView({ entries, onEdit, onDelete }: TimelineViewProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No timeline entries"
        description="Add medical records timeline events to track the chronological history of this case."
      />
    )
  }

  // Sort by event_date chronologically
  const sorted = [...entries].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )

  // Group by date
  const grouped = sorted.reduce<Record<string, MedicalRecordsTimelineRow[]>>((acc, entry) => {
    const dateKey = entry.event_date
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(entry)
    return acc
  }, {})

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {Object.entries(grouped).map(([dateKey, dateEntries]) => {
          const dateObj = new Date(dateKey + 'T00:00:00')
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' })

          return (
            <div key={dateKey} className="relative">
              {/* Date marker */}
              <div className="flex items-start gap-4">
                <div className="w-[6.5rem] text-right shrink-0 pt-1">
                  <div className="text-sm font-semibold">{formattedDate}</div>
                  <div className="text-xs text-muted-foreground">{dayOfWeek}</div>
                </div>

                {/* Dot on timeline */}
                <div className="relative z-10 mt-2">
                  <div className="h-3 w-3 rounded-full bg-primary border-2 border-background" />
                </div>

                {/* Entries for this date */}
                <div className="flex-1 space-y-3 pb-2">
                  {dateEntries.map((entry) => (
                    <TimelineEntry
                      key={entry.id}
                      entry={entry}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
