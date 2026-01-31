'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateCase } from '@/hooks/useCases'
import { useUploadDocument, useCreateDocument } from '@/hooks/useDocuments'
import { CaseForm } from '@/components/cases/CaseForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DOCUMENT_CATEGORIES } from '@/lib/constants'
import type { CaseInsert } from '@/types/database.types'
import type { DocumentCategory } from '@/types/enums'
import { Upload, FileText, X, Loader2, Sparkles, FileUp, PenLine } from 'lucide-react'
import { toast } from 'sonner'

interface FileEntry {
  file: File
  category: string
}

export default function NewCasePage() {
  const router = useRouter()
  const createCase = useCreateCase()
  const uploadMutation = useUploadDocument()
  const createDocMutation = useCreateDocument()

  const [mode, setMode] = useState<'manual' | 'documents'>('manual')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<Partial<CaseInsert> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleManualSubmit(data: CaseInsert) {
    const result = await createCase.mutateAsync(data)
    router.push(`/cases/${result.id}`)
  }

  async function handleDocumentSubmit(data: CaseInsert) {
    // Create the case
    const result = await createCase.mutateAsync(data)

    // Upload all attached documents
    for (const entry of files) {
      try {
        const filePath = await uploadMutation.mutateAsync({ caseId: result.id, file: entry.file })
        await createDocMutation.mutateAsync({
          case_id: result.id,
          file_name: entry.file.name,
          original_file_name: entry.file.name,
          file_path: filePath,
          file_size: entry.file.size,
          mime_type: entry.file.type || 'application/octet-stream',
          category: entry.category as DocumentCategory,
        })
      } catch {
        // Individual file errors handled by mutation hooks
      }
    }

    router.push(`/cases/${result.id}`)
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        file: f,
        category: 'medical_record',
      }))
      setFiles((prev) => [...prev, ...newFiles])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map((f) => ({
        file: f,
        category: 'medical_record',
      }))
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateFileCategory = useCallback((index: number, category: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, category } : f))
    )
  }, [])

  async function handleExtract() {
    if (files.length === 0) {
      toast.error('Please select at least one document')
      return
    }

    setExtracting(true)
    try {
      const formData = new FormData()
      files.forEach((entry) => {
        formData.append('files', entry.file)
        formData.append('categories', entry.category)
      })

      const res = await fetch('/api/ai/extract-case', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to extract case info')
      }

      const result = await res.json()
      setExtractedData(result.caseData)
      toast.success('Case information extracted. Review and submit below.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Extraction failed'
      toast.error(message)
    } finally {
      setExtracting(false)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div>
      <PageHeader
        title="New Case"
        description="Create a new expert witness engagement"
      />

      {/* Mode Toggle */}
      <div className="flex gap-3 mb-6">
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => { setMode('manual'); setExtractedData(null) }}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Manual Entry
        </Button>
        <Button
          variant={mode === 'documents' ? 'default' : 'outline'}
          onClick={() => setMode('documents')}
        >
          <FileUp className="h-4 w-4 mr-2" />
          Create from Documents
        </Button>
      </div>

      {mode === 'manual' ? (
        <CaseForm
          onSubmit={handleManualSubmit}
          isSubmitting={createCase.isPending}
        />
      ) : (
        <div className="space-y-6">
          {/* Document Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
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
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff"
                />
              </div>

              {/* Selected Files with Type Selectors */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Files ({files.length})</Label>
                  {files.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted rounded-md px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{entry.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                      </div>
                      <Select value={entry.category} onValueChange={(v) => updateFileCategory(i, v)}>
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeFile(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Extract Button */}
              <Button
                onClick={handleExtract}
                disabled={files.length === 0 || extracting}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting case information...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Case Info from Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pre-filled Case Form */}
          {extractedData && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Review the extracted information below. Edit any fields as needed, then submit to create the case.
              </p>
              <CaseForm
                defaultValues={extractedData}
                onSubmit={handleDocumentSubmit}
                isSubmitting={createCase.isPending || uploadMutation.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
