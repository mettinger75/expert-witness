'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnnotations, useCreateAnnotation, useDeleteAnnotation } from '@/hooks/useAnnotations'
import { useUpdateDocument } from '@/hooks/useDocuments'
import type { DocumentRow } from '@/types/database.types'
import type { AnnotationType } from '@/types/enums'
import {
  Loader2,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  Image as ImageIcon,
  Brain,
  ExternalLink,
  StickyNote,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Bookmark,
  Highlighter,
} from 'lucide-react'
import { toast } from 'sonner'

const ANNOTATION_TYPES = [
  { value: 'highlight', label: 'Highlight', icon: Highlighter },
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark },
]

function getAnnotationColor(type: string) {
  switch (type) {
    case 'highlight': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'note': return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'bookmark': return 'bg-purple-50 border-purple-200 text-purple-800'
    default: return 'bg-muted border-border'
  }
}

interface DocumentViewerProps {
  document: DocumentRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentViewer({ document, open, onOpenChange }: DocumentViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('document')

  // Annotation form state
  const [annotationPage, setAnnotationPage] = useState('')
  const [annotationType, setAnnotationType] = useState<string>('note')
  const [annotationContent, setAnnotationContent] = useState('')

  // Editable AI summary state
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryText, setSummaryText] = useState('')

  // Annotations data
  const { data: annotations = [], isLoading: annotationsLoading } = useAnnotations(document?.id ?? '')
  const createAnnotation = useCreateAnnotation()
  const deleteAnnotation = useDeleteAnnotation()
  const updateDocument = useUpdateDocument()

  const fetchViewUrl = useCallback(async (docId: string) => {
    setLoading(true)
    setError(null)
    setViewUrl(null)
    try {
      const response = await fetch(`/api/documents/view?id=${docId}`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to load document' }))
        throw new Error(err.error || 'Failed to load document')
      }
      const data = await response.json()
      setViewUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && document?.id) {
      fetchViewUrl(document.id)
      setActiveTab('document')
      setSummaryText(document.ai_summary || '')
      setEditingSummary(false)
    }
    if (!open) {
      setViewUrl(null)
      setError(null)
      setIsFullscreen(false)
      setAnnotationPage('')
      setAnnotationType('note')
      setAnnotationContent('')
      setEditingSummary(false)
    }
  }, [open, document?.id, document?.ai_summary, fetchViewUrl])

  if (!document) return null

  const isPdf = document.mime_type === 'application/pdf'
  const isImage = document.mime_type?.startsWith('image/')
  const isText = document.mime_type === 'text/plain' || document.mime_type === 'text/csv'
  const hasAiAnalysis = document.ai_summary || (document.ai_key_findings && document.ai_key_findings.length > 0)

  const handleDownload = () => {
    if (viewUrl) {
      const link = window.document.createElement('a')
      link.href = viewUrl
      link.download = document.original_file_name || document.file_name
      link.target = '_blank'
      link.click()
    }
  }

  const handleAddAnnotation = () => {
    const page = parseInt(annotationPage)
    if (!page || page < 1) {
      toast.error('Please enter a valid page number')
      return
    }
    if (!annotationContent.trim() && annotationType !== 'bookmark') {
      toast.error('Please enter annotation content')
      return
    }
    createAnnotation.mutate(
      {
        document_id: document.id,
        annotation_type: annotationType as AnnotationType,
        page_number: page,
        content: annotationContent.trim() || null,
      },
      {
        onSuccess: () => {
          setAnnotationContent('')
          setAnnotationPage('')
        },
      }
    )
  }

  const handleSaveSummary = () => {
    updateDocument.mutate(
      {
        id: document.id,
        data: { ai_summary: summaryText.trim() || null },
      },
      {
        onSuccess: () => {
          setEditingSummary(false)
          toast.success('Summary updated')
        },
      }
    )
  }

  // Group annotations by page
  const annotationsByPage = annotations.reduce<Record<number, typeof annotations>>((acc, ann) => {
    const page = ann.page_number
    if (!acc[page]) acc[page] = []
    acc[page].push(ann)
    return acc
  }, {})

