'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'
import {
  FileText,
  Eye,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
  GitCompareArrows,
  StickyNote,
  Pencil,
  CheckCircle2,
  Download,
  Info,
  Clock,
  Shield,
  Send,
} from 'lucide-react'
import { PortalReportEditor } from './PortalReportEditor'
import { RevisionTimeline } from './RevisionTimeline'
import HtmlDiffModule from 'htmldiff-js'
import '@/components/editor/editor-styles.css'

// htmldiff-js exports { default: { execute } } — need to unwrap
const HtmlDiff = (
  HtmlDiffModule as unknown as {
    default: { execute: (a: string, b: string) => string }
  }
).default || HtmlDiffModule

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

interface CaseReport {
  id: string
  report_name: string
  report_type: string
  status: string // includes 'attorney_review', 'review', 'final'
  version: number
  is_latest_version: boolean
  created_at: string
  updated_at: string
}

interface ReportRevision {
  id: string
  revisionNumber: number
  submittedBy: string
  submittedByName: string
  submittedHtml: string
  baseHtml: string
  notes: string | null
  status: string
  reviewerNotes: string | null
  reviewedAt: string | null
  createdAt: string
}

interface ReportContent {
  id: string
  reportName: string
  reportType: string
  status: string
  version: number
  renderedHtml: string | null
  renderedText: string | null
  collaborationHtml: string | null
  updatedAt: string
  finalizationRequestedAt: string | null
  finalizationRequestedBy: string | null
}

