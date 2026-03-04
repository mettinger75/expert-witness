'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { REPORT_TYPES, getLabelForValue } from '@/lib/constants'
import type { ReportUpdate } from '@/types/database.types'
import { formatDate } from '@/lib/formatters'
import {
  useReports,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useReportTemplates,
  useGenerateReport,
  useSaveReportSections,
} from '@/hooks/useReports'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { DocxImportButton } from '@/components/editor/DocxImportButton'
import { ShareDialog } from '@/components/sharing/ShareDialog'
import { RedlineView } from '@/components/editor/RedlineView'
import { InteractiveRedlineReview } from '@/components/editor/InteractiveRedlineReview'
import { toast } from 'sonner'
import { SendToAttorneyDialog } from '@/components/reports/SendToAttorneyDialog'
import {
  Plus,
  FileCheck,
  FileText,
  Eye,
  Sparkles,
  Save,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Pencil,
  Check,
  X,
  Download,
  Share2,
  Upload,
  GitCompareArrows,
  Trash2,
  FilePlus,
  StickyNote,
  Send,
  Gavel,
  RotateCcw,
  Shield,
  Bell,
  FileDown,
} from 'lucide-react'

const REPORT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'ai_generating', label: 'Generating', color: 'yellow' },
  { value: 'review', label: 'Edits Submitted', color: 'orange' },
  { value: 'attorney_review', label: 'With Attorney', color: 'yellow' },
  { value: 'revision', label: 'Revision', color: 'yellow' },
  { value: 'final', label: 'Final', color: 'green' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'superseded', label: 'Superseded', color: 'gray' },
] as const

function getReportStatusColor(status: string): string {
  const s = REPORT_STATUSES.find((rs) => rs.value === status)
  return s?.color ?? 'gray'
}

function getReportStatusLabel(status: string): string {
  const s = REPORT_STATUSES.find((rs) => rs.value === status)
  return s?.label ?? status
}

interface SectionData {
  title: string
  content: string
  is_ai_generated: boolean
}

interface GeneratedReport {
  header: string
  footer: string
  sections: Record<string, SectionData>
}

