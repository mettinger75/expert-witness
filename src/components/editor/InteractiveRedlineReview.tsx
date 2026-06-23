'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import HtmlDiffModule from 'htmldiff-js'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import '@/components/editor/editor-styles.css'
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  XCircle,
  Pencil,
  Shield,
  Loader2,
  Send,
  Save,
  Undo2,
} from 'lucide-react'

// htmldiff-js exports { default: { execute } } — need to unwrap
const HtmlDiff = (HtmlDiffModule as unknown as { default: { execute: (a: string, b: string) => string } }).default || HtmlDiffModule

// ── Types ────────────────────────────────────────────────────────────
interface DiffChange {
  id: number
  type: 'insert' | 'delete' | 'replace'
  status: 'pending' | 'accepted' | 'rejected' | 'modified'
  modifiedHtml?: string
}

interface SavedChangeState {
  id: number
  status: 'pending' | 'accepted' | 'rejected' | 'modified'
  modifiedHtml?: string
}

interface SavedReviewState {
  changes: SavedChangeState[]
  html?: string // full innerHTML including free edits
}

/** Snapshot for undo stack — captures full state before each action */
interface UndoSnapshot {
  html: string
  changes: DiffChange[]
  currentChangeId: number
}

interface InteractiveRedlineReviewProps {
  originalHtml: string
  editedHtml: string
  editorName?: string
  reportId: string
  revisionId: string
  savedReviewState?: SavedReviewState | null
  onFinalize: (resultHtml: string) => void
  onSendBack: (resultHtml: string) => void
  onCancel: () => void
  finalizing?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Parse the diff HTML to find all <ins> and <del> elements,
 * group diffmod pairs as single "replace" changes,
 * and annotate each with a data-change-id attribute.
 */
function detectChanges(diffHtml: string): { annotatedHtml: string; changes: DiffChange[] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${diffHtml}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement

  const processed = new Set<Element>()
  const changes: DiffChange[] = []
  let id = 0

  const allElements: Element[] = []
  root.querySelectorAll('ins, del').forEach((el) => allElements.push(el))

  for (const el of allElements) {
    if (processed.has(el)) continue

    if (el.tagName.toLowerCase() === 'del') {
      if (el.classList.contains('diffmod')) {
        let next: Element | null = el.nextElementSibling
        if (!next) {
          let nextNode = el.nextSibling
          while (nextNode && nextNode.nodeType === 3 && nextNode.textContent?.trim() === '') {
            nextNode = nextNode.nextSibling
          }
          if (nextNode && nextNode.nodeType === 1) next = nextNode as Element
        }
        if (next && next.tagName.toLowerCase() === 'ins' && next.classList.contains('diffmod') && !processed.has(next)) {
          el.setAttribute('data-change-id', String(id))
          el.setAttribute('data-status', 'pending')
          next.setAttribute('data-change-id', String(id))
          next.setAttribute('data-status', 'pending')
          changes.push({ id, type: 'replace', status: 'pending' })
          processed.add(el)
          processed.add(next)
          id++
          continue
        }
      }

      el.setAttribute('data-change-id', String(id))
      el.setAttribute('data-status', 'pending')
      changes.push({ id, type: 'delete', status: 'pending' })
      processed.add(el)
      id++
    } else {
      el.setAttribute('data-change-id', String(id))
      el.setAttribute('data-status', 'pending')
      changes.push({ id, type: 'insert', status: 'pending' })
      processed.add(el)
      id++
    }
  }

  return { annotatedHtml: root.innerHTML, changes }
}

/**
 * Get the HTML content of a change from the live DOM.
 */
function getChangeContentFromDom(container: HTMLElement, changeId: number, preferIns: boolean): string {
  const elements = container.querySelectorAll(`[data-change-id="${changeId}"]`)
  for (const el of Array.from(elements)) {
    const tag = el.tagName.toLowerCase()
    if (preferIns && tag === 'ins') return el.innerHTML
    if (!preferIns && tag === 'del') return el.innerHTML
  }
  return elements[0]?.innerHTML || ''
}

/**
 * Resolve a single change directly in the live DOM.
 * Accept: unwrap ins (keep content), remove del
 * Reject: remove ins, unwrap del (keep original)
 * Modified: replace both with modifiedHtml
 */
function resolveChangeInDom(
  container: HTMLElement,
  changeId: number,
  action: 'accepted' | 'rejected' | 'modified',
  modifiedHtml?: string
) {
  const elements = Array.from(container.querySelectorAll(`[data-change-id="${changeId}"]`))

  if (action === 'modified' && modifiedHtml) {
    const fragment = document.createRange().createContextualFragment(modifiedHtml)
    if (elements[0]) {
      elements[0].replaceWith(fragment)
    }
    for (let i = 1; i < elements.length; i++) {
      elements[i].remove()
    }
  } else if (action === 'accepted') {
    for (const el of elements) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'ins') {
        el.replaceWith(...Array.from(el.childNodes))
      } else if (tag === 'del') {
        el.remove()
      }
    }
  } else if (action === 'rejected') {
    for (const el of elements) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'ins') {
        el.remove()
      } else if (tag === 'del') {
        el.replaceWith(...Array.from(el.childNodes))
      }
    }
  }
}

