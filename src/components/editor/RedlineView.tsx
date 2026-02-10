'use client'

import { useMemo } from 'react'
import HtmlDiffModule from 'htmldiff-js'
import '@/components/editor/editor-styles.css'

// htmldiff-js exports { default: { execute } } — need to unwrap
const HtmlDiff = (HtmlDiffModule as unknown as { default: { execute: (a: string, b: string) => string } }).default || HtmlDiffModule

interface RedlineViewProps {
  originalHtml: string
  editedHtml: string
  editorName?: string
}

export function RedlineView({ originalHtml, editedHtml, editorName }: RedlineViewProps) {
  const diffHtml = useMemo(() => {
    if (!originalHtml || !editedHtml) return editedHtml || originalHtml || ''
    try {
      return HtmlDiff.execute(originalHtml, editedHtml)
    } catch {
      // Fallback: just show the edited version
      return editedHtml
    }
  }, [originalHtml, editedHtml])

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg border text-xs">
        <span className="font-medium text-gray-600">Redline Legend:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
          <del className="text-red-600">Deleted text</del>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
          <ins className="text-green-700 no-underline">Added text</ins>
        </span>
        {editorName && (
          <span className="ml-auto text-gray-500">
            Edited by <strong>{editorName}</strong>
          </span>
        )}
      </div>

      {/* Diff content — reuse tiptap-editor + ProseMirror classes for identical formatting */}
      <div className="tiptap-editor redline-content" style={{ border: '1px solid hsl(var(--border))' }}>
        <div
          className="ProseMirror"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
      </div>

      {/* Redline-specific ins/del styles layered on top of editor styles */}
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
        .redline-content ins img,
        .redline-content del img {
          border: 2px solid;
        }
      `}</style>
    </div>
  )
}
