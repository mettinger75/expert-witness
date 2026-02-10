'use client'

import { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'

interface UploadedDocument {
  id: string
  file_name: string
  file_size: number
  category: string
  created_at: string
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getCategoryLabel(value: string): string {
  return (
    CATEGORIES.find((c) => c.value === value)?.label ||
    value.replace(/_/g, ' ')
  )
}

export function PortalDocuments({ token }: PortalDocumentsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState('medical_records')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB')
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
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('category', category)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 85))
      }, 300)

      const res = await fetch(`/api/portal/${token}/documents`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      setUploadProgress(100)

      // Add to local list
      setUploadedDocs((prev) => [
        {
          id: data.document.id,
          file_name: data.document.file_name || selectedFile.name,
          file_size: selectedFile.size,
          category,
          created_at: new Date().toISOString(),
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#C9A84C]" />
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
                  ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                  : selectedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 hover:border-[#C9A84C]/50 hover:bg-gray-50'
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
                  50MB)
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
                  className="h-full bg-[#C9A84C] rounded-full transition-all duration-300"
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

      {/* Uploaded documents list */}
      {uploadedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0E1F35] flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#C9A84C]" />
              Uploaded This Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-[#0E1F35]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize"
                  >
                    {getCategoryLabel(doc.category)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
