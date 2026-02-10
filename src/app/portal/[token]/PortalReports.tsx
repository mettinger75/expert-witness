'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'
import { FileText, ExternalLink } from 'lucide-react'

interface SharedReport {
  id: string
  entity_id: string
  token: string
  is_active: boolean
  reports: {
    id: string
    report_name: string
    status: string
    created_at: string
    updated_at: string
  } | null
}

interface PortalReportsProps {
  sharedReports: SharedReport[]
  canEdit: boolean
}

function getReportStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-800',
    ai_generating: 'bg-purple-100 text-purple-800',
    review: 'bg-amber-100 text-amber-800',
    revision: 'bg-orange-100 text-orange-800',
    final: 'bg-emerald-100 text-emerald-800',
    sent: 'bg-green-100 text-green-800',
    superseded: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function PortalReports({ sharedReports, canEdit }: PortalReportsProps) {
  // Filter to only active links with valid reports
  const activeReports = sharedReports.filter(
    (sr) => sr.is_active && sr.reports
  )

  if (activeReports.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-1">
          No Reports Shared
        </h3>
        <p className="text-sm text-gray-500">
          Reports will appear here when Dr. Ettinger shares them with you.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        {activeReports.length} report{activeReports.length !== 1 ? 's' : ''}{' '}
        shared with you
      </p>
      {activeReports.map((sr) => {
        const report = sr.reports!
        return (
          <Card key={sr.id} className="py-4">
            <CardContent className="px-5 py-0">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0E1F35]/5 flex items-center justify-center text-[#0E1F35] shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {report.report_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getReportStatusColor(report.status)}>
                        {report.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Updated {formatDate(report.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  asChild
                >
                  <a
                    href={`/shared/${sr.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {canEdit ? 'Edit' : 'View'}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
