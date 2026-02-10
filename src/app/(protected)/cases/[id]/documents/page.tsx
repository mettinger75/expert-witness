'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DOCUMENT_CATEGORIES, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { useDocuments, useUploadDocument, useProcessDocument } from '@/hooks/useDocuments'
import { useFolders } from '@/hooks/useFolders'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import type { DocumentRow } from '@/types/database.types'
import {
  Upload, FileText, Search, Star, Filter,
  Folder, FolderOpen, Loader2, X, RefreshCw, Brain, Eye,
} from 'lucide-react'

// Medical record categories for the Medical Records tab
const MEDICAL_CATEGORIES = [
  'medical_record',
  'anesthesia_record',
  'operative_report',
  'nursing_notes',
  'lab_results',
  'imaging',
  'pharmacy',
  'autopsy',
]

const MEDICAL_DOCUMENT_CATEGORIES = DOCUMENT_CATEGORIES.filter(c =>
  MEDICAL_CATEGORIES.includes(c.value)
)

export default function CaseDocumentsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<DocumentRow | null>(null)

  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [docCategory, setDocCategory] = useState<string>('medical_record')
  const [docDescription, setDocDescription] = useState('')
  const [docDate, setDocDate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real data hooks
  const filters = {
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    folder_id: selectedFolder ?? undefined,
    search: search || undefined,
  }
  const [isPolling, setIsPolling] = useState(false)
  const { data: allDocuments = [], isLoading: docsLoading } = useDocuments(caseId, filters, {
    refetchInterval: isPolling ? 3000 : undefined,
  })
  const { data: folders = [], isLoading: foldersLoading } = useFolders(caseId)

  // Client-side filter to only show medical categories
  const documents = categoryFilter !== 'all'
    ? allDocuments
    : allDocuments.filter(d => MEDICAL_CATEGORIES.includes(d.category))

  // Track if any documents are processing to enable polling
  const hasProcessing = documents.some(d => d.ocr_status === 'processing')
  useEffect(() => { setIsPolling(hasProcessing) }, [hasProcessing])

  const uploadMutation = useUploadDocument()
  const processDocument = useProcessDocument()

  const isUploading = uploadMutation.isPending

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  async function handleUpload() {
    if (selectedFiles.length === 0) return

    for (const file of selectedFiles) {
      try {
        // Upload file via API route (handles storage + DB record creation)
        const result = await uploadMutation.mutateAsync({
          caseId,
          file,
          category: docCategory,
          description: docDescription || undefined,
          folderId: selectedFolder,
        })

        // Auto-process PDF files with AI
        if (file.type === 'application/pdf' && result?.document?.id) {
          processDocument.mutate(result.document.id)
        }
      } catch {
        // Error toasts are handled by the mutation hooks
        return
      }
    }

    // Reset form
    setSelectedFiles([])
    setDocCategory('medical_record')
    setDocDescription('')
    setDocDate('')
    setUploadOpen(false)
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Medical Records</h2>
          <p className="text-sm text-muted-foreground">
            Manage medical records and clinical documents
            {!docsLoading && ` (${documents.length} total)`}
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) {
            setSelectedFiles([])
            setDocCategory('medical_record')
            setDocDescription('')
            setDocDate('')
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff,.xls,.xlsx"
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Files</Label>
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeFile(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="doc-category">Document Type</Label>
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger id="doc-category">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICAL_DOCUMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Date */}
              <div className="space-y-2">
                <Label htmlFor="doc-date">Document Date (optional)</Label>
                <Input
                  id="doc-date"
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="doc-description">Description (optional)</Label>
                <Textarea
                  id="doc-description"
                  placeholder="Brief description of the document..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        {/* Folder Tree Sidebar */}
        <div className="w-64 shrink-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Folders</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                  !selectedFolder ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedFolder(null)}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                All Documents
              </div>
              {foldersLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : folders.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No folders yet</p>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                      selectedFolder === folder.id ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      {folder.name}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Grid */}
        <div className="flex-1">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Medical Records</SelectItem>
                {MEDICAL_DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {docsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No medical records found"
              description="Upload medical records, operative reports, nursing notes, and other clinical documents."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setViewingDoc(doc as DocumentRow)
                    setViewerOpen(true)
                  }}
                >
                  <CardContent className="flex items-start gap-3 py-4">
                    <div className="p-2 rounded-md bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{doc.file_name}</h4>
                        {doc.is_exhibit && (
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {/* View button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-auto shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingDoc(doc as DocumentRow)
                            setViewerOpen(true)
                          }}
                          title="View document"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {/* Reprocess button */}
                        {doc.mime_type === 'application/pdf' && doc.ocr_status !== 'processing' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              processDocument.mutate(doc.id)
                            }}
                            disabled={processDocument.isPending}
                            title={doc.ocr_status === 'completed' ? 'Reprocess with AI' : 'Process with AI'}
                          >
                            {doc.ocr_status === 'completed' ? (
                              <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                              <Brain className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {getLabelForValue(DOCUMENT_CATEGORIES, doc.category)}
                        </Badge>
                        {/* AI Processing Status Badge */}
                        {doc.ocr_status === 'pending' && doc.mime_type === 'application/pdf' && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                            Pending AI
                          </Badge>
                        )}
                        {doc.ocr_status === 'processing' && (
                          <Badge variant="outline" className="text-xs text-primary border-border bg-muted">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Analyzing...
                          </Badge>
                        )}
                        {doc.ocr_status === 'completed' && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                            AI Complete
                          </Badge>
                        )}
                        {doc.ocr_status === 'failed' && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                            AI Failed
                          </Badge>
                        )}
                        {doc.date_of_document && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.date_of_document)}
                          </span>
                        )}
                        {doc.page_count && (
                          <span className="text-xs text-muted-foreground">
                            {doc.page_count} pages
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </div>
                      {/* AI Summary Preview */}
                      {doc.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                          {doc.ai_summary}
                        </p>
                      )}
                      {!doc.ai_summary && doc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {doc.description}
                        </p>
                      )}
                      {/* Key Findings Preview */}
                      {doc.ai_key_findings && doc.ai_key_findings.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {doc.ai_key_findings.slice(0, 3).map((finding: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              {finding.length > 40 ? finding.substring(0, 40) + '...' : finding}
                            </Badge>
                          ))}
                          {doc.ai_key_findings.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{doc.ai_key_findings.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer */}
      <DocumentViewer
        document={viewingDoc}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  )
}
