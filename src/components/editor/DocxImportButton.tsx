'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DocxImportButtonProps {
  onImport: (html: string, filename: string) => void
  disabled?: boolean
}

export function DocxImportButton({ onImport, disabled }: DocxImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!file.name.endsWith('.docx')) {
      toast.error('Please select a .docx file')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/reports/import-docx', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Import failed')
      }

      const { html, warnings, filename } = await res.json()

      if (warnings && warnings.length > 0) {
        toast.warning(`Imported with ${warnings.length} warning(s)`, {
          description: warnings.slice(0, 3).join('; '),
        })
      } else {
        toast.success(`Imported "${filename}" successfully`)
      }

      onImport(html, filename)
    } catch (error) {
      console.error('DOCX import error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        Import DOCX
      </Button>
    </>
  )
}
