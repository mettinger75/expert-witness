'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface MeetingUploaderProps {
  caseId: string
  onFileSelected: (file: File) => void
}

const ACCEPTED_TYPES = ['.mp3', '.wav', '.m4a', '.webm', '.ogg']
const ACCEPTED_MIME = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg']
const MAX_SIZE_MB = 25
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function MeetingUploader({ caseId, onFileSelected }: MeetingUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null)

      // Check file type
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
        setError(`Unsupported file type. Accepted: ${ACCEPTED_TYPES.join(', ')}`)
        return
      }

      // Check file size
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File is too large (${formatFileSize(file.size)}). Maximum size is ${MAX_SIZE_MB}MB.`)
        return
      }

      onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        validateAndSelect(files[0])
      }
    },
    [validateAndSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        validateAndSelect(files[0])
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [validateAndSelect]
  )

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 p-8 rounded-lg
          border-2 border-dashed cursor-pointer transition-colors
          ${isDragging
            ? 'border-[#C9A84C] bg-[#C9A84C]/5'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }
        `}
      >
        <Upload
          className="h-8 w-8"
          style={{ color: isDragging ? '#C9A84C' : '#94a3b8' }}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Drag and drop an audio file here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Accepted: MP3, WAV, M4A, WebM, OGG (max {MAX_SIZE_MB}MB)
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
