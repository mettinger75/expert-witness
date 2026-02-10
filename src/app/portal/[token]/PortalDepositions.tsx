'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gavel, Calendar, MapPin, Video, Clock } from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/formatters'

interface DepositionPortalItem {
  id: string
  deponent_name: string
  deponent_role: string
  deposition_date: string
  deposition_location: string | null
  status: string
  is_video_recorded: boolean
  duration_hours: number | null
  summary: string | null
  ai_summary: string | null
  key_admissions: string[] | null
}

interface PortalDepositionsProps {
  depositions: DepositionPortalItem[]
}

const DEPONENT_ROLE_LABELS: Record<string, string> = {
  plaintiff: 'Plaintiff',
  defendant: 'Defendant',
  defendant_provider: 'Defendant Provider',
  treating_physician: 'Treating Physician',
  expert_witness: 'Expert Witness',
  expert_plaintiff: 'Expert (Plaintiff)',
  expert_defense: 'Expert (Defense)',
  fact_witness: 'Fact Witness',
  nurse: 'Nurse',
  first_responder: 'First Responder',
  corporate_representative: 'Corporate Representative',
  other: 'Other',
}

function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'scheduled':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function PortalDepositions({ depositions }: PortalDepositionsProps) {
  if (depositions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Gavel className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No depositions recorded for this case yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Gavel className="h-5 w-5 text-[#C9A84C]" />
        <h3 className="text-lg font-semibold text-[#0E1F35]">Depositions</h3>
        <Badge variant="outline" className="ml-auto">
          {depositions.length} total
        </Badge>
      </div>

      {depositions.map((depo) => {
        const roleLabel =
          DEPONENT_ROLE_LABELS[depo.deponent_role] ?? depo.deponent_role
        const displaySummary = depo.summary || depo.ai_summary

        return (
          <Card key={depo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[#0E1F35]">
                    {depo.deponent_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs border-[#C9A84C]/40 text-[#0E1F35]"
                    >
                      {roleLabel}
                    </Badge>
                    <Badge variant={getStatusVariant(depo.status)}>
                      {depo.status.charAt(0).toUpperCase() +
                        depo.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                {depo.is_video_recorded && (
                  <div className="flex items-center gap-1 text-xs text-[#C9A84C] font-medium">
                    <Video className="h-4 w-4" />
                    Video
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(depo.deposition_date)}
                </div>
                {depo.deposition_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {depo.deposition_location}
                  </div>
                )}
                {depo.duration_hours != null && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {formatDuration(depo.duration_hours)}
                  </div>
                )}
              </div>

              {displaySummary && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {displaySummary}
                </p>
              )}

              {depo.key_admissions && depo.key_admissions.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Key Admissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {depo.key_admissions.map((admission, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-xs bg-[#0E1F35]/5 text-[#0E1F35] px-2 py-0.5 rounded-full"
                      >
                        {admission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
