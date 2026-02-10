'use client'

import { useState, useCallback, useMemo } from 'react'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, Download, Loader2, Check, Eye, Pencil, FileSignature, GitCompareArrows } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/formatters'
import { SignaturePad } from '@/components/signing/SignaturePad'
import HtmlDiffModule from 'htmldiff-js'
import '@/components/editor/editor-styles.css'

// htmldiff-js exports { default: { execute } } — need to unwrap
const HtmlDiff = (HtmlDiffModule as unknown as { default: { execute: (a: string, b: string) => string } }).default || HtmlDiffModule

interface SharedViewProps {
  token: string
  link: {
    id: string
    entity_type: 'report' | 'contract'
    permission: 'view' | 'edit' | 'sign'
    recipient_name: string | null
    expires_at: string
    original_html: string | null
    edited_html: string | null
  }
  entity: Record<string, unknown>
}

export function SharedView({ token, link, entity }: SharedViewProps) {
  // Determine the starting content: use previously saved edits if they exist, else the original
  const originalContent = (() => {
    if (link.entity_type === 'report') {
      const reportContent = entity.content as Record<string, unknown> | null
      if (reportContent?.import_mode === 'monolithic') {
        return (reportContent.html as string) || (entity.rendered_html as string) || ''
      }
      if (entity.rendered_html) return entity.rendered_html as string
      const sections = entity.sections_data as Record<string, { title: string; content: string }> | null
      if (sections) {
        const order = ['introduction', 'qualifications', 'narrative_summary', 'clinical_analysis', 'breach_analysis', 'causation', 'conclusion']
        return order
          .filter((key) => sections[key])
          .map((key) => `<h2>${sections[key].title}</h2>${sections[key].content}`)
          .join('')
      }
      return ''
    } else {
      return (entity.rendered_html as string) || ''
    }
  })()

  // If the attorney has already saved edits previously, resume from those edits
  const [content, setContent] = useState<string>(link.edited_html || originalContent)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signed, setSigned] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'redline'>('edit')

  const isEditable = link.permission === 'edit'
  const isSignable = link.permission === 'sign' && link.entity_type === 'contract'

  // Compute the redline diff
  const redlineHtml = useMemo(() => {
    const base = link.original_html || originalContent
    if (!base || !content || base === content) return null
    try {
      return HtmlDiff.execute(base, content)
    } catch {
      return null
    }
  }, [link.original_html, originalContent, content])

  const hasChanges = redlineHtml !== null

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/shared-links/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      toast.success('Changes saved — Dr. Ettinger will review your edits')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [token, content])

  const handleExportPdf = useCallback(() => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Document</title><style>
        body { font-family: Georgia, serif; max-width: 8.5in; margin: 0 auto; padding: 1in; font-size: 12pt; line-height: 1.6; }
        h1, h2, h3 { color: #0E1F35; } h2 { text-transform: uppercase; border-bottom: 1px solid #C9A84C; padding-bottom: 0.25rem; }
        table { width: 100%; border-collapse: collapse; } th { background: #0E1F35; color: white; padding: 0.4rem 0.6rem; border: 1px solid #1C3555; text-transform: uppercase; font-size: 9pt; }
        td { padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; } tr:nth-child(even) td { background: #f9fafb; }
      </style></head><body>${content}</body></html>`)
      w.document.close()
      w.print()
    }
  }, [content])

  const handleSign = useCallback(async (signatureData: string, signerName: string) => {
    try {
      const res = await fetch(`/api/shared-links/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, signerName, agreed: true }),
      })
      if (!res.ok) throw new Error('Signing failed')
      setSigned(true)
      toast.success('Document signed successfully')
    } catch {
      toast.error('Failed to sign document')
    }
  }, [token])

  const PermissionIcon = link.permission === 'view' ? Eye : link.permission === 'edit' ? Pencil : FileSignature
  const permissionLabel = link.permission === 'view' ? 'View Only' : link.permission === 'edit' ? 'Edit Access' : 'Signature Required'

  return (
    <div>
      {/* Info bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            <PermissionIcon className="h-3 w-3 mr-1 inline" />
            {permissionLabel}
          </Badge>
          {link.recipient_name && (
            <span className="text-sm text-muted-foreground">
              Shared with {link.recipient_name}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Expires {formatDate(link.expires_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit / Redline toggle for edit permission */}
          {isEditable && hasChanges && (
            <div className="flex rounded-md border overflow-hidden mr-2">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-[#0E1F35] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Pencil className="h-3 w-3 mr-1 inline" />
                Edit
              </button>
              <button
                onClick={() => setViewMode('redline')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'redline'
                    ? 'bg-[#0E1F35] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <GitCompareArrows className="h-3 w-3 mr-1 inline" />
                Redline
              </button>
            </div>
          )}
          {isEditable && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {saved ? 'Saved' : 'Save'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Document title */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
          {(entity.report_name as string) || (entity.title as string) || 'Shared Document'}
        </h1>
      </div>

      {/* Signed confirmation */}
      {signed && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-green-800">Document Signed</h2>
          <p className="text-sm text-green-600 mt-1">
            Thank you. Your signature has been recorded. You may close this page.
          </p>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="mt-4">
            <Download className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Edit mode banner */}
      {isEditable && !signed && viewMode === 'edit' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Pencil className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            You can edit this document. Your changes are tracked as redlines.
            {hasChanges && ' Switch to '}
            {hasChanges && (
              <button onClick={() => setViewMode('redline')} className="font-semibold underline text-blue-700">
                Redline view
              </button>
            )}
            {hasChanges && ' to review your changes before saving.'}
            {!hasChanges && ' Click Save when done.'}
          </span>
        </div>
      )}

      {/* Redline mode banner */}
      {isEditable && !signed && viewMode === 'redline' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            <strong>Redline view</strong> — Your changes are highlighted below.{' '}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded bg-green-200 border border-green-400" /> Added
            </span>{' '}
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded bg-red-200 border border-red-400" /> Deleted
            </span>
          </span>
        </div>
      )}

      {/* Document editor/viewer */}
      {!signed && viewMode === 'edit' && (
        <div className="bg-white rounded-lg border shadow-sm">
          {link.entity_type === 'contract' && !isEditable ? (
            <div
              className="p-8"
              style={{ fontFamily: 'Georgia, serif' }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <TiptapEditor
              content={content}
              onUpdate={isEditable ? setContent : undefined}
              editable={isEditable}
              placeholder="Document content..."
            />
          )}
        </div>
      )}

      {/* Redline view — uses same tiptap-editor styles as the editor for identical formatting */}
      {!signed && viewMode === 'redline' && redlineHtml && (
        <div>
          <div className="tiptap-editor redline-content" style={{ border: '1px solid hsl(var(--border))' }}>
            <div
              className="ProseMirror"
              dangerouslySetInnerHTML={{ __html: redlineHtml }}
            />
          </div>
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
          `}</style>
        </div>
      )}

      {/* Signature section for contracts */}
      {isSignable && !signed && (
        <div className="mt-8">
          <SignaturePad onSign={handleSign} signerLabel={link.recipient_name || 'Attorney'} />
        </div>
      )}
    </div>
  )
}
