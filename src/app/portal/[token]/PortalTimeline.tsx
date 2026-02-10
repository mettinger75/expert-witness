'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'
import {
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react'

interface Communication {
  id: string
  communication_type: string
  subject: string | null
  summary: string | null
  communication_date: string
  direction: string
  participants: string | null
  notes: string | null
}

interface PortalTimelineProps {
  communications: Communication[]
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'email':
      return <Mail className="h-4 w-4" />
    case 'phone':
    case 'phone_call':
      return <Phone className="h-4 w-4" />
    case 'meeting':
    case 'conference':
      return <Calendar className="h-4 w-4" />
    case 'letter':
      return <FileText className="h-4 w-4" />
    default:
      return <MessageSquare className="h-4 w-4" />
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    email: 'Email',
    phone: 'Phone Call',
    phone_call: 'Phone Call',
    meeting: 'Meeting',
    conference: 'Conference',
    letter: 'Letter',
    fax: 'Fax',
    video_call: 'Video Call',
    in_person: 'In Person',
  }
  return labels[type] || type.replace(/_/g, ' ')
}

function groupByDate(
  communications: Communication[]
): Record<string, Communication[]> {
  const groups: Record<string, Communication[]> = {}
  // Sort chronologically (newest first)
  const sorted = [...communications].sort(
    (a, b) =>
      new Date(b.communication_date).getTime() -
      new Date(a.communication_date).getTime()
  )
  for (const comm of sorted) {
    const dateKey = comm.communication_date.split('T')[0]
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(comm)
  }
  return groups
}

export function PortalTimeline({ communications }: PortalTimelineProps) {
  if (!communications || communications.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-1">
          No Communications Yet
        </h3>
        <p className="text-sm text-gray-500">
          Communication history will appear here as the case progresses.
        </p>
      </div>
    )
  }

  const grouped = groupByDate(communications)
  const dateKeys = Object.keys(grouped)

  return (
    <div className="space-y-8">
      {dateKeys.map((dateKey) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {formatDate(dateKey)}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Communications for this date */}
          <div className="space-y-3">
            {grouped[dateKey].map((comm) => (
              <Card key={comm.id} className="py-4">
                <CardContent className="px-5 py-0">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className="w-9 h-9 rounded-full bg-[#0E1F35]/5 flex items-center justify-center text-[#0E1F35] shrink-0 mt-0.5">
                      {getTypeIcon(comm.communication_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#0E1F35]">
                          {comm.subject || getTypeLabel(comm.communication_type)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {getTypeLabel(comm.communication_type)}
                        </Badge>
                        {comm.direction && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] flex items-center gap-1 ${
                              comm.direction === 'inbound'
                                ? 'border-blue-200 text-blue-700'
                                : 'border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {comm.direction === 'inbound' ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {comm.direction}
                          </Badge>
                        )}
                      </div>

                      {comm.summary && (
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {comm.summary}
                        </p>
                      )}

                      {comm.participants && (
                        <p className="text-xs text-gray-400 mt-2">
                          Participants: {comm.participants}
                        </p>
                      )}

                      {comm.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {comm.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
