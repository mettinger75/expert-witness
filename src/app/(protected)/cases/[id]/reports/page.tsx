'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { REPORT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { Plus, FileCheck, FileText, Eye } from 'lucide-react'

const REPORT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'in_review', label: 'In Review', color: 'yellow' },
  { value: 'finalized', label: 'Finalized', color: 'green' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
] as const

function getReportStatusColor(status: string): string {
  const s = REPORT_STATUSES.find((rs) => rs.value === status)
  return s?.color ?? 'gray'
}

function getReportStatusLabel(status: string): string {
  const s = REPORT_STATUSES.find((rs) => rs.value === status)
  return s?.label ?? status
}

// Placeholder reports
const placeholderReports = [
  { id: '1', title: 'Expert Report - Standard of Care Analysis', report_type: 'expert_report', status: 'finalized', created_at: '2025-09-01', version: 2 },
  { id: '2', title: 'Preliminary Opinion Letter', report_type: 'preliminary_opinion', status: 'submitted', created_at: '2025-08-10', version: 1 },
  { id: '3', title: 'Supplemental Report - Additional Records', report_type: 'supplemental_report', status: 'draft', created_at: '2025-10-15', version: 1 },
]

// Placeholder template list for selection
const availableTemplates = [
  { id: '1', name: 'Standard Expert Report', report_type: 'expert_report' },
  { id: '2', name: 'Preliminary Opinion Letter', report_type: 'preliminary_opinion' },
  { id: '3', name: 'Rebuttal Report', report_type: 'rebuttal_report' },
  { id: '4', name: 'Affidavit of Merit', report_type: 'affidavit' },
]

export default function CaseReportsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [generateOpen, setGenerateOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewReport, setPreviewReport] = useState<typeof placeholderReports[0] | null>(null)

  function openPreview(report: typeof placeholderReports[0]) {
    setPreviewReport(report)
    setPreviewOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">Generated reports and expert opinions</p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select a template to generate a new report for this case.
              </p>
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setGenerateOpen(false)}
                  >
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getLabelForValue(REPORT_TYPES, template.report_type)}
                      </div>
                    </div>
                    <Button size="sm">Generate</Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {placeholderReports.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No reports generated"
          description="Generate a report using one of your templates."
          action={
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {placeholderReports.map((report) => (
            <Card key={report.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-2 rounded-md bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{report.title}</h3>
                    <Badge variant="secondary">
                      {getLabelForValue(REPORT_TYPES, report.report_type)}
                    </Badge>
                    <StatusBadge
                      label={getReportStatusLabel(report.status)}
                      color={getReportStatusColor(report.status)}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{formatDate(report.created_at)}</span>
                    <span>Version {report.version}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openPreview(report)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewReport?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">
                {previewReport && getLabelForValue(REPORT_TYPES, previewReport.report_type)}
              </Badge>
              {previewReport && (
                <StatusBadge
                  label={getReportStatusLabel(previewReport.status)}
                  color={getReportStatusColor(previewReport.status)}
                />
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">
                Report content preview will be displayed here once the report is generated.
                This would include all sections from the template, populated with case-specific content.
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-md text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Report content placeholder</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
