'use client'

import { useState } from 'react'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { Button } from '@/components/ui/button'
import { Loader2, Info } from 'lucide-react'
import '@/components/editor/editor-styles.css'

interface PortalReportEditorProps {
  token: string
  reportId: string
  initialHtml: string
  reportName: string
  onSubmitted: () => void
  onCancel: () => void
}

export function PortalReportEditor({
  token,
  reportId,
  initialHtml,
  reportName,
  onSubmitted,
  onCancel,
}: PortalReportEditorProps) {
  const [content, setContent] = useState(initialHtml)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedHtml: content, notes: notes || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to submit edits')
        return
      }
      onSubmitted()
    } catch {
      setError('Failed to submit edits. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg">
        <Info className="h-5 w-5 text-[#C9A84C] shrink-0 mt-0.5" />
        <p className="text-sm text-[#0E1F35]">
          You are editing <strong>{reportName}</strong>. Your changes will be
          submitted to Dr. Ettinger for review.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Editor */}
      <TiptapEditor
        content={content}
        onUpdate={(html) => setContent(html)}
        editable={true}
        placeholder="Edit the report content..."
      />

      {/* Notes textarea */}
      <div>
        <label
          htmlFor="editor-notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes (optional)
        </label>
        <textarea
          id="editor-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for Dr. Ettinger about your changes..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 focus:outline-none resize-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit Edits
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
