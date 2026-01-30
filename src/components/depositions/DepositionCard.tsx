'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CASE_CONTACT_ROLES, getLabelForValue } from '@/lib/constants'
import { formatDate, formatDuration } from '@/lib/formatters'
import type { DepositionRow } from '@/types/database.types'
import { Calendar, Clock, MapPin, Video, FileText } from 'lucide-react'

interface DepositionCardProps {
  deposition: DepositionRow
}

const deponentRoleLabels: Record<string, string> = {
  plaintiff: 'Plaintiff',
  defendant_provider: 'Defendant Provider',
  fact_witness: 'Fact Witness',
  expert_plaintiff: 'Expert (Plaintiff)',
  expert_defense: 'Expert (Defense)',
  other: 'Other',
}

const deponentRoleColors: Record<string, string> = {
  plaintiff: 'blue',
  defendant_provider: 'red',
  fact_witness: 'gray',
  expert_plaintiff: 'purple',
  expert_defense: 'green',
  other: 'slate',
}

const depositionStatusColors: Record<string, string> = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
  postponed: 'yellow',
  pending: 'slate',
}

export function DepositionCard({ deposition }: DepositionCardProps) {
  const roleLabel = deponentRoleLabels[deposition.deponent_role] ?? deposition.deponent_role
  const roleColor = deponentRoleColors[deposition.deponent_role] ?? 'gray'
  const statusColor = depositionStatusColors[deposition.status] ?? 'gray'

  return (
    <Link href={`/depositions/${deposition.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{deposition.deponent_name}</h3>
              <div className="flex items-center gap-2">
                <StatusBadge label={roleLabel} color={roleColor} />
                <StatusBadge
                  label={deposition.status.charAt(0).toUpperCase() + deposition.status.slice(1)}
                  color={statusColor}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDate(deposition.deposition_date)}</span>
            </div>

            {deposition.deposition_location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {deposition.is_video_recorded ? (
                  <Video className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">
                  {deposition.deposition_location}
                  {deposition.is_video_recorded && ' (Video Recorded)'}
                </span>
              </div>
            )}

            {deposition.duration_hours != null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDuration(deposition.duration_hours)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
