'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Calendar, AlertTriangle } from 'lucide-react'

interface Deadline {
  id: string
  caseName: string
  deadlineType: string
  date: string
  daysUntil: number
}

// Placeholder data for the widget
const placeholderDeadlines: Deadline[] = [
  {
    id: '1',
    caseName: 'Smith v. General Hospital',
    deadlineType: 'Expert Report Due',
    date: '2026-02-10',
    daysUntil: 11,
  },
  {
    id: '2',
    caseName: 'Johnson v. Dr. Williams',
    deadlineType: 'Deposition',
    date: '2026-02-05',
    daysUntil: 6,
  },
  {
    id: '3',
    caseName: 'Davis Medical Center Case',
    deadlineType: 'Initial Review',
    date: '2026-02-02',
    daysUntil: 3,
  },
  {
    id: '4',
    caseName: 'Brown v. City Hospital',
    deadlineType: 'Trial Testimony',
    date: '2026-02-20',
    daysUntil: 21,
  },
  {
    id: '5',
    caseName: 'Wilson v. Anesthesia Associates',
    deadlineType: 'Rebuttal Report',
    date: '2026-02-15',
    daysUntil: 16,
  },
]

function getUrgencyColor(daysUntil: number): string {
  if (daysUntil < 7) return 'text-red-600 bg-red-50 border-red-200'
  if (daysUntil < 14) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

function getUrgencyDotColor(daysUntil: number): string {
  if (daysUntil < 7) return 'bg-red-500'
  if (daysUntil < 14) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function UpcomingDeadlinesWidget() {
  const deadlines = placeholderDeadlines.sort((a, b) => a.daysUntil - b.daysUntil)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Upcoming Deadlines</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {deadlines.map((deadline) => (
            <div
              key={deadline.id}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2 min-w-0">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full mt-1.5 shrink-0',
                    getUrgencyDotColor(deadline.daysUntil)
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deadline.caseName}</p>
                  <p className="text-xs text-muted-foreground">{deadline.deadlineType}</p>
                </div>
              </div>
              <div
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full border shrink-0',
                  getUrgencyColor(deadline.daysUntil)
                )}
              >
                {deadline.daysUntil === 0
                  ? 'Today'
                  : deadline.daysUntil === 1
                  ? 'Tomorrow'
                  : `${deadline.daysUntil}d`}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
