'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TIMELINE_EVENT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDateTime, truncateText } from '@/lib/formatters'
import type { MedicalRecordsTimelineRow } from '@/types/database.types'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Sparkles,
  Activity,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  AlertTriangle,
  Heart,
  Syringe,
  Clock,
} from 'lucide-react'

interface TimelineEntryProps {
  entry: MedicalRecordsTimelineRow
  onEdit: (entry: MedicalRecordsTimelineRow) => void
  onDelete: (id: string) => void
}

const eventTypeColorMap: Record<string, string> = {
  admission: 'blue',
  discharge: 'green',
  surgery: 'red',
  procedure: 'purple',
  anesthesia_start: 'orange',
  anesthesia_end: 'orange',
  medication_given: 'yellow',
  vital_signs: 'slate',
  lab_result: 'blue',
  imaging: 'purple',
  consultation: 'green',
  nursing_assessment: 'slate',
  physician_note: 'blue',
  code_event: 'red',
  complication: 'red',
  death: 'red',
  other: 'gray',
}

const eventTypeIconMap: Record<string, React.ElementType> = {
  admission: FileText,
  discharge: FileText,
  surgery: Stethoscope,
  procedure: Stethoscope,
  anesthesia_start: Syringe,
  anesthesia_end: Syringe,
  medication_given: Pill,
  vital_signs: Activity,
  lab_result: FlaskConical,
  imaging: FileText,
  consultation: Stethoscope,
  nursing_assessment: Heart,
  physician_note: FileText,
  code_event: AlertTriangle,
  complication: AlertTriangle,
  death: AlertTriangle,
  other: Clock,
}

export function TimelineEntry({ entry, onEdit, onDelete }: TimelineEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const eventLabel = getLabelForValue(TIMELINE_EVENT_TYPES, entry.event_type)
  const eventColor = eventTypeColorMap[entry.event_type] ?? 'gray'
  const IconComponent = eventTypeIconMap[entry.event_type] ?? Clock

  const hasExpandableContent =
    entry.description ||
    (entry.details && Object.keys(entry.details as object).length > 0)

  return (
    <Card
      className={cn(
        'transition-all',
        entry.is_significant && 'border-l-4 border-l-red-500'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge label={eventLabel} color={eventColor} />
                {entry.ai_generated && (
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                )}
                {entry.is_significant && (
                  <span className="text-xs font-medium text-red-600">Critical</span>
                )}
              </div>

              <div className="mt-1">
                <div className="text-sm font-medium">{entry.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDateTime(entry.event_datetime)}</span>
                  {entry.event_end_datetime && (
                    <>
                      <span>-</span>
                      <span>{formatDateTime(entry.event_end_datetime)}</span>
                    </>
                  )}
                </div>
              </div>

              {entry.provider_name && (
                <div className="text-xs text-muted-foreground mt-1">
                  Provider: {entry.provider_name}
                  {entry.provider_role && ` (${entry.provider_role})`}
                </div>
              )}
              {entry.facility && (
                <div className="text-xs text-muted-foreground">
                  Facility: {entry.facility}
                </div>
              )}

              {!isExpanded && entry.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {truncateText(entry.description, 120)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasExpandableContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(entry)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pl-7 space-y-3 border-t pt-3">
            {entry.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Clinical Details
                </h4>
                <p className="text-sm whitespace-pre-wrap">{entry.description}</p>
              </div>
            )}
            {entry.significance_note && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Standard of Care Notes
                </h4>
                <p className="text-sm whitespace-pre-wrap">{entry.significance_note}</p>
              </div>
            )}
            {entry.page_reference && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Page Reference
                </h4>
                <p className="text-sm">{entry.page_reference}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