/**
 * Resolve all remaining pending changes in HTML string for finalization.
 * Default: accept all pending (attorney edits stand).
 */
function resolveAllPending(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement

  const allTagged = Array.from(root.querySelectorAll('[data-change-id]')).reverse()
  for (const el of allTagged) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'ins') {
      el.replaceWith(...Array.from(el.childNodes))
    } else if (tag === 'del') {
      el.remove()
    }
  }

  return root.innerHTML
}

/**
 * Find the next pending change id after a given change id.
 */
function findNextPendingId(changes: DiffChange[], fromId: number): number {
  const fromIdx = changes.findIndex((c) => c.id === fromId)
  for (let i = fromIdx + 1; i < changes.length; i++) {
    if (changes[i].status === 'pending') return changes[i].id
  }
  for (let i = 0; i <= fromIdx; i++) {
    if (changes[i].status === 'pending') return changes[i].id
  }
  return -1
}

// ── Component ────────────────────────────────────────────────────────

export function InteractiveRedlineReview({
  originalHtml,
  editedHtml,
  editorName,
  reportId,
  revisionId,
  savedReviewState,
  onFinalize,
  onSendBack,
  onCancel,
  finalizing = false,
}: InteractiveRedlineReviewProps) {
  // Generate diff and detect changes
  const { annotatedHtml, initialChanges } = useMemo(() => {
    if (!originalHtml || !editedHtml) return { annotatedHtml: editedHtml || '', initialChanges: [] as DiffChange[] }
    try {
      const diffHtml = HtmlDiff.execute(originalHtml, editedHtml)
      const result = detectChanges(diffHtml)
      return { annotatedHtml: result.annotatedHtml, initialChanges: result.changes }
    } catch {
      return { annotatedHtml: editedHtml, initialChanges: [] as DiffChange[] }
    }
  }, [originalHtml, editedHtml])

  // Restore saved state if available
  const restoredChanges = useMemo(() => {
    if (!savedReviewState?.changes || initialChanges.length === 0) return initialChanges
    const savedMap = new Map(savedReviewState.changes.map((c) => [c.id, c]))
    return initialChanges.map((c) => {
      const saved = savedMap.get(c.id)
      if (saved) return { ...c, status: saved.status, modifiedHtml: saved.modifiedHtml }
      return c
    })
  }, [initialChanges, savedReviewState])

  const [changes, setChanges] = useState<DiffChange[]>(restoredChanges)
  const [currentChangeId, setCurrentChangeId] = useState<number>(() => {
    const firstPending = restoredChanges.find((c) => c.status === 'pending')
    return firstPending ? firstPending.id : -1
  })
  const [isModifying, setIsModifying] = useState(false)
  const [modifyHtml, setModifyHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(savedReviewState ? 'restored' : null)
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // Derived stats
  const pendingChanges = changes.filter((c) => c.status === 'pending')
  const pendingCount = pendingChanges.length
  const reviewedCount = changes.filter((c) => c.status !== 'pending').length
  const totalCount = changes.length
  const currentChange = changes.find((c) => c.id === currentChangeId)
  const currentPendingIndex = pendingChanges.findIndex((c) => c.id === currentChangeId)

  // ── Undo Stack ──

  /** Capture current state before any destructive action */
  const pushUndo = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setUndoStack((prev) => [
      ...prev,
      {
        html: container.innerHTML,
        changes: changes.map((c) => ({ ...c })),
        currentChangeId,
      },
    ])
  }, [changes, currentChangeId])

  /** Restore the last saved state */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    const container = containerRef.current
    if (!container) return
    container.innerHTML = prev.html
    setChanges(prev.changes)
    setCurrentChangeId(prev.currentChangeId)
    setIsDirty(true)
  }, [undoStack])

  // ── Initialize DOM once on mount ──
  useEffect(() => {
    if (initializedRef.current) return
    const container = containerRef.current
    if (!container) return

    if (savedReviewState?.html) {
      container.innerHTML = savedReviewState.html
    } else {
      container.innerHTML = annotatedHtml
      if (savedReviewState?.changes) {
        for (const c of restoredChanges) {
          if (c.status !== 'pending') {
            resolveChangeInDom(container, c.id, c.status, c.modifiedHtml)
          }
        }
      }
    }

    initializedRef.current = true
  }, [annotatedHtml, savedReviewState, restoredChanges])

  // ── Highlight current pending change with gold outline ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.querySelectorAll('[data-status="current"]').forEach((el) => {
      el.setAttribute('data-status', 'pending')
    })

    if (currentChangeId >= 0) {
      const els = container.querySelectorAll(`[data-change-id="${currentChangeId}"][data-status="pending"]`)
      els.forEach((el) => {
        el.setAttribute('data-status', 'current')
      })
      if (els[0]) {
        ;(els[0] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentChangeId])

  // ── Navigation ──

  const goNext = useCallback(() => {
    if (pendingChanges.length === 0) return
    const idx = currentPendingIndex >= 0 ? (currentPendingIndex + 1) % pendingChanges.length : 0
    setCurrentChangeId(pendingChanges[idx].id)
  }, [pendingChanges, currentPendingIndex])

  const goPrev = useCallback(() => {
    if (pendingChanges.length === 0) return
    const idx = currentPendingIndex > 0 ? currentPendingIndex - 1 : pendingChanges.length - 1
    setCurrentChangeId(pendingChanges[idx].id)
  }, [pendingChanges, currentPendingIndex])

  // ── Accept / Reject / Modify ──

  const acceptChange = useCallback(() => {
    if (!currentChange || currentChange.status !== 'pending') return
    const container = containerRef.current
    if (!container) return

    // Snapshot before action for undo
    pushUndo()

    resolveChangeInDom(container, currentChange.id, 'accepted')

    const updated = changes.map((c) =>
      c.id === currentChange.id ? { ...c, status: 'accepted' as const } : c
    )
    setChanges(updated)
    setIsDirty(true)

    const nextId = findNextPendingId(updated, currentChange.id)
    setCurrentChangeId(nextId)
  }, [currentChange, changes, pushUndo])

  const rejectChange = useCallback(() => {
    if (!currentChange || currentChange.status !== 'pending') return
    const container = containerRef.current
    if (!container) return

    pushUndo()

    resolveChangeInDom(container, currentChange.id, 'rejected')

    const updated = changes.map((c) =>
      c.id === currentChange.id ? { ...c, status: 'rejected' as const } : c
    )
    setChanges(updated)
    setIsDirty(true)

    const nextId = findNextPendingId(updated, currentChange.id)
    setCurrentChangeId(nextId)
  }, [currentChange, changes, pushUndo])

  const startModify = useCallback(() => {
    if (!currentChange || currentChange.status !== 'pending') return
    const container = containerRef.current
    if (!container) return

    const content = getChangeContentFromDom(container, currentChange.id, true)
    setModifyHtml(content)
    setIsModifying(true)
  }, [currentChange])

  const saveModification = useCallback(() => {
    if (!currentChange) return
    const container = containerRef.current
    if (!container) return

    pushUndo()

    resolveChangeInDom(container, currentChange.id, 'modified', modifyHtml)

    const updated = changes.map((c) =>
      c.id === currentChange.id ? { ...c, status: 'modified' as const, modifiedHtml: modifyHtml } : c
    )
    setChanges(updated)
    setIsModifying(false)
    setModifyHtml('')
    setIsDirty(true)

    const nextId = findNextPendingId(updated, currentChange.id)
    setCurrentChangeId(nextId)
  }, [currentChange, changes, modifyHtml, pushUndo])

  const cancelModify = useCallback(() => {
    setIsModifying(false)
    setModifyHtml('')
  }, [])

  const acceptAll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    pushUndo()

    for (const c of changes) {
      if (c.status === 'pending') {
        resolveChangeInDom(container, c.id, 'accepted')
      }
    }
    setChanges(changes.map((c) => (c.status === 'pending' ? { ...c, status: 'accepted' as const } : c)))
    setCurrentChangeId(-1)
    setIsDirty(true)
  }, [changes, pushUndo])

  const rejectAll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    pushUndo()

    for (const c of changes) {
      if (c.status === 'pending') {
        resolveChangeInDom(container, c.id, 'rejected')
      }
    }
    setChanges(changes.map((c) => (c.status === 'pending' ? { ...c, status: 'rejected' as const } : c)))
    setCurrentChangeId(-1)
    setIsDirty(true)
  }, [changes, pushUndo])

  // ── Click handling ──
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (isModifying) return
      const target = (e.target as HTMLElement).closest('[data-change-id]')
      if (!target) return
      const status = target.getAttribute('data-status')
      if (status !== 'pending' && status !== 'current') return
      const changeId = Number(target.getAttribute('data-change-id'))
      setCurrentChangeId(changeId)
    },
    [isModifying]
  )

  // ── Mark dirty on any free edit ──
  const handleInput = useCallback(() => {
    setIsDirty(true)
  }, [])

  // ── Manual save ──
  const saveReviewState = useCallback(async () => {
    setSaving(true)
    try {
      const container = containerRef.current
      const reviewState: SavedReviewState = {
        changes: changes.map((c) => ({
          id: c.id,
          status: c.status,
          ...(c.modifiedHtml ? { modifiedHtml: c.modifiedHtml } : {}),
        })),
        html: container?.innerHTML || '',
      }
      const res = await fetch(`/api/reports/${reportId}/review-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId, reviewState }),
      })
      if (!res.ok) throw new Error('Save failed')
      setIsDirty(false)
      setLastSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to save review state:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [changes, reportId, revisionId])

  // ── Warn on navigation with unsaved changes ──
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // ── Finalize / Send Back ──
  const handleFinalize = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const html = resolveAllPending(container.innerHTML)
    onFinalize(html)
  }, [onFinalize])

  const handleSendBack = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const html = resolveAllPending(container.innerHTML)
    onSendBack(html)
  }, [onSendBack])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd+S to save — works from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) saveReviewState()
        return
      }

      // Ctrl/Cmd+Z to undo — works from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // Only intercept if NOT in contentEditable (let browser handle undo for typing)
        const container = containerRef.current
        if (container && container.contains(e.target as Node)) return
        if (undoStack.length > 0) {
          e.preventDefault()
          undo()
        }
        return
      }

      // Don't intercept when in modify editor
      if (isModifying) return

      // Don't intercept when user is typing in contentEditable
      const container = containerRef.current
      if (container && container.contains(e.target as Node)) return

      // Don't intercept in inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === 'n') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'a') {
        e.preventDefault()
        acceptChange()
      } else if (e.key === 'r') {
        e.preventDefault()
        rejectChange()
      } else if (e.key === 'm') {
        e.preventDefault()
        startModify()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isModifying, isDirty, goNext, goPrev, acceptChange, rejectChange, startModify, saveReviewState, undo, undoStack.length])

  // ── Render ──

  if (totalCount === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No changes detected between the original and edited versions.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }

  const currentIsPending = currentChange?.status === 'pending'
  const progressPct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      {/* ── Toolbar (always visible, never scrolls) ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 p-3 bg-white border-b shadow-sm z-10">
        {/* Change counter + progress */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-semibold text-[#0E1F35]">
            {reviewedCount} of {totalCount} reviewed
          </span>
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#DFC06A] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{progressPct}%</span>
        </div>

        {/* Pending navigation indicator */}
        {pendingCount > 0 && (
          <div className="text-xs text-muted-foreground mr-1">
            <span className="text-amber-600 font-medium">
              {currentPendingIndex + 1 > 0 ? currentPendingIndex + 1 : '—'}/{pendingCount}
            </span>
            {' pending'}
          </div>
        )}

        {!isModifying && (
          <>
            {/* Navigation */}
            <div className="flex items-center gap-1 border-l pl-2 mr-1">
              <Button variant="ghost" size="sm" onClick={goPrev} disabled={pendingCount === 0} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goNext} disabled={pendingCount === 0} className="h-7 w-7 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Accept / Reject / Modify current */}
            <div className="flex items-center gap-1 border-l pl-2 mr-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={acceptChange}
                disabled={!currentIsPending}
                className="h-7 px-2 text-green-700 hover:bg-green-50 hover:text-green-800"
                title="Accept this change"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Accept</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={rejectChange}
                disabled={!currentIsPending}
                className="h-7 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                title="Reject this change"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Reject</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={startModify}
                disabled={!currentIsPending}
                className="h-7 px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                title="Modify this change"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Modify</span>
              </Button>
            </div>

            {/* Undo + Bulk operations */}
            <div className="flex items-center gap-1 border-l pl-2 mr-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                title={undoStack.length > 0 ? `Undo last action (${undoStack.length} available)` : 'Nothing to undo'}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Undo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={acceptAll}
                disabled={pendingCount === 0}
                className="h-7 px-2 text-green-700 hover:bg-green-50"
                title="Accept all remaining"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Accept All</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={rejectAll}
                disabled={pendingCount === 0}
                className="h-7 px-2 text-red-700 hover:bg-red-50"
                title="Reject all remaining"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Reject All</span>
              </Button>
            </div>
          </>
        )}

        {/* Save + Completion actions */}
        <div className="flex items-center gap-1 border-l pl-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={saveReviewState}
            disabled={saving || !isDirty}
            className={`h-7 px-3 ${isDirty ? 'text-[#DFC06A] border-[#DFC06A]' : 'text-gray-400'}`}
            title={isDirty ? 'Save your progress (Ctrl+S)' : lastSavedAt ? `Last saved: ${lastSavedAt}` : 'No changes to save'}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            <span className="text-xs">{isDirty ? 'Save' : 'Saved'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendBack}
            disabled={finalizing || pendingCount === totalCount}
            className="h-7 px-3 text-[#0E1F35]"
            title="Send report back to attorney with your changes"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Send Back</span>
          </Button>
          <Button
            size="sm"
            onClick={handleFinalize}
            disabled={finalizing || pendingCount === totalCount}
            className="h-7 px-3 bg-green-700 hover:bg-green-800 text-white"
            title="Finalize report — makes all text final and signs"
          >
            {finalizing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Shield className="h-3.5 w-3.5 mr-1" />
            )}
            <span className="text-xs">Finalize</span>
          </Button>
        </div>
      </div>

      {/* ── Modify editor (inline, below toolbar) ── */}
      {isModifying && (
        <div className="flex-shrink-0 border-b bg-blue-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-800">
              Modify Change — edit the text below
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelModify} className="h-6 px-2 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveModification}
                className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-3 w-3 mr-1" />
                Save Modification
              </Button>
            </div>
          </div>
          <div className="border rounded bg-white" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <TiptapEditor
              content={modifyHtml}
              onUpdate={(html) => setModifyHtml(html)}
              editable={true}
              placeholder="Enter your modified text..."
            />
          </div>
        </div>
      )}

      {/* ── Hint bar ── */}
      {!isModifying && (
        <div className="flex-shrink-0 text-[10px] text-muted-foreground px-3 py-1 bg-gray-50 border-b">
          <span className="font-medium">Click anywhere to edit text directly.</span>{' '}
          Click a <span className="text-green-700">green</span>/<span className="text-red-700">red</span> change to select it, then Accept, Reject, or Modify.{' '}
          Use <strong>Undo</strong> to reverse any decision.{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-[10px]">Ctrl+S</kbd> to save.
        </div>
      )}

      {/* ── Content area (scrollable + editable) ── */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={containerRef}
          className="redline-interactive"
          style={{ border: 'none', borderRadius: 0, outline: 'none' }}
          contentEditable={!isModifying}
          suppressContentEditableWarning
          onClick={handleContainerClick}
          onInput={handleInput}
        />
      </div>

      {/* ── Legend (always visible at bottom) ── */}
      <div className="flex-shrink-0 flex items-center gap-4 p-3 bg-gray-50 border-t text-xs">
        <span className="font-medium text-gray-600">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
          <del className="text-red-600">Deleted</del>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
          <ins className="text-green-700 no-underline">Added</ins>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-[#DFC06A] bg-amber-50" />
          Current
        </span>
        {editorName && (
          <span className="ml-auto text-gray-500">
            Edited by <strong>{editorName}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
