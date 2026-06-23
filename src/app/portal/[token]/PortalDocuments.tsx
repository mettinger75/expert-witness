'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle,
  File,
  X,
  FolderOpen,
  FileText,
  Clock,
} from 'lucide-react'

interface CaseDocument {
  id: string
  file_name: string
  original_file_name: string
  file_size_bytes: number
  document_type: string | null
  description: string | null
  source_provider: string | null
  created_at: string
  mime_type: string | null
}

interface PortalDocumentsProps {
  token: string
}

const CATEGORIES = [
  { value: 'medical_records', label: 'Medical Records' },
  { value: 'billing_records', label: 'Billing Records' },
  { value: 'deposition_transcript', label: 'Deposition Transcript' },
  { value: 'pleading', label: 'Pleading' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' },
]

// Map DB document_type values back to display labels
const DOC_TYPE_LABELS: Record<string, string> = {
  medical_record: 'Medical Record',
  billing_record: 'Billing Record',
  imaging: 'Imaging',
  lab_result: 'Lab Result',
  operative_report: 'Operative Report',
  anesthesia_record: 'Anesthesia Record',
  nursing_notes: 'Nursing Notes',
  physician_notes: 'Physician Notes',
  discharge_summary: 'Discharge Summary',
  autopsy_report: 'Autopsy Report',
  deposition_transcript: 'Deposition Transcript',
  expert_report: 'Expert Report',
  pleading: 'Pleading',
  correspondence: 'Correspondence',
  insurance_document: 'Insurance Document',
  photograph: 'Photograph',
  video: 'Video',
  audio: 'Audio',
  other: 'Other',
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getDocTypeLabel(value: string | null): string {
  if (!value) return 'Other'
  return DOC_TYPE_LABELS[value] || value.replace(/_/g, ' ')
}

function getCategoryLabel(value: string): string {
  return (
    CATEGORIES.find((c) => c.value === value)?.label ||
    DOC_TYPE_LABELS[value] ||
    value.replace(/_/g, ' ')
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function PortalDocuments({ token }: PortalDocumentsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState('medical_records')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [documents, setDocuments] = useState<CaseDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing documents on mount
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(`/api/portal/${token}/documents`)
        if (res.ok) {
          const data = await res.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err)
      } finally {
        setLoadingDocs(false)
      }
    }
    fetchDocuments()
  }, [token])

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      toast.error('File size must be under 200MB')
      return
    }
    setSelectedFile(file)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  function clearFile() {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(5)

    try {
      // Step 1: Get a signed upload URL from our API (small JSON request)
      const urlRes = await fetch(`/api/portal/${token}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-upload-url',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      })

      if (!urlRes.ok) {
        const errText = await urlRes.text().catch(() => '')
        throw new Error(`Step 1 failed (${urlRes.status}): ${errText}`)
      }

      const { uploadUrl, storagePath } = await urlRes.json()
      setUploadProgress(20)

      // Step 2: Upload the file directly to Supabase Storage (bypasses Vercel 4.5MB body limit)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
        body: selectedFile,
      })

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '')
        throw new Error(`Storage upload failed (${uploadRes.status}): ${errText}`)
      }

      setUploadProgress(70)

      // Step 3: Confirm the upload and create the DB record
      const confirmRes = await fetch(`/api/portal/${token}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-upload',
          storagePath,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          category,
          description: description.trim() || undefined,
        }),
      })

      if (!confirmRes.ok) {
        const errText = await confirmRes.text().catch(() => '')
        throw new Error(`Record creation failed (${confirmRes.status}): ${errText}`)
      }

      const data = await confirmRes.json()
      setUploadProgress(100)

      // Add to documents list at the top
      setDocuments((prev) => [
        {
          id: data.document.id,
          file_name: data.document.file_name || selectedFile.name,
          original_file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          document_type: data.document.document_type || category,
          description: data.document.description || description.trim() || null,
          source_provider: data.document.source_provider || null,
          created_at: new Date().toISOString(),
          mime_type: selectedFile.type || null,
        },
        ...prev,
      ])

      toast.success('Document uploaded successfully')

      // Reset form
      setTimeout(() => {
        clearFile()
        setDescription('')
        setUploadProgress(0)
      }, 1000)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload document'
      )
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card data-tour="documents-upload-area">
        <CardHeader>
          <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#DFC06A]" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${
                isDragging
                  ? 'border-[#DFC06A] bg-[#DFC06A]/5'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 hover:border-[#DFC06A]/50 hover:bg-gray-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleInputChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.tiff,.bmp"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-8 w-8 text-emerald-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <FileUp className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  Drag & drop a file here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, PNG, TIFF (max
                  200MB)
                </p>
              </>
            )}
          </div>

          {/* Category selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Document Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this document..."
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Upload progress */}
          {uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#DFC06A] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right">
                {uploadProgress === 100
                  ? 'Upload complete'
                  : `Uploading... ${uploadProgress}%`}
              </p>
            </div>
          )}

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-[#0E1F35] hover:bg-[#0E1F35]/90"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : uploadProgress === 100 ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* All case documents */}
      <Card data-tour="documents-list">
        <CardHeader>
          <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#DFC06A]" />
            Case Documents
            {!loadingDocs && (
              <Badge variant="outline" className="ml-2 text-xs">
                {documents.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <File className="h-4 w-4 text-[#0E1F35] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.original_file_name || doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(doc.file_size_bytes)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.created_at)}
                        </span>
                        {doc.source_provider && (
                          <>
                            <span>·</span>
                            <span>{doc.source_provider}</span>
                          </>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize flex-shrink-0 ml-2"
                  >
                    {getDocTypeLabel(doc.document_type)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