  const sortedPages = Object.keys(annotationsByPage)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[85vh]'
        } flex flex-col overflow-hidden`}
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {document.original_file_name || document.file_name}
              </DialogTitle>
              <Badge variant="secondary" className="text-xs shrink-0">
                {document.mime_type?.split('/').pop()?.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!viewUrl}
                className="h-8 w-8 p-0"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              {viewUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(viewUrl, '_blank')}
                  className="h-8 w-8 p-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tab navigation — always show all three tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="document" className="text-xs px-3">
              {isPdf && <FileText className="h-3.5 w-3.5 mr-1.5" />}
              {isImage && <ImageIcon className="h-3.5 w-3.5 mr-1.5" />}
              Document
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs px-3">
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="annotations" className="text-xs px-3">
              <StickyNote className="h-3.5 w-3.5 mr-1.5" />
              Notes & Highlights
              {annotations.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                  {annotations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Document tab */}
          {activeTab === 'document' && (
            <div className="h-full">
              {loading && (
                <div className="flex flex-col items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
                  <p className="text-sm text-muted-foreground">Loading document...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-96">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document?.id && fetchViewUrl(document.id)}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {!loading && !error && viewUrl && (
                <>
                  {/* PDF Viewer */}
                  {isPdf && (
                    <iframe
                      src={`${viewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full rounded-md border bg-white"
                      style={{ height: isFullscreen ? 'calc(95vh - 200px)' : 'calc(85vh - 200px)' }}
                      title={document.file_name}
                    />
                  )}

                  {/* Image Viewer */}
                  {isImage && (
                    <div className="flex items-center justify-center p-4 bg-muted/30 rounded-md min-h-[400px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewUrl}
                        alt={document.file_name}
                        className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm"
                      />
                    </div>
                  )}

                  {/* Text Viewer */}
                  {isText && (
                    <TextViewer url={viewUrl} />
                  )}

                  {/* Unsupported file type */}
                  {!isPdf && !isImage && !isText && (
                    <div className="flex flex-col items-center justify-center h-96">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Preview not available for this file type
                      </p>
                      <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Download to View
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AI Analysis tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6 py-2">
              {/* Editable Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#0E1F35]">AI Summary</h3>
                  <div className="flex items-center gap-1">
                    {editingSummary ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingSummary(false)
                            setSummaryText(document.ai_summary || '')
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleSaveSummary}
                          disabled={updateDocument.isPending}
                        >
                          {updateDocument.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingSummary(true)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                {editingSummary ? (
                  <Textarea
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    rows={6}
                    placeholder="Enter or edit the AI summary for this document..."
                    className="text-sm"
                  />
                ) : (
                  <>
                    {document.ai_summary ? (
                      <div>
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {document.ai_summary}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No summary yet. Click Edit to add one, or process this document with AI.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Key Findings */}
              {document.ai_key_findings && document.ai_key_findings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[#0E1F35]">Key Findings</h3>
                  <ul className="space-y-1.5">
                    {document.ai_key_findings.map((finding: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-[#C9A84C] mt-0.5 shrink-0">&#x2022;</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Dates */}
              {document.ai_extracted_dates && Array.isArray(document.ai_extracted_dates) && document.ai_extracted_dates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[#0E1F35]">Key Dates</h3>
                  <div className="space-y-1">
                    {(document.ai_extracted_dates as Array<{ date: string; event: string }>).map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="font-mono text-xs text-[#C9A84C] shrink-0 mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded">
                          {item.date}
                        </span>
                        <span className="text-muted-foreground">{item.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Medications */}
              {document.ai_extracted_medications && Array.isArray(document.ai_extracted_medications) && document.ai_extracted_medications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[#0E1F35]">Medications</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(document.ai_extracted_medications as Array<{ name: string; dose?: string }>).map((med, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {med.name}{med.dose ? ` (${med.dose})` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Providers */}
              {document.ai_extracted_providers && document.ai_extracted_providers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[#0E1F35]">Providers Mentioned</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {document.ai_extracted_providers.map((name: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* OCR Text */}
              {document.ocr_text && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[#0E1F35]">Extracted Text</h3>
                  <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-4">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
                      {document.ocr_text}
                    </pre>
                  </div>
                </div>
              )}

              {!hasAiAnalysis && !editingSummary && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No AI analysis available. Process this document with AI or add a summary manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Annotations tab */}
          {activeTab === 'annotations' && (
            <div className="space-y-4 py-2">
              {/* Add Annotation Form */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Add Note or Highlight</h4>
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <div>
                    <Label className="text-xs">Page #</Label>
                    <Input
                      type="number"
                      min={1}
                      value={annotationPage}
                      onChange={(e) => setAnnotationPage(e.target.value)}
                      placeholder="1"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={annotationType} onValueChange={setAnnotationType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANNOTATION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                              <t.icon className="h-3.5 w-3.5" />
                              {t.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={annotationContent}
                    onChange={(e) => setAnnotationContent(e.target.value)}
                    placeholder={annotationType === 'bookmark' ? 'Optional bookmark label...' : 'Enter your notes about this page...'}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddAnnotation}
                    disabled={createAnnotation.isPending}
                  >
                    {createAnnotation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Add
                  </Button>
                </div>
              </div>

              {/* Annotations List */}
              {annotationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : annotations.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No annotations yet. Add notes, highlights, or bookmarks to specific pages.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPages.map((page) => (
                    <div key={page}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          Page {page}
                        </Badge>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="space-y-2 ml-2">
                        {annotationsByPage[page].map((ann) => (
                          <div
                            key={ann.id}
                            className={`flex items-start gap-2 rounded-md border p-3 ${getAnnotationColor(ann.annotation_type)}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] py-0 capitalize">
                                  {ann.annotation_type}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(ann.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {ann.content && (
                                <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                              )}
                              {ann.selected_text && (
                                <p className="text-xs italic mt-1 opacity-75">
                                  &ldquo;{ann.selected_text}&rdquo;
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 hover:text-red-600"
                              onClick={() => deleteAnnotation.mutate({
                                id: ann.id,
                                documentId: ann.document_id,
                              })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Fetches and renders text content from a URL
function TextViewer({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchText() {
      try {
        const response = await fetch(url)
        const content = await response.text()
        setText(content)
      } catch {
        setText('Failed to load text content')
      } finally {
        setLoading(false)
      }
    }
    fetchText()
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
      </div>
    )
  }

  return (
    <div className="max-h-[65vh] overflow-y-auto rounded-md border bg-white p-6">
      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
        {text}
      </pre>
    </div>
  )
}
