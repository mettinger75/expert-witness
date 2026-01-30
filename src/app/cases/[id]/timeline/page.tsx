'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { TIMELINE_EVENT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import { Plus, Clock, Filter, AlertCircle, FileText } from 'lucide-react'

// Placeholder timeline entries
const placeholderEntries = [
  { id: '1', event_datetime: '2025-03-15T07:30:00', event_type: 'admission', title: 'Patient admitted to pre-op', description: 'Patient arrived for scheduled surgery. Pre-op assessment completed.', provider_name: 'Dr. Martinez', is_significant: false },
  { id: '2', event_datetime: '2025-03-15T08:15:00', event_type: 'anesthesia_start', title: 'Anesthesia induction begun', description: 'General anesthesia induced with propofol and fentanyl. Intubation successful.', provider_name: 'Dr. Smith', is_significant: false },
  { id: '3', event_datetime: '2025-03-15T08:45:00', event_type: 'vital_signs', title: 'Hypotension noted', description: 'BP dropped to 80/50. Ephedrine administered.', provider_name: 'Dr. Smith', is_significant: true },
  { id: '4', event_datetime: '2025-03-15T09:00:00', event_type: 'complication', title: 'Bradycardia event', description: 'Heart rate dropped to 38 bpm. Atropine 0.5mg IV administered. Patient stabilized after 2 minutes.', provider_name: 'Dr. Smith', is_significant: true },
  { id: '5', event_datetime: '2025-03-15T09:30:00', event_type: 'procedure', title: 'Surgery completed', description: 'Procedure concluded without further complications.', provider_name: 'Dr. Johnson', is_significant: false },
  { id: '6', event_datetime: '2025-03-15T10:00:00', event_type: 'anesthesia_end', title: 'Anesthesia ended, patient extubated', description: 'Patient extubated in OR. Transferred to PACU.', provider_name: 'Dr. Smith', is_significant: false },
  { id: '7', event_datetime: '2025-03-15T11:30:00', event_type: 'nursing_note', title: 'PACU discharge assessment', description: 'Patient alert and oriented. Vitals stable. Discharged to floor.', provider_name: 'RN Williams', is_significant: false },
]

function getEventColor(eventType: string, isSignificant: boolean): string {
  if (isSignificant) return 'border-red-400 bg-red-50'
  if (['complication', 'code_event', 'death'].includes(eventType)) return 'border-red-400 bg-red-50'
  if (['vital_signs', 'medication'].includes(eventType)) return 'border-amber-400 bg-amber-50'
  return 'border-blue-400 bg-blue-50'
}

function getDotColor(eventType: string, isSignificant: boolean): string {
  if (isSignificant) return 'bg-red-500'
  if (['complication', 'code_event', 'death'].includes(eventType)) return 'bg-red-500'
  if (['vital_signs', 'medication'].includes(eventType)) return 'bg-amber-500'
  return 'bg-blue-500'
}

export default function CaseTimelinePage() {
  const params = useParams()
  const caseId = params.id as string
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)

  const filteredEntries = placeholderEntries.filter((entry) => {
    if (eventTypeFilter !== 'all' && entry.event_type !== eventTypeFilter) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Medical Timeline</h2>
          <p className="text-sm text-muted-foreground">Chronological record of medical events</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {TIMELINE_EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Timeline Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="entry-title">Title</Label>
                  <Input id="entry-title" placeholder="Event title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-date">Date/Time</Label>
                    <Input id="entry-date" type="datetime-local" />
                  </div>
                  <div>
                    <Label htmlFor="entry-type">Event Type</Label>
                    <Select>
                      <SelectTrigger id="entry-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="entry-provider">Provider</Label>
                  <Input id="entry-provider" placeholder="Provider name" />
                </div>
                <div>
                  <Label htmlFor="entry-desc">Description</Label>
                  <Textarea id="entry-desc" placeholder="Describe the event..." rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={() => setAddOpen(false)}>Add Entry</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timeline entries"
          description="Add events to build a chronological timeline for this case."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 mt-5 w-[10px] h-[10px] rounded-full shrink-0 ring-2 ring-background ${getDotColor(entry.event_type, entry.is_significant)}`} style={{ marginLeft: '15px' }} />

                {/* Card */}
                <Card className={`flex-1 ${entry.is_significant ? 'border-red-300' : ''}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatDateTime(entry.event_datetime)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {getLabelForValue(TIMELINE_EVENT_TYPES, entry.event_type)}
                          </Badge>
                          {entry.is_significant && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Critical
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm mt-1">{entry.title}</h4>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        )}
                        {entry.provider_name && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Provider: {entry.provider_name}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
