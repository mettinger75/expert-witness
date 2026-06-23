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
import { authHeaders } from '@/lib/api-client'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DOCUMENT_CATEGORIES, DOCUMENT_SUB_TABS, getLabelForValue } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'
import { useDocuments, useUploadDocument, useProcessDocument } from '@/hooks/useDocuments'
import { useFolders } from '@/hooks/useFolders'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { cn } from '@/lib/utils'
import type { DocumentRow } from '@/types/database.types'
import {
  Upload, FileText, Search, Star, Filter,
  Folder, FolderOpen, Loader2, X, RefreshCw, Brain, Eye, StickyNote, Activity,
} from 'lucide-react'

export default function CaseDocumentsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [activeSubTab, setActiveSubTab] = useState('all')
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

  // Get the active sub-tab config
  const activeTabConfig = DOCUMENT_SUB_TABS.find(t => t.key === activeSubTab) ?? DOCUMENT_SUB_TABS[0]

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

  // Filter documents by the active sub-tab categories
  const documents = (() => {
    let docs = allDocuments
    // If a sub-tab is active (not 'all'), filter to those categories
    if (activeTabConfig.categories.length > 0 && categoryFilter === 'all') {
      docs = docs.filter(d => (activeTabConfig.categories as readonly string[]).includes(d.category))
    }
    return docs
  })()

  // Count documents per sub-tab for badges
  const tabCounts = DOCUMENT_SUB_TABS.map(tab => ({
    key: tab.key,
    count: tab.categories.length === 0
      ? allDocuments.length
      : allDocuments.filter(d => (tab.categories as readonly string[]).includes(d.category)).length,
  }))

  // Track if any documents are processing to enable polling
  const hasProcessing = documents.some(d => d.ocr_status === 'processing')
  useEffect(() => { setIsPolling(hasProcessing) }, [hasProcessing])

  const uploadMutation = useUploadDocument()
  const processDocument = useProcessDocument()
  const isUploading = uploadMutation.isPending

  // Get relevant categories for the current sub-tab (for upload dropdown + filter)
  const relevantCategories = activeTabConfig.categories.length > 0
    ? DOCUMENT_CATEGORIES.filter(c => (activeTabConfig.categories as readonly string[]).includes(c.value))
    : DOCUMENT_CATEGORIES

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

  // Reset category filter when switching sub-tabs
  function handleSubTabChange(key: string) {
    setActiveSubTab(key)
    setCategoryFilter('all')
    setSelectedFolder(null)
    const tab = DOCUMENT_SUB_TABS.find(t => t.key === key)
    if (tab && tab.categories.length > 0) {
      setDocCategory(tab.categories[0])
    }
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return

    for (const file of selectedFiles) {
      try {
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
        return
      }
    }

    // Reset form
    setSelectedFiles([])
    setDocDescription('')
    setDocDate('')
    setUploadOpen(false)
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const showFolderSidebar = activeSubTab === 'medical' || activeSubTab === 'all'
  const isAnesthesiaTab = activeSubTab === 'anesthesia'

  // Anesthesia-specific state
  const [selectedAnesthesiaDoc, setSelectedAnesthesiaDoc] = useState<DocumentRow | null>(null)
  const [anesthesiaNotes, setAnesthesiaNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [anesthesiaViewUrl, setAnesthesiaViewUrl] = useState<string | null>(null)
  const anesthesiaDocs = allDocuments.filter(d => (d.category as string) === 'anesthesia_record') as DocumentRow[]

  // Load notes when an anesthesia doc is selected
  useEffect(() => {
    if (selectedAnesthesiaDoc) {
      setAnesthesiaNotes(selectedAnesthesiaDoc.description || '')
    }
  }, [selectedAnesthesiaDoc])

  // Fetch a signed view URL for the selected anesthesia record. /api/documents/view
  // is admin-only, so we fetch it with the auth header and load the returned
  // signed storage URL in the iframe (an iframe src cannot carry a header).
  useEffect(() => {
    if (!selectedAnesthesiaDoc) {
      setAnesthesiaViewUrl(null)
      return
    }
    let cancelled = false
    setAnesthesiaViewUrl(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/documents/view?id=${selectedAnesthesiaDoc.id}`, {
          headers: { ...(await authHeaders()) },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setAnesthesiaViewUrl(data.url || null)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedAnesthesiaDoc])

  // Auto-select first anesthesia doc
  useEffect(() => {
    if (isAnesthesiaTab && anesthesiaDocs.length > 0 && !selectedAnesthesiaDoc) {
      setSelectedAnesthesiaDoc(anesthesiaDocs[0])
    }
  }, [isAnesthesiaTab, anesthesiaDocs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAnesthesiaNotes() {
    if (!selectedAnesthesiaDoc) return
    setSavingNotes(true)
    try {
      await fetch(`/api/documents/${selectedAnesthesiaDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ description: anesthesiaNotes }),
      })
    } catch { /* toast handled by hook */ }
    setSavingNotes(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            All case documents organized by type
            {!docsLoading && ` (${allDocuments.length} total)`}
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) {
            setSelectedFiles([])
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
                    {DOCUMENT_CATEGORIES.map((c) => (
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

      {/* Sub-tabs */}
      <div className="border-b mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {DOCUMENT_SUB_TABS.map((tab) => {
            const isActive = activeSubTab === tab.key
            const count = tabCounts.find(c => c.key === tab.key)?.count ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => handleSubTabChange(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-neutral-900 border-[#DFC06A]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                    isActive ? 'bg-[#DFC06A]/15 text-[#8B7333]' : 'bg-neutral-100 text-neutral-500'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Anesthesia Records Custom View */}
      {isAnesthesiaTab && (
        <div>
          {docsLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : anesthesiaDocs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No anesthesia records"
              description="Upload anesthesia records to review them here with inline analysis tools."
            />
          ) : (
            <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)' }}>
              {/* Left: Document list + PDF viewer */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Doc selector */}
                {anesthesiaDocs.length > 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    {anesthesiaDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedAnesthesiaDoc(doc)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-md border whitespace-nowrap transition-colors',
                          selectedAnesthesiaDoc?.id === doc.id
                            ? 'bg-[#0E1F35] text-white border-[#0E1F35]'
                            : 'bg-white text-muted-foreground border-[#D8DCE3] hover:border-[#DFC06A]'
                        )}
                      >
                        {doc.file_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* PDF Viewer */}
                {selectedAnesthesiaDoc ? (
                  <div className="flex-1 border rounded-lg overflow-hidden bg-white">
                    {anesthesiaViewUrl ? (
                      <iframe
                        src={`${anesthesiaViewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full"
                        title={selectedAnesthesiaDoc.file_name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Loading document…</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Select an anesthesia record to view</p>
                  </div>
                )}
              </div>

              {/* Right: Analysis & Notes panel */}
              <div className="w-80 shrink-0 flex flex-col gap-4">
                {/* Document Info */}
                {selectedAnesthesiaDoc && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Record Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">File</p>
                        <p className="text-sm font-medium truncate">{selectedAnesthesiaDoc.file_name}</p>
                      </div>
                      {selectedAnesthesiaDoc.date_of_document && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                          <p className="text-sm">{formatDate(selectedAnesthesiaDoc.date_of_document)}</p>
                        </div>
                      )}
                      {selectedAnesthesiaDoc.page_count && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pages</p>
                          <p className="text-sm">{selectedAnesthesiaDoc.page_count}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {selectedAnesthesiaDoc.mime_type === 'application/pdf' && selectedAnesthesiaDoc.ocr_status !== 'processing' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => processDocument.mutate(selectedAnesthesiaDoc.id)}
                            disabled={processDocument.isPending}
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            {selectedAnesthesiaDoc.ocr_status === 'completed' ? 'Reprocess AI' : 'Analyze with AI'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Analysis */}
                {selectedAnesthesiaDoc?.ai_summary && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedAnesthesiaDoc.ai_summary}</p>
                      {selectedAnesthesiaDoc.ai_key_findings && selectedAnesthesiaDoc.ai_key_findings.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Key Findings</p>
                          {selectedAnesthesiaDoc.ai_key_findings.map((f: string, i: number) => (
                            <div key={i} className="flex gap-2 text-sm">
                              <span className="text-[#DFC06A] shrink-0">•</span>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <Card className="flex-1">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Analysis Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex flex-col h-full">
                    <Textarea
                      value={anesthesiaNotes}
                      onChange={(e) => setAnesthesiaNotes(e.target.value)}
                      placeholder="Add your analysis notes for this anesthesia record..."
                      className="flex-1 min-h-[200px] text-sm resize-none"
                    />
                    <Button
                      size="sm"
                      className="mt-2 self-end"
                      onClick={saveAnesthesiaNotes}
                      disabled={savingNotes}
                      style={{ backgroundColor: '#0E1F35' }}
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard Document Grid */}
      {!isAnesthesiaTab && <div className="flex gap-6">
        {/* Folder Tree Sidebar (only for medical/all) */}
        {showFolderSidebar && (
          <div className="w-56 shrink-0">
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
                  All
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
        )}

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
            {relevantCategories.length > 1 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {relevantCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {docsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={`No ${activeTabConfig.label.toLowerCase()} found`}
              description="Upload documents to get started."
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
      </div>}

      {/* Document Viewer */}
      <DocumentViewer
        document={viewingDoc}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  )
}
