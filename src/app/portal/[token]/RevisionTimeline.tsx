'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/formatters'
import { User, Stethoscope, StickyNote } from 'lucide-react'

interface ReportRevision {
  id: string
  revisionNumber: number
  submittedBy: string // 'attorney' | 'provider'
  submittedByName: string
  submittedHtml: string
  baseHtml: string
  notes: string | null
  status: string
  reviewerNotes: string | null
  reviewedAt: string | null
  createdAt: string
}

interface RevisionTimelineProps {
  revisions: ReportRevision[]
  onSelectRevision: (revision: ReportRevision) => void
  activeRevisionId: string | null
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    pending_review: {
      label: 'Pending Review',
      className: 'bg-amber-100 text-amber-800',
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-100 text-emerald-800',
    },
    changes_requested: {
      label: 'Changes Requested',
      className: 'bg-orange-100 text-orange-800',
    },
    superseded: {
      label: 'Superseded',
      className: 'bg-gray-100 text-gray-500',
    },
  }
  const c = config[status] || {
    label: status.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-700',
  }
  return <Badge className={c.className}>{c.label}</Badge>
}

export function RevisionTimeline({
  revisions,
  onSelectRevision,
  activeRevisionId,
}: RevisionTimelineProps) {
  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No revisions yet.
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <h4 className="text-sm font-semibold text-[#0E1F35] mb-4">
        Revision History
      </h4>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-3">
          {revisions.map((revision) => {
            const isAttorney = revision.submittedBy === 'attorney'
            const isActive = activeRevisionId === revision.id
            const borderColor = isAttorney
              ? 'border-l-[#C9A84C]'
              : 'border-l-[#0E1F35]'

            return (
              <div key={revision.id} className="relative pl-12">
                {/* Timeline icon */}
                <div
                  className={`absolute left-2.5 top-4 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                    isAttorney
                      ? 'bg-[#C9A84C]/20 text-[#C9A84C]'
                      : 'bg-[#0E1F35]/10 text-[#0E1F35]'
                  }`}
                >
                  {isAttorney ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Stethoscope className="h-3 w-3" />
                  )}
                </div>

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${borderColor} ${
                    isActive
                      ? 'ring-2 ring-[#C9A84C]/50 shadow-md'
                      : 'hover:border-l-4'
                  }`}
                  onClick={() => onSelectRevision(revision)}
                >
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0E1F35]">
                          {revision.submittedByName}
                        </span>
                        <span className="text-xs text-gray-400">
                          Round {revision.revisionNumber}
                        </span>
                      </div>
                      {getStatusBadge(revision.status)}
                    </div>

                    <p className="text-xs text-gray-400">
                      {formatDate(revision.createdAt)}
                    </p>

                    {revision.notes && (
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-600">
                        <StickyNote className="h-3 w-3 shrink-0 mt-0.5 text-gray-400" />
                        <span className="line-clamp-2">{revision.notes}</span>
                      </div>
                    )}

                    {revision.reviewerNotes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 border-l-2 border-[#0E1F35]/30">
                        <span className="font-medium text-[#0E1F35]">
                          Reviewer:{' '}
                        </span>
                        {revision.reviewerNotes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
