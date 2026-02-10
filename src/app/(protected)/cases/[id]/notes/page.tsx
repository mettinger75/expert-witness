'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCaseNotes, useCreateCaseNote, useDeleteCaseNote, useTogglePin } from '@/hooks/useCaseNotes'
import { NOTE_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import {
  Plus, StickyNote, Pin, Loader2, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function CaseNotesPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: notes = [], isLoading } = useCaseNotes(caseId)
  const createNote = useCreateCaseNote()
  const deleteNote = useDeleteCaseNote()
  const togglePin = useTogglePin()
  const [addNoteOpen, setAddNoteOpen] = useState(false)

  // Form state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [noteContent, setNoteContent] = useState('')

  function resetForm() {
    setNoteTitle('')
    setNoteType('general')
    setNoteContent('')
  }

  async function handleAddNote() {
    if (!noteContent.trim()) {
      toast.error('Note content is required')
      return
    }

    await createNote.mutateAsync({
      case_id: caseId,
      note_type: noteType as 'general',
      title: noteTitle || null,
      content: noteContent,
    })

    resetForm()
    setAddNoteOpen(false)
  }

  async function handleTogglePin(noteId: string) {
    await togglePin.mutateAsync({ id: noteId, caseId })
  }

  async function handleDelete(noteId: string) {
    await deleteNote.mutateAsync({ id: noteId, caseId })
  }

  // Sort: pinned first, then by date (service already does this but be safe)
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="text-sm text-muted-foreground">
            Case notes, observations, and analysis
            {!isLoading && ` (${notes.length} notes)`}
          </p>
        </div>
        <Dialog open={addNoteOpen} onOpenChange={(open) => {
          setAddNoteOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  placeholder="Write your note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setAddNoteOpen(false) }}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={createNote.isPending}>
                {createNote.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Add notes to capture observations, strategies, and reminders."
          action={
            <Button onClick={() => setAddNoteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <Card key={note.id} className={note.is_pinned ? 'border-amber-200 bg-amber-50/30' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.is_pinned && (
                        <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      )}
                      {note.title && (
                        <h3 className="font-semibold text-sm">{note.title}</h3>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {getLabelForValue(NOTE_TYPES, note.note_type)}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1.5 whitespace-pre-wrap">{note.content}</p>
                    <span className="text-xs text-muted-foreground mt-2 block">
                      {formatDateTime(note.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleTogglePin(note.id)}
                      title={note.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