interface PortalReportsProps {
  token: string
  caseReports: CaseReport[]
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getReportStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-800',
    ai_generating: 'bg-purple-100 text-purple-800',
    review: 'bg-blue-100 text-blue-800',
    attorney_review: 'bg-[#C9A84C]/15 text-[#0E1F35]',
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

function getListStatusBadge(status: string) {
  switch (status) {
    case 'attorney_review':
      return (
        <Badge className="bg-[#C9A84C]/15 text-[#0E1F35] border border-[#C9A84C]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mr-1.5 animate-pulse" />
          Awaiting Your Review
        </Badge>
      )
    case 'review':
      return (
        <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>
      )
    case 'final':
      return (
        <Badge className="bg-emerald-100 text-emerald-800">Finalized</Badge>
      )
    case 'sent':
      return (
        <Badge className="bg-green-100 text-green-800">Sent</Badge>
      )
    default:
      return (
        <Badge className={getReportStatusColor(status)}>
          {status.replace(/_/g, ' ')}
        </Badge>
      )
  }
}

// ──────────────────────────────────────────────
// Inline RedlineViewer (for revision diffs)
// ──────────────────────────────────────────────

function RevisionRedlineViewer({ revision }: { revision: ReportRevision }) {
  const diffHtml = useMemo(() => {
    if (!revision.baseHtml || !revision.submittedHtml) {
      return revision.submittedHtml || revision.baseHtml || ''
    }
    try {
      return HtmlDiff.execute(revision.baseHtml, revision.submittedHtml)
    } catch {
      return revision.submittedHtml
    }
  }, [revision.baseHtml, revision.submittedHtml])

  return (
    <div className="space-y-4">
      {/* Redline legend */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border text-xs">
        <span className="font-medium text-gray-600">Redline Legend:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
          <del className="text-red-600">Deleted text</del>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
          <ins className="text-green-700 no-underline">Added text</ins>
        </span>
        <span className="ml-auto text-gray-500">
          Edits by <strong>{revision.submittedByName}</strong>
          {revision.createdAt && (
            <> &middot; {formatDate(revision.createdAt)}</>
          )}
        </span>
      </div>

      {/* Editor notes */}
      {revision.notes && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <StickyNote className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-amber-800">Notes: </span>
            <span className="text-amber-700">{revision.notes}</span>
          </div>
        </div>
      )}

      {/* Reviewer notes */}
      {revision.reviewerNotes && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-blue-800">
              Dr. Ettinger&apos;s Response:{' '}
            </span>
            <span className="text-blue-700">{revision.reviewerNotes}</span>
          </div>
        </div>
      )}

      {/* Diff content */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-2">
          <GitCompareArrows className="h-3.5 w-3.5" />
          Redline — Round {revision.revisionNumber}
        </div>
        <div className="tiptap-editor redline-content" style={{ border: 'none' }}>
          <div
            className="ProseMirror"
            style={{ padding: '2rem' }}
            dangerouslySetInnerHTML={{ __html: diffHtml }}
          />
        </div>
      </div>

      {/* Redline-specific ins/del styles */}
      <style jsx global>{`
        .redline-content ins {
          background-color: #dcfce7;
          color: #166534;
          text-decoration: none;
          border-bottom: 1px solid #86efac;
          padding: 0 2px;
          border-radius: 2px;
        }
        .redline-content del {
          background-color: #fee2e2;
          color: #991b1b;
          text-decoration: line-through;
          padding: 0 2px;
          border-radius: 2px;
        }
        .redline-content ins img,
        .redline-content del img {
          border: 2px solid;
        }
      `}</style>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function PortalReports({ token, caseReports }: PortalReportsProps) {
  const [viewingReport, setViewingReport] = useState<ReportContent | null>(null)
  const [revisions, setRevisions] = useState<ReportRevision[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [viewMode, setViewMode] = useState<'current' | 'edit' | 'redline'>(
    'current'
  )
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [requestingFinalization, setRequestingFinalization] = useState(false)
  const [showFinalizationDialog, setShowFinalizationDialog] = useState(false)
  const [finalizationNotes, setFinalizationNotes] = useState('')

  const activeRevision = useMemo(
    () => revisions.find((r) => r.id === activeRevisionId) || null,
    [revisions, activeRevisionId]
  )

  const fetchReport = useCallback(
    async (reportId: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/portal/${token}/reports/${reportId}`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load report')
          return
        }
        const data = await res.json()
        setViewingReport(data.report)
        setRevisions(data.revisions || [])
        setCanEdit(data.canEdit ?? false)

        // Default view mode based on state
        if (data.canEdit && data.report.status === 'attorney_review') {
          setViewMode('current')
        } else if ((data.revisions || []).length > 0) {
          setViewMode('current')
        } else {
          setViewMode('current')
        }
        // Select first revision if any
        if ((data.revisions || []).length > 0) {
          setActiveRevisionId(data.revisions[0].id)
        } else {
          setActiveRevisionId(null)
        }
      } catch {
        setError('Failed to load report')
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  function closeReport() {
    setViewingReport(null)
    setRevisions([])
    setCanEdit(false)
    setViewMode('current')
    setActiveRevisionId(null)
  }

  async function handleDownloadPdf() {
    if (!viewingReport) return
    setDownloadingPdf(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: viewingReport.id, includeSignature: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to generate PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${viewingReport.reportName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download PDF. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleRequestFinalization() {
    if (!viewingReport) return
    setRequestingFinalization(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reports/${viewingReport.id}/request-finalization`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            notes: finalizationNotes.trim() || undefined,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to request finalization')
        return
      }
      setShowFinalizationDialog(false)
      setFinalizationNotes('')
      // Refetch to get updated status
      await fetchReport(viewingReport.id)
    } catch {
      setError('Failed to request finalization. Please try again.')
    } finally {
      setRequestingFinalization(false)
    }
  }

  // ────────── Empty state ──────────
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

  // ────────── Report Viewer ──────────
  if (viewingReport) {
    const isAttorneyReview =
      viewingReport.status === 'attorney_review'
    const isUnderReview = viewingReport.status === 'review'
    const isFinalOrSent =
      viewingReport.status === 'final' || viewingReport.status === 'sent'
    const hasRequestedFinalization =
      !!viewingReport.finalizationRequestedAt

    const displayHtml =
      viewingReport.collaborationHtml || viewingReport.renderedHtml

    return (
      <div className="space-y-4">
        {/* Back button + header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeReport}
            className="text-gray-600 hover:text-[#0E1F35]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Reports
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeReport}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Workflow state banner */}
        {isAttorneyReview && !hasRequestedFinalization && (
          <div className="flex items-start gap-3 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg">
            <Info className="h-5 w-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <div className="text-sm text-[#0E1F35]">
              <strong>Dr. Ettinger has sent this report for your review.</strong>{' '}
              {canEdit
                ? 'You can edit and submit changes, or request finalization when you are satisfied.'
                : 'Review the report and request finalization when ready.'}
            </div>
          </div>
        )}
        {isAttorneyReview && hasRequestedFinalization && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <strong>Finalization requested.</strong>{' '}
              Dr. Ettinger has been notified that you have completed your review and are ready for finalization. You will receive an email when the report is finalized.
            </div>
          </div>
        )}
        {isUnderReview && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Your edits are under review by Dr. Ettinger.
            </p>
          </div>
        )}
        {isFinalOrSent && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              This report has been finalized. You can download the signed PDF.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Report header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0E1F35]">
              {viewingReport.reportName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getReportStatusColor(viewingReport.status)}>
                {viewingReport.status.replace(/_/g, ' ')}
              </Badge>
              <span className="text-xs text-gray-400">
                {getReportTypeLabel(viewingReport.reportType)}
              </span>
              {viewingReport.version > 1 && (
                <span className="text-xs text-gray-400">
                  v{viewingReport.version}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isAttorneyReview && !hasRequestedFinalization && (
              <Button
                size="sm"
                onClick={() => setShowFinalizationDialog(true)}
                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
              >
                <Send className="h-4 w-4 mr-1" />
                Request Finalization
              </Button>
            )}
            {isAttorneyReview && hasRequestedFinalization && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 px-3">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Finalization Requested
              </Badge>
            )}
            {isFinalOrSent && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="text-[#0E1F35] border-[#0E1F35]/30 hover:bg-[#0E1F35]/5"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Download Signed PDF
              </Button>
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-md border overflow-hidden w-fit">
          <button
            onClick={() => setViewMode('current')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'current'
                ? 'bg-[#0E1F35] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Eye className="h-3.5 w-3.5 inline mr-1" />
            Current
          </button>
          {canEdit && (
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                viewMode === 'edit'
                  ? 'bg-[#0E1F35] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Pencil className="h-3.5 w-3.5 inline mr-1" />
              Edit
            </button>
          )}
          {revisions.length > 0 && (
            <button
              onClick={() => setViewMode('redline')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                viewMode === 'redline'
                  ? 'bg-[#0E1F35] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5 inline mr-1" />
              Redline
              <span className="ml-1 bg-[#C9A84C] text-[#0E1F35] text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                {revisions.length}
              </span>
            </button>
          )}
        </div>

        {/* ──── Current View ──── */}
        {viewMode === 'current' && (
          <>
            {displayHtml ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Report Document
                </div>
                <div className="tiptap-editor" style={{ border: 'none' }}>
                  <div
                    className="ProseMirror"
                    style={{ padding: '2rem' }}
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                  />
                </div>
              </div>
            ) : viewingReport.renderedText ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Report Document
                </div>
                <div
                  className="p-8 bg-white whitespace-pre-wrap text-sm text-gray-800 leading-relaxed"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {viewingReport.renderedText}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border rounded-lg bg-gray-50">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  This report does not have viewable content yet.
                </p>
              </div>
            )}
          </>
        )}

        {/* ──── Edit View ──── */}
        {viewMode === 'edit' && canEdit && displayHtml && (
          <PortalReportEditor
            token={token}
            reportId={viewingReport.id}
            initialHtml={displayHtml}
            reportName={viewingReport.reportName}
            onSubmitted={() => {
              setViewMode('current')
              fetchReport(viewingReport.id)
            }}
            onCancel={() => setViewMode('current')}
          />
        )}

        {/* ──── Redline View ──── */}
        {viewMode === 'redline' && revisions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Timeline sidebar */}
            <div>
              <RevisionTimeline
                revisions={revisions}
                onSelectRevision={(r) => setActiveRevisionId(r.id)}
                activeRevisionId={activeRevisionId}
              />
            </div>

            {/* Redline diff */}
            <div>
              {activeRevision ? (
                <RevisionRedlineViewer revision={activeRevision} />
              ) : (
                <div className="text-center py-12 text-sm text-gray-500 border rounded-lg bg-gray-50">
                  Select a revision from the timeline to view its redline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── Request Finalization Dialog ──── */}
        {showFinalizationDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              <div className="bg-[#0E1F35] px-6 py-4">
                <h3 className="text-lg font-semibold text-white">
                  Request Finalization
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  This will notify Dr. Ettinger that you have completed your review of{' '}
                  <strong>{viewingReport.reportName}</strong> and are ready for the report
                  to be finalized and signed.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={finalizationNotes}
                    onChange={(e) => setFinalizationNotes(e.target.value)}
                    placeholder="Any final notes or comments for Dr. Ettinger..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowFinalizationDialog(false)
                      setFinalizationNotes('')
                    }}
                    disabled={requestingFinalization}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRequestFinalization}
                    disabled={requestingFinalization}
                    className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
                  >
                    {requestingFinalization ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Request Finalization
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ────────── Report List ──────────
  return (
    <div className="space-y-3" data-tour="reports-list">
      <p className="text-sm text-gray-500 mb-4">
        {caseReports.length} report{caseReports.length !== 1 ? 's' : ''} for
        this case
      </p>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0E1F35]" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading &&
        caseReports.map((report) => (
          <Card
            key={report.id}
            className={`py-4 cursor-pointer hover:shadow-md transition-shadow ${
              report.status === 'attorney_review'
                ? 'border-[#C9A84C]/40 hover:border-[#C9A84C]/60'
                : 'hover:border-[#C9A84C]/30'
            }`}
            onClick={() => fetchReport(report.id)}
          >
            <CardContent className="px-5 py-0">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      report.status === 'attorney_review'
                        ? 'bg-[#C9A84C]/15 text-[#C9A84C]'
                        : 'bg-[#0E1F35]/5 text-[#0E1F35]'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0E1F35]">
                      {report.report_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getListStatusBadge(report.status)}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#0E1F35] hover:text-[#C9A84C] shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    fetchReport(report.id)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
