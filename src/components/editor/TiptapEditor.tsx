'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { EditorToolbar } from './EditorToolbar'
import { useEffect, useRef } from 'react'
import './editor-styles.css'

interface TiptapEditorProps {
  content: string
  onUpdate?: (html: string) => void
  editable?: boolean
  placeholder?: string
  className?: string
}

/**
 * Convert plain text content (from legacy textarea-based sections) to simple HTML.
 * If content already starts with '<', assume it's HTML and return as-is.
 */
function ensureHtml(content: string): string {
  if (!content) return ''
  const trimmed = content.trim()
  if (trimmed.startsWith('<')) return trimmed
  // Plain text: wrap paragraphs in <p> tags
  return trimmed
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function TiptapEditor({
  content,
  onUpdate,
  editable = true,
  placeholder = 'Start writing...',
  className,
}: TiptapEditorProps) {
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: ensureHtml(content),
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate && !isUpdatingRef.current) {
        onUpdate(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class: editable ? '' : 'readonly',
      },
    },
  })

  // Sync content from parent when it changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHtml = editor.getHTML()
      const newHtml = ensureHtml(content)
      if (currentHtml !== newHtml) {
        isUpdatingRef.current = true
        editor.commands.setContent(newHtml, { emitUpdate: false })
        isUpdatingRef.current = false
      }
    }
  }, [content, editor])

  // Sync editable state
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  if (!editor) return null

  return (
    <div className={editable ? 'tiptap-editor-wrapper' : 'tiptap-readonly'}>
      <div className={`tiptap-editor ${className ?? ''}`}>
        {editable && <EditorToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
