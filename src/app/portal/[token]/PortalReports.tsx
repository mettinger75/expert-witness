'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'
import { FileText } from 'lucide-react'

interface CaseReport {
  id: string
  report_name: string
  report_type: string
  status: string
  version: number
  is_latest_version: boolean
  created_at: string
  updated_at: string
}

interface PortalReportsProps {
  caseReports: CaseReport[]
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

function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    preliminary_opinion: 'Preliminary Opinion',
    expert_report: 'Expert Report',
    rebuttal_report: 'Rebuttal Report',
    supplemental_report: 'Supplemental Report',
    affidavit: 'Affidavit',
    declaration: 'Declaration',
    case_summary: 'Case Summary',
    letter: 'Letter',
    other: 'Other',
  }
  return labels[type] || type.replace(/_/g, ' ')
}

export function PortalReports({ caseReports }: PortalReportsProps) {
  if (caseReports.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-1">
          No Reports Yet
        </h3>
        <p className="text-sm text-gray-500">
          Reports will appear here as they are generated for this case.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        {caseReports.length} report{caseReports.length !== 1 ? 's' : ''}{' '}
        for this case
      </p>
      {caseReports.map((report) => (
        <Card key={report.id} className="py-4">
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
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={getReportStatusColor(report.status)}>
                      {report.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {getReportTypeLabel(report.report_type)}
                    </span>
                    {report.version > 1 && (
                      <span className="text-xs text-gray-400">
                        v{report.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Updated {formatDate(report.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
