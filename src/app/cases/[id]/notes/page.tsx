'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { NOTE_TYPES, MILESTONE_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDate, formatDateTime } from '@/lib/formatters'
import {
  Plus, StickyNote, Pin, MessageSquare,
  Phone, Mail, Video, Users as UsersIcon,
  Flag, CheckCircle2, Circle,
} from 'lucide-react'

// Communication types
const COMMUNICATION_TYPES = [
  { value: 'phone', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'video', label: 'Video Call', icon: Video },
  { value: 'in_person', label: 'In Person', icon: UsersIcon },
]

function getCommunicationIcon(type: string) {
  const ct = COMMUNICATION_TYPES.find((c) => c.value === type)
  return ct?.icon ?? MessageSquare
}

// Placeholder notes
const placeholderNotes = [
  { id: '1', title: 'Key finding - monitoring gap', note_type: 'clinical', content: 'There is an 8-minute gap in the anesthesia record between the documented blood pressure drop and the first intervention. This appears to be a significant deviation from standard monitoring protocols.', is_pinned: true, created_at: '2025-10-15T14:30:00' },
  { id: '2', title: 'Strategy discussion with attorney', note_type: 'strategy', content: 'Discussed overall case strategy with retaining attorney. Focus will be on monitoring failures and delayed response to hemodynamic changes.', is_pinned: true, created_at: '2025-10-10T09:00:00' },
  { id: '3', title: 'Literature note - ASA guidelines', note_type: 'research', content: 'ASA Standards for Basic Anesthetic Monitoring (2020 update) - relevant sections on continuous blood pressure monitoring and response times.', is_pinned: false, created_at: '2025-10-08T16:00:00' },
  { id: '4', title: null, note_type: 'general', content: 'Need to request additional nursing notes from the recovery room period.', is_pinned: false, created_at: '2025-10-05T11:00:00' },
]

// Placeholder communications
const placeholderCommunications = [
  { id: '1', communication_type: 'phone', direction: 'outgoing', subject: 'Initial case discussion', summary: 'Discussed case facts with retaining attorney John Mitchell. Agreed to review medical records and provide preliminary opinion.', communication_date: '2025-08-01T10:00:00', duration_minutes: 30 },
  { id: '2', communication_type: 'email', direction: 'incoming', subject: 'Additional records received', summary: 'Received additional nursing notes and pharmacy records from paralegal.', communication_date: '2025-08-20T14:00:00', duration_minutes: null },
  { id: '3', communication_type: 'video', direction: 'outgoing', subject: 'Case strategy conference', summary: 'Video conference with legal team to discuss preliminary findings and case strategy.', communication_date: '2025-09-05T15:00:00', duration_minutes: 60 },
]

// Placeholder milestones
const placeholderMilestones = [
  { id: '1', milestone_type: 'records_received', title: 'Initial records received', due_date: '2025-08-01', completed_date: '2025-08-01', is_completed: true },
  { id: '2', milestone_type: 'review_complete', title: 'Record review complete', due_date: '2025-08-30', completed_date: '2025-08-25', is_completed: true },
  { id: '3', milestone_type: 'opinion_formed', title: 'Preliminary opinion formed', due_date: '2025-09-01', completed_date: '2025-09-01', is_completed: true },
  { id: '4', milestone_type: 'report_drafted', title: 'Expert report drafted', due_date: '2025-09-15', completed_date: '2025-09-12', is_completed: true },
  { id: '5', milestone_type: 'report_finalized', title: 'Expert report finalized', due_date: '2025-09-30', completed_date: null, is_completed: false },
  { id: '6', milestone_type: 'deposition_scheduled', title: 'Deposition scheduled', due_date: '2025-11-15', completed_date: null, is_completed: false },
]

export default function CaseNotesPage() {
  const params = useParams()
  const caseId = params.id as string
  const [activeTab, setActiveTab] = useState('notes')
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [addCommOpen, setAddCommOpen] = useState(false)
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)

  // Sort notes: pinned first, then by date
  const sortedNotes = [...placeholderNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <div>
            {activeTab === 'notes' && (
              <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
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
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="note-title">Title (optional)</Label>
                      <Input id="note-title" placeholder="Note title" />
                    </div>
                    <div>
                      <Label htmlFor="note-type">Type</Label>
                      <Select defaultValue="general">
                        <SelectTrigger id="note-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="note-content">Content</Label>
                      <Textarea id="note-content" rows={5} placeholder="Write your note..." />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setAddNoteOpen(false)}>Cancel</Button>
                      <Button onClick={() => setAddNoteOpen(false)}>Save Note</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {activeTab === 'communications' && (
              <Dialog open={addCommOpen} onOpenChange={setAddCommOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Log Communication</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="comm-type">Type</Label>
                        <Select>
                          <SelectTrigger id="comm-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMUNICATION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="comm-date">Date</Label>
                        <Input id="comm-date" type="datetime-local" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comm-subject">Subject</Label>
                      <Input id="comm-subject" placeholder="Communication subject" />
                    </div>
                    <div>
                      <Label htmlFor="comm-summary">Summary</Label>
                      <Textarea id="comm-summary" rows={4} placeholder="Summarize the communication..." />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setAddCommOpen(false)}>Cancel</Button>
                      <Button onClick={() => setAddCommOpen(false)}>Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {activeTab === 'milestones' && (
              <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Milestone</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="ms-type">Milestone Type</Label>
                      <Select>
                        <SelectTrigger id="ms-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {MILESTONE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="ms-title">Title</Label>
                      <Input id="ms-title" placeholder="Milestone title" />
                    </div>
                    <div>
                      <Label htmlFor="ms-due">Due Date</Label>
                      <Input id="ms-due" type="date" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancel</Button>
                      <Button onClick={() => setAddMilestoneOpen(false)}>Add Milestone</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Notes Tab */}
        <TabsContent value="notes">
          {sortedNotes.length === 0 ? (
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          {placeholderCommunications.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No communications logged"
              description="Log phone calls, emails, and meetings related to this case."
              action={
                <Button onClick={() => setAddCommOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Communication
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {placeholderCommunications.map((comm) => {
                const CommIcon = getCommunicationIcon(comm.communication_type)
                return (
                  <Card key={comm.id}>
                    <CardContent className="flex items-start gap-3 py-4">
                      <div className="p-2 rounded-md bg-muted">
                        <CommIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{comm.subject}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {comm.direction}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{comm.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(comm.communication_date)}</span>
                          {comm.duration_minutes && (
                            <span>{comm.duration_minutes} min</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          {placeholderMilestones.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No milestones"
              description="Track case milestones and deadlines."
              action={
                <Button onClick={() => setAddMilestoneOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {placeholderMilestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="cursor-pointer">
                      {milestone.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${milestone.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {milestone.title}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {getLabelForValue(MILESTONE_TYPES, milestone.milestone_type)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {milestone.is_completed ? (
                        <div className="text-xs text-emerald-600">
                          Completed {formatDate(milestone.completed_date)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Due {formatDate(milestone.due_date)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