// Section editor component
function SectionEditor({
  sectionKey,
  section,
  onUpdate,
  onRegenerate,
  isRegenerating,
}: {
  sectionKey: string
  section: SectionData
  onUpdate: (key: string, content: string) => void
  onRegenerate: (key: string) => void
  isRegenerating: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(section.content)

  const handleSave = () => {
    onUpdate(sectionKey, editContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent(section.content)
    setIsEditing(false)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="font-semibold text-sm">{section.title}</h3>
          {section.is_ai_generated && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Generated
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {section.is_ai_generated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(sectionKey)}
              disabled={isRegenerating}
              className="h-7 text-xs"
            >
              {isRegenerating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Regenerate
            </Button>
          )}
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(true)
                setIsExpanded(true)
              }}
              className="h-7 text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave} className="h-7 text-xs text-green-600">
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="p-4">
          {isEditing ? (
            <TiptapEditor
              content={editContent}
              onUpdate={(html) => setEditContent(html)}
              editable={true}
              placeholder="Write section content..."
            />
          ) : (
            <TiptapEditor
              content={section.content}
              editable={false}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Full report preview modal
function ReportPreview({
  report,
  open,
  onOpenChange,
}: {
  report: GeneratedReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!report) return null

  const sectionOrder = [
    'introduction',
    'qualifications',
    'narrative_summary',
    'clinical_analysis',
    'breach_analysis',
    'causation',
    'conclusion',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Preview</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6" style={{ fontFamily: 'Georgia, serif' }}>
          {/* Header */}
          <div className="text-center border-b pb-4 whitespace-pre-line text-sm font-bold">
            {report.header}
          </div>

          {/* Sections in order */}
          {sectionOrder.map((key) => {
            const section = report.sections[key]
            if (!section) return null
            return (
              <div key={key}>
                <h2 className="font-bold text-base mb-2">{section.title}</h2>
                <TiptapEditor content={section.content} editable={false} />
              </div>
            )
          })}

          {/* Footer */}
          <div className="border-t pt-4 whitespace-pre-line text-sm">
            {report.footer}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CaseReportsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [generateOpen, setGenerateOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activeReport, setActiveReport] = useState<GeneratedReport | null>(null)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)

  const { data: reports, isLoading: reportsLoading } = useReports(caseId)
  const { data: templates, isLoading: templatesLoading } = useReportTemplates()
  const createReport = useCreateReport()
  const updateReport = useUpdateReport()
  const deleteReport = useDeleteReport()
  const generateReport = useGenerateReport()
  const saveSections = useSaveReportSections()

  const handleGenerate = useCallback(
    async (templateId: string, templateName: string) => {
      setGenerateOpen(false)

      // Create report record first
      const report = await createReport.mutateAsync({
        case_id: caseId,
        template_id: templateId,
        report_type: 'expert_report',
        report_name: templateName,
        status: 'draft',
      })

      setActiveReportId(report.id)

      // Generate all sections
      const result = await generateReport.mutateAsync({
        caseId,
        templateId,
        reportId: report.id,
      })

      setActiveReport({
        header: result.header,
        footer: result.footer,
        sections: result.sections,
      })
    },
    [caseId, createReport, generateReport]
  )

  const handleLoadExisting = useCallback(
    (report: { id: string; content: Record<string, unknown> | null; sections_data: Record<string, SectionData> | null; rendered_html?: string | null }) => {
      setActiveReportId(report.id)

      // Check for monolithic imported report
      if (report.content && typeof report.content === 'object' && (report.content as Record<string, unknown>).import_mode === 'monolithic') {
        const html = (report.content as Record<string, unknown>).html as string || report.rendered_html || ''
        setMonolithicHtml(html)
        setActiveReport(null)
        return
      }

      setMonolithicHtml(null)

      if (report.content && typeof report.content === 'object' && 'sections' in report.content) {
        const c = report.content as { header: string; footer: string; sections: Record<string, SectionData> }
        setActiveReport({
          header: c.header || '',
          footer: c.footer || '',
          sections: c.sections || {},
        })
      } else if (report.sections_data) {
        setActiveReport({
          header: '',
          footer: '',
          sections: report.sections_data as Record<string, SectionData>,
        })
      }
    },
    []
  )

  const handleSectionUpdate = useCallback(
    (sectionKey: string, content: string) => {
      if (!activeReport) return
      const updated = {
        ...activeReport,
        sections: {
          ...activeReport.sections,
          [sectionKey]: {
            ...activeReport.sections[sectionKey],
            content,
          },
        },
      }
      setActiveReport(updated)
    },
    [activeReport]
  )

  const handleRegenerateSection = useCallback(
    async (sectionKey: string) => {
      if (!activeReportId || !activeReport) return
      setRegeneratingSection(sectionKey)

      // Get the template ID from the current report
      const report = reports?.find((r) => r.id === activeReportId)
      if (!report?.template_id) return

      try {
        const result = await generateReport.mutateAsync({
          caseId,
          templateId: report.template_id,
          sectionKeys: [sectionKey],
          reportId: activeReportId,
        })

        if (result.sections[sectionKey]) {
          handleSectionUpdate(sectionKey, result.sections[sectionKey].content)
        }
      } finally {
        setRegeneratingSection(null)
      }
    },
    [activeReportId, activeReport, reports, caseId, generateReport, handleSectionUpdate]
  )

  const handleSave = useCallback(async () => {
    if (!activeReportId || !activeReport) return
    await saveSections.mutateAsync({
      id: activeReportId,
      sectionsData: activeReport.sections,
    })
    // Also save the full content blob
    await updateReport.mutateAsync({
      id: activeReportId,
      data: {
        content: activeReport as unknown as ReportUpdate['content'],
        sections_data: activeReport.sections as unknown as ReportUpdate['sections_data'],
      },
    })
  }, [activeReportId, activeReport, saveSections, updateReport])

  // State for monolithic (imported DOCX) reports
  const [monolithicHtml, setMonolithicHtml] = useState<string | null>(null)

  // Redline tracking state
  const redlineRef = useRef<HTMLDivElement>(null)

  interface RedlineData {
    id: string
    recipient_name: string | null
    original_html: string
    edited_html: string
    edited_at: string
    edited_by_name: string | null
    editor_notes: string | null
  }
  const [redlineReportId, setRedlineReportId] = useState<string | null>(null)
  const [redlineData, setRedlineData] = useState<RedlineData[]>([])
  const [redlineLoading, setRedlineLoading] = useState(false)
  const [activeRedlineIdx, setActiveRedlineIdx] = useState(0)

  const fetchRedlineData = useCallback(async (reportId: string) => {
    setRedlineLoading(true)
    try {
      const res = await fetch(`/api/shared-links/redline?entityId=${reportId}&entityType=report`)
      if (!res.ok) throw new Error('Failed to fetch redline data')
      const { links } = await res.json()
      setRedlineData(links)
      setActiveRedlineIdx(0)
      setRedlineReportId(reportId)
      // Scroll to the redline view after a brief delay for render
      setTimeout(() => {
        redlineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      toast.error('Failed to load redline data')
      setRedlineData([])
    } finally {
      setRedlineLoading(false)
    }
  }, [])

  const closeRedline = useCallback(() => {
    setRedlineReportId(null)
    setRedlineData([])
  }, [])

  const [acceptingChanges, setAcceptingChanges] = useState(false)

  const handleAcceptChanges = useCallback(async (linkId: string, editedHtml: string) => {
    if (!redlineReportId) return
    setAcceptingChanges(true)
    try {
      // Apply the edited HTML to the report
      await updateReport.mutateAsync({
        id: redlineReportId,
        data: {
          rendered_html: editedHtml,
          content: { import_mode: 'monolithic', html: editedHtml } as unknown as ReportUpdate['content'],
        },
      })
      toast.success('Changes accepted and applied to report')
      closeRedline()
    } catch {
      toast.error('Failed to accept changes')
    } finally {
      setAcceptingChanges(false)
    }
  }, [redlineReportId, updateReport, closeRedline])

  const handleRejectChanges = useCallback(async (linkId: string) => {
    toast.success('Changes rejected — report unchanged')
    closeRedline()
  }, [closeRedline])

  // Attorney review state
  interface AttorneyRevision {
    id: string
    revision_number: number
    submitted_by: string
    submitted_by_name: string
    submitted_html: string
    base_html: string
    notes: string | null
    status: string
    reviewer_notes: string | null
    reviewed_at: string | null
    created_at: string
    review_state: { changes: Array<{ id: number; status: string; modifiedHtml?: string }> } | null
  }
  const [reviewReportId, setReviewReportId] = useState<string | null>(null)
  const [reviewRevisions, setReviewRevisions] = useState<AttorneyRevision[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewDecisionPending, setReviewDecisionPending] = useState(false)
  const reviewRef = useRef<HTMLDivElement>(null)

  const fetchAttorneyRevisions = useCallback(async (reportId: string) => {
    setReviewLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/revisions`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReviewRevisions(data.revisions || [])
      setReviewReportId(reportId)
      setTimeout(() => {
        reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      toast.error('Failed to load attorney revisions')
      setReviewRevisions([])
    } finally {
      setReviewLoading(false)
    }
  }, [])

  const closeReview = useCallback(() => {
    setReviewReportId(null)
    setReviewRevisions([])
  }, [])

  const handleReviewDecision = useCallback(async (action: 'approve' | 'request_changes' | 'approve_with_modifications', revisionId: string, modifiedHtml?: string, reviewNotes?: string) => {
    if (!reviewReportId) return
    setReviewDecisionPending(true)
    try {
      const res = await fetch(`/api/reports/${reviewReportId}/review-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          revisionId,
          modifiedHtml: modifiedHtml || null,
          notes: reviewNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit decision')
      const actionLabels = { approve: 'approved', request_changes: 'sent back for changes', approve_with_modifications: 'approved with modifications' }
      toast.success(`Report ${actionLabels[action]}`)
      closeReview()
    } catch {
      toast.error('Failed to submit review decision')
    } finally {
      setReviewDecisionPending(false)
    }
  }, [reviewReportId, closeReview])

  // Unfinalize report
  const [unfinalizingId, setUnfinalizingId] = useState<string | null>(null)

  const handleUnfinalize = useCallback(async (reportId: string) => {
    setUnfinalizingId(reportId)
    try {
      await updateReport.mutateAsync({
        id: reportId,
        data: {
          status: 'review' as ReportUpdate['status'],
          approved_at: null,
        },
      })
      toast.success('Report unfinalized — you can now re-send it')
    } catch {
      toast.error('Failed to unfinalize report')
    } finally {
      setUnfinalizingId(null)
    }
  }, [updateReport])

  // Finalize report
  const [finalizingId, setFinalizingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const handleFinalize = useCallback(async (reportId: string) => {
    setFinalizingId(reportId)
    try {
      const res = await fetch(`/api/reports/${reportId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to finalize')
      }
      toast.success('Report finalized — attorney has been notified')
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', caseId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize report')
    } finally {
      setFinalizingId(null)
    }
  }, [caseId, queryClient])

  // Report rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const startRename = useCallback((reportId: string, currentName: string) => {
    setRenamingId(reportId)
    setRenameValue(currentName)
  }, [])

  const handleRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) return
    try {
      await updateReport.mutateAsync({
        id: renamingId,
        data: { report_name: renameValue.trim() },
      })
      toast.success('Report renamed')
    } catch {
      toast.error('Failed to rename report')
    }
    setRenamingId(null)
  }, [renamingId, renameValue, updateReport])

  const cancelRename = useCallback(() => {
    setRenamingId(null)
    setRenameValue('')
  }, [])

  // Delete report state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  const handleDeleteReport = useCallback(async () => {
    if (!deleteConfirmId) return
    try {
      await deleteReport.mutateAsync(deleteConfirmId)
      // If the deleted report was active, clear the editor
      if (activeReportId === deleteConfirmId) {
        setActiveReportId(null)
        setActiveReport(null)
        setMonolithicHtml(null)
      }
    } catch {
      // Error toast is handled by the hook
    }
    setDeleteConfirmId(null)
    setDeleteConfirmName('')
  }, [deleteConfirmId, deleteReport, activeReportId])

  // Create new blank report
  const handleNewBlankReport = useCallback(async () => {
    const report = await createReport.mutateAsync({
      case_id: caseId,
      report_type: 'expert_report',
      report_name: 'New Report',
      status: 'draft',
    })

    setActiveReportId(report.id)
    setActiveReport(null)
    setMonolithicHtml('<p></p>')

    // Save initial empty content
    await updateReport.mutateAsync({
      id: report.id,
      data: {
        rendered_html: '<p></p>',
        content: { import_mode: 'monolithic', html: '<p></p>' } as unknown as ReportUpdate['content'],
      },
    })
  }, [caseId, createReport, updateReport])

  const handleDocxImport = useCallback(
    async (html: string, filename: string) => {
      // Create a new report record for the import
      const report = await createReport.mutateAsync({
        case_id: caseId,
        report_type: 'expert_report',
        report_name: filename.replace(/\.docx$/i, ''),
        status: 'draft',
      })

      setActiveReportId(report.id)
      setActiveReport(null)
      setMonolithicHtml(html)

      // Save the imported HTML
      await updateReport.mutateAsync({
        id: report.id,
        data: {
          rendered_html: html,
          content: { import_mode: 'monolithic', html } as unknown as ReportUpdate['content'],
        },
      })
    },
    [caseId, createReport, updateReport]
  )

  const handleMonolithicUpdate = useCallback(
    (html: string) => {
      setMonolithicHtml(html)
    },
    []
  )

  const handleMonolithicSave = useCallback(async () => {
    if (!activeReportId || !monolithicHtml) return
    await updateReport.mutateAsync({
      id: activeReportId,
      data: {
        rendered_html: monolithicHtml,
        content: { import_mode: 'monolithic', html: monolithicHtml } as unknown as ReportUpdate['content'],
      },
    })
  }, [activeReportId, monolithicHtml, updateReport])

  const handleExportDocx = useCallback(async () => {
    if (!activeReportId) return
    try {
      const res = await fetch('/api/reports/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: activeReportId }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reports?.find((r) => r.id === activeReportId)?.report_name || 'Report'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export DOCX')
    }
  }, [activeReportId, reports])

  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportPdf = useCallback(async (reportId?: string, includeSignature = false) => {
    const idToExport = reportId || activeReportId
    if (!idToExport) return

    setExportingPdf(true)
    try {
      const res = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: idToExport, includeSignature }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate PDF')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'report.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(includeSignature ? 'Signed PDF downloaded' : 'PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export PDF')
      // Fallback to browser print
      const reportData = monolithicHtml
        ? monolithicHtml
        : activeReport
          ? (() => {
              const sections = sectionOrder
                .filter((key) => activeReport.sections[key])
                .map((key) => `<h2>${activeReport.sections[key].title}</h2>${activeReport.sections[key].content}`)
                .join('')
              return `<div style="font-family: Georgia, serif; max-width: 8.5in; margin: 0 auto; padding: 1in;">
                <div style="text-align: center; border-bottom: 2px solid #0E1F35; padding-bottom: 1rem; margin-bottom: 2rem; font-weight: bold; white-space: pre-line;">${activeReport.header}</div>
                ${sections}
                <div style="border-top: 2px solid #0E1F35; padding-top: 1rem; margin-top: 2rem; white-space: pre-line;">${activeReport.footer}</div>
              </div>`
            })()
          : ''
      if (reportData) {
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(`<!DOCTYPE html><html><head><title>Report</title></head><body>${reportData}</body></html>`)
          w.document.close()
          w.print()
        }
      }
    } finally {
      setExportingPdf(false)
    }
  }, [activeReportId, activeReport, monolithicHtml])

  const sectionOrder = [
    'introduction',
    'qualifications',
    'narrative_summary',
    'clinical_analysis',
    'breach_analysis',
    'causation',
    'conclusion',
  ]

  if (reportsLoading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">Generate and edit expert witness reports</p>
        </div>
        <div className="flex items-center gap-2">
          {(activeReport || monolithicHtml) && (
            <>
              {activeReport && (
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportDocx}>
                <Download className="h-4 w-4 mr-2" />
                Export DOCX
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportPdf()} disabled={exportingPdf}>
                {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Export PDF
              </Button>
              <Button
                size="sm"
                onClick={monolithicHtml ? handleMonolithicSave : handleSave}
                disabled={saveSections.isPending || updateReport.isPending}
              >
                {(saveSections.isPending || updateReport.isPending) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Report
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleNewBlankReport} disabled={createReport.isPending}>
            {createReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FilePlus className="h-4 w-4 mr-2" />
            )}
            New Report
          </Button>
          <DocxImportButton onImport={handleDocxImport} />
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Expert Report</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a template to generate a new report. The AI will draft each section based on the case data, then you can edit the output.
                </p>
                {templatesLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 mr-3">
                          <div className="font-medium text-sm">{template.template_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {template.description?.substring(0, 100)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(template.id, template.template_name)}
                          disabled={generateReport.isPending}
                        >
                          {generateReport.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Generation in progress */}
      {generateReport.isPending && !activeReport && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
            <p className="text-sm font-medium">Generating your expert report...</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI is drafting each section based on your case data. This may take a minute.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active report editor */}
      {activeReport && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[#C9A84C]" />
            <h3 className="font-semibold text-sm">Report Editor</h3>
            <Badge variant="secondary">Draft</Badge>
          </div>

          {/* Header preview */}
          {activeReport.header && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Report Header</div>
              <div className="text-sm whitespace-pre-line font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                {activeReport.header}
              </div>
            </div>
          )}

          {/* Section editors */}
          {sectionOrder.map((key) => {
            const section = activeReport.sections[key]
            if (!section) return null
            return (
              <SectionEditor
                key={key}
                sectionKey={key}
                section={section}
                onUpdate={handleSectionUpdate}
                onRegenerate={handleRegenerateSection}
                isRegenerating={regeneratingSection === key}
              />
            )
          })}

          {/* Footer preview */}
          {activeReport.footer && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Signature Block</div>
              <div className="text-sm whitespace-pre-line" style={{ fontFamily: 'Georgia, serif' }}>
                {activeReport.footer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monolithic editor (imported DOCX) */}
      {monolithicHtml && !activeReport && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-[#C9A84C]" />
            <h3 className="font-semibold text-sm">Imported Document Editor</h3>
            <Badge variant="secondary">Draft</Badge>
          </div>
          <TiptapEditor
            content={monolithicHtml}
            onUpdate={handleMonolithicUpdate}
            editable={true}
            placeholder="Document content..."
          />
        </div>
      )}

      {/* Attorney Review section — when attorney has submitted edits (status = review) */}
      {reviewReportId && (
        <div className="mb-8" ref={reviewRef}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-[#C9A84C]" />
              <h3 className="font-semibold">Review Attorney Edits</h3>
              {reviewRevisions.length === 0 && !reviewLoading && (
                <span className="text-sm text-muted-foreground">&mdash; No revisions found</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={closeReview}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>

          {reviewLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!reviewLoading && reviewRevisions.length > 0 && (() => {
            const pending = reviewRevisions.find((r) => r.status === 'pending_review' && r.submitted_by === 'attorney')
            const latestRevision = pending || reviewRevisions[0]
            return (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-[#C9A84C]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-[#0E1F35]">
                      Round {latestRevision.revision_number} from {latestRevision.submitted_by_name}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {latestRevision.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDate(latestRevision.created_at)}
                  </p>
                  {latestRevision.notes && (
                    <div className="mt-2 flex items-start gap-2">
                      <StickyNote className="h-4 w-4 text-[#C9A84C] shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{latestRevision.notes}</p>
                    </div>
                  )}
                </div>

                {/* Interactive redline review — per-change accept/reject/modify */}
                {latestRevision.base_html && latestRevision.submitted_html && latestRevision.status === 'pending_review' && reviewReportId && (
                  <InteractiveRedlineReview
                    originalHtml={latestRevision.base_html}
                    editedHtml={latestRevision.submitted_html}
                    editorName={latestRevision.submitted_by_name}
                    reportId={reviewReportId}
                    revisionId={latestRevision.id}
                    savedReviewState={latestRevision.review_state as any}
                    finalizing={reviewDecisionPending}
                    onFinalize={(resultHtml) => {
                      const reviewNotes = prompt('Add review notes (optional):')
                      handleReviewDecision('approve_with_modifications', latestRevision.id, resultHtml, reviewNotes || undefined)
                    }}
                    onSendBack={(resultHtml) => {
                      const reviewNotes = prompt('Add notes for the attorney (optional):')
                      handleReviewDecision('request_changes', latestRevision.id, resultHtml, reviewNotes || undefined)
                    }}
                    onCancel={closeReview}
                  />
                )}

                {/* Fallback: read-only redline for already-resolved revisions */}
                {latestRevision.base_html && latestRevision.submitted_html && latestRevision.status !== 'pending_review' && (
                  <RedlineView
                    originalHtml={latestRevision.base_html}
                    editedHtml={latestRevision.submitted_html}
                    editorName={latestRevision.submitted_by_name}
                  />
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Redline view — shown above reports for visibility */}
      {redlineReportId && (
        <div className="mb-8" ref={redlineRef}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-[#C9A84C]" />
              <h3 className="font-semibold">Redline Review</h3>
              {redlineData.length === 0 && !redlineLoading && (
                <span className="text-sm text-muted-foreground">&mdash; No edits have been made via share links yet</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={closeRedline}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>

          {redlineData.length > 1 && (
            <div className="flex gap-2 mb-4">
              {redlineData.map((rd, idx) => (
                <button
                  key={rd.id}
                  onClick={() => setActiveRedlineIdx(idx)}
                  className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                    activeRedlineIdx === idx
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#0E1F35]'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {rd.edited_by_name || rd.recipient_name || `Edit ${idx + 1}`}
                  <span className="text-muted-foreground ml-1">{formatDate(rd.edited_at)}</span>
                </button>
              ))}
            </div>
          )}

          {redlineData.length > 0 && (
            <>
              <RedlineView
                originalHtml={redlineData[activeRedlineIdx].original_html}
                editedHtml={redlineData[activeRedlineIdx].edited_html}
                editorName={redlineData[activeRedlineIdx].edited_by_name || redlineData[activeRedlineIdx].recipient_name || undefined}
              />

              {/* Editor notes callout */}
              {redlineData[activeRedlineIdx].editor_notes && (
                <div className="mt-4 p-4 bg-amber-50 border border-[#C9A84C]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-4 w-4 text-[#C9A84C]" />
                    <h4 className="text-sm font-semibold text-[#0E1F35]">Editor Notes</h4>
                    <span className="text-xs text-muted-foreground">
                      from {redlineData[activeRedlineIdx].edited_by_name || 'attorney'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {redlineData[activeRedlineIdx].editor_notes}
                  </p>
                </div>
              )}

              {/* Accept / Reject buttons */}
              <div className="flex items-center justify-end gap-3 mt-4 p-4 bg-gray-50 rounded-lg border">
                <span className="text-sm text-muted-foreground mr-auto">
                  Apply {redlineData[activeRedlineIdx].edited_by_name || 'attorney'}&apos;s edits to the report?
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectChanges(redlineData[activeRedlineIdx].id)}
                >
                  <X className="h-4 w-4 mr-1 text-red-500" />
                  Reject Changes
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAcceptChanges(redlineData[activeRedlineIdx].id, redlineData[activeRedlineIdx].edited_html)}
                  disabled={acceptingChanges}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  {acceptingChanges ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Accept Changes
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Existing reports list */}
      {reports && reports.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Saved Reports
          </h3>
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 rounded-md bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renamingId === report.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); handleRename() }}
                          className="flex items-center gap-1"
                        >
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-7 text-sm font-semibold w-56"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Escape') cancelRename() }}
                          />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelRename}>
                            <X className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </form>
                      ) : (
                        <h3
                          className="font-semibold text-sm cursor-pointer hover:text-[#C9A84C] transition-colors"
                          onClick={() => startRename(report.id, report.report_name)}
                          title="Click to rename"
                        >
                          {report.report_name}
                        </h3>
                      )}
                      <Badge variant="secondary">
                        {getLabelForValue(REPORT_TYPES, report.report_type)}
                      </Badge>
                      <StatusBadge
                        label={getReportStatusLabel(report.status)}
                        color={getReportStatusColor(report.status)}
                      />
                      {!!(report as Record<string, unknown>).finalization_requested_at && !['final', 'sent'].includes(report.status) && (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                          <Bell className="h-3 w-3 mr-1" />
                          Finalization Requested
                          {(report as Record<string, unknown>).finalization_requested_by ? (
                            <span className="ml-1 font-normal">
                              by {String((report as Record<string, unknown>).finalization_requested_by)}
                            </span>
                          ) : null}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{formatDate(report.created_at)}</span>
                      <span>Version {report.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Finalize & Sign — show for all non-final/non-sent reports */}
                    {!['final', 'sent', 'superseded', 'ai_generating'].includes(report.status) && (
                      <Button
                        size="sm"
                        onClick={() => handleFinalize(report.id)}
                        disabled={finalizingId === report.id}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        {finalizingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4 mr-1" />
                        )}
                        Finalize
                      </Button>
                    )}
                    {/* Download Signed PDF — show for finalized reports */}
                    {['final', 'sent'].includes(report.status) && (
                      <Button
                        size="sm"
                        onClick={() => handleExportPdf(report.id, true)}
                        disabled={exportingPdf}
                        className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
                      >
                        {exportingPdf ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-1" />
                        )}
                        Signed PDF
                      </Button>
                    )}
                    {/* Send to Attorney — show when report is in draft/review/revision/final state */}
                    {['draft', 'in_progress', 'review', 'revision', 'final'].includes(report.status) && (
                      <SendToAttorneyDialog
                        reportId={report.id}
                        reportName={report.report_name}
                        caseId={caseId}
                      />
                    )}
                    {/* Review Attorney Edits — show when status is 'review' (attorney submitted edits) */}
                    {report.status === 'review' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAttorneyRevisions(report.id)}
                        disabled={reviewLoading && reviewReportId === report.id}
                        className="text-orange-700 border-orange-300 hover:bg-orange-50"
                      >
                        {reviewLoading && reviewReportId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Gavel className="h-4 w-4 mr-1" />
                        )}
                        Review Edits
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchRedlineData(report.id)}
                      disabled={redlineLoading && redlineReportId === report.id}
                    >
                      {redlineLoading && redlineReportId === report.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <GitCompareArrows className="h-4 w-4 mr-1" />
                      )}
                      Redline
                    </Button>
                    <ShareDialog
                      entityType="report"
                      entityId={report.id}
                      entityName={report.report_name}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadExisting(report as { id: string; content: Record<string, unknown> | null; sections_data: Record<string, SectionData> | null; rendered_html?: string | null })}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {/* Unfinalize — only for final/sent reports */}
                    {['final', 'sent'].includes(report.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfinalize(report.id)}
                        disabled={unfinalizingId === report.id}
                        className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        {unfinalizingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1" />
                        )}
                        Unfinalize
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setDeleteConfirmId(report.id)
                        setDeleteConfirmName(report.report_name)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!reports || reports.length === 0) && !activeReport && !monolithicHtml && !generateReport.isPending && (
        <EmptyState
          icon={FileCheck}
          title="No reports generated"
          description="Generate an expert report using the Ettinger template. The AI will draft each section based on your case data, then you can edit and finalize."
          action={
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          }
        />
      )}

      {/* Preview modal */}
      <ReportPreview
        report={activeReport}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteConfirmName('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <strong>{deleteConfirmName}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName('') }}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteReport}
              disabled={deleteReport.isPending}
            >
              {deleteReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
