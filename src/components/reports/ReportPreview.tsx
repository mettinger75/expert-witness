'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { FileText, Minus } from 'lucide-react'

interface ReportSection {
  id: string
  title: string
  content: string | null
  sort_order: number
  is_ai_generated?: boolean
}

interface ReportData {
  id: string
  title: string
  report_type: string
  status: string
  content_sections: ReportSection[]
  full_content?: string | null
  word_count?: number | null
}

interface TemplateData {
  id: string
  name: string
  report_type: string
  header_template?: string | null
  footer_template?: string | null
}

interface ReportPreviewProps {
  report: ReportData
  template?: TemplateData
}

export function ReportPreview({ report, template }: ReportPreviewProps) {
  const sortedSections = [...(report.content_sections || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print-friendly container */}
      <div className="bg-white print:shadow-none">
        {/* Header */}
        <Card className="mb-6 print:border-none print:shadow-none">
          <CardContent className="p-8">
            {template?.header_template ? (
              <div
                className="text-center text-sm text-muted-foreground mb-4 whitespace-pre-wrap"
              >
                {template.header_template}
              </div>
            ) : (
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary print:hidden" />
                  <h1 className="text-xl font-bold">{report.title}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.report_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>
            )}

            <Separator className="my-4" />

            {/* Report metadata */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Status: {report.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
              {report.word_count && <span>{report.word_count.toLocaleString()} words</span>}
            </div>
          </CardContent>
        </Card>

        {/* Full content mode */}
        {report.full_content && !sortedSections.length && (
          <Card className="mb-6 print:border-none print:shadow-none">
            <CardContent className="p-8">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {report.full_content}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section-based content */}
        {sortedSections.map((section, index) => (
          <div key={section.id}>
            {/* Page break indicator between sections (screen only) */}
            {index > 0 && (
              <div className="flex items-center gap-2 my-4 print:hidden">
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Page break</span>
                <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
              </div>
            )}

            <Card
              className={cn(
                'mb-6 print:border-none print:shadow-none print:mb-0',
                'print:break-inside-avoid'
              )}
            >
              <CardContent className="p-8">
                <h2 className="text-lg font-bold mb-4">{section.title}</h2>
                {section.content ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {section.content}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    This section has not been generated yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Footer */}
        {template?.footer_template && (
          <Card className="print:border-none print:shadow-none">
            <CardContent className="p-8">
              <Separator className="mb-4" />
              <div className="text-center text-xs text-muted-foreground whitespace-pre-wrap">
                {template.footer_template}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!report.full_content && sortedSections.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No content yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This report has no content. Generate sections using AI or add content manually.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
