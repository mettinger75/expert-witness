'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TIMELINE_EVENT_TYPES, getLabelForValue } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatters'
import { useTimeline, useCreateTimelineEntry } from '@/hooks/useTimeline'
import { useDocuments } from '@/hooks/useDocuments'
import type { TimelineEventType } from '@/types/enums'
import { Plus, Clock, Filter, AlertCircle, FileText, Loader2, Sparkles, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'

function getDotColor(eventType: string, isSignificant: boolean): string {
  if (isSignificant) return 'bg-red-500'
  if (['complication', 'code_event', 'death'].includes(eventType)) return 'bg-red-500'
  if (['vital_signs', 'medication_given'].includes(eventType)) return 'bg-amber-500'
  return 'bg-primary'
}

export default function CaseTimelinePage() {
  const params = useParams()
  const caseId = params.id as string
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDatetime, setFormDatetime] = useState('')
  const [formEventType, setFormEventType] = useState<string>('other')
  const [formProvider, setFormProvider] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSignificant, setFormSignificant] = useState(false)
  const [formFacility, setFormFacility] = useState('')

  // AI generation state
  const [generating, setGenerating] = useState(false)
  const [selectRecordsOpen, setSelectRecordsOpen] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])

  // Real data
  const filters = eventTypeFilter !== 'all' ? { event_type: eventTypeFilter } : undefined
  const { data: entries = [], isLoading } = useTimeline(caseId, filters)
  const createMutation = useCreateTimelineEntry()

  // Fetch case documents for record selection
  const { data: caseDocuments = [] } = useDocuments(caseId)

  function resetForm() {
    setFormTitle('')
    setFormDatetime('')
    setFormEventType('other')
    setFormProvider('')
    setFormDescription('')
    setFormSignificant(false)
    setFormFacility('')
  }

  async function handleAddEntry() {
    if (!formTitle || !formDatetime || !formEventType) {
      toast.error('Title, date/time, and event type are required')
      return
    }

    await createMutation.mutateAsync({
      case_id: caseId,
      title: formTitle,
      event_datetime: new Date(formDatetime).toISOString(),
      event_type: formEventType as TimelineEventType,
      provider_name: formProvider || null,
      description: formDescription || null,
      is_significant: formSignificant,
      facility: formFacility || null,
    })

    resetForm()
    setAddOpen(false)
  }

  function handleOpenRecordSelector() {
    setSelectedDocIds([])
    setSelectRecordsOpen(true)
  }

  function toggleDocSelection(docId: string) {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  function toggleSelectAll() {
    const medicalDocs = caseDocuments.filter(
      (d) => d.ocr_text || d.ai_summary || d.description
    )
    if (selectedDocIds.length === medicalDocs.length) {
      setSelectedDocIds([])
    } else {
      setSelectedDocIds(medicalDocs.map((d) => d.id))
    }
  }

  async function handleGenerateFromRecords() {
    if (selectedDocIds.length === 0) {
      toast.error('Select at least one record to generate from')
      return
    }
    setSelectRecordsOpen(false)
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, documentIds: selectedDocIds }),
      })
      if (!res.ok) {
        let errorMsg = `Failed to generate timeline (${res.status})`
        try { const err = await res.json(); errorMsg = err.error || errorMsg } catch { /* non-JSON error */ }
        throw new Error(errorMsg)
      }
      const result = await res.json()
      toast.success(`Generated ${result.count} timeline entries from ${selectedDocIds.length} record(s)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Medical Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Chronological record of medical events
            {!isLoading && ` (${entries.length} entries)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleOpenRecordSelector}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate from Records
          </Button>

          {/* Record Selection Dialog */}
          <Dialog open={selectRecordsOpen} onOpenChange={setSelectRecordsOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Select Records for Timeline Generation</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Choose which medical records to extract timeline events from. Only records with extractable text are shown.
                </p>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                {(() => {
                  const availableDocs = caseDocuments.filter(
                    (d) => d.ocr_text || d.ai_summary || d.description
                  )
                  if (availableDocs.length === 0) {
                    return (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No records with extractable text found. Upload and process medical records first.
                      </div>
                    )
                  }
                  return (
                    <>
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          id="select-all"
                          checked={selectedDocIds.length === availableDocs.length && availableDocs.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                        <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          Select All ({availableDocs.length} records)
                        </Label>
                      </div>
                      {availableDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedDocIds.includes(doc.id)
                              ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => toggleDocSelection(doc.id)}
                        >
                          <Checkbox
                            checked={selectedDocIds.includes(doc.id)}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">{doc.file_name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {doc.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {doc.category.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {doc.ocr_status === 'completed' && (
                                <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                  OCR Complete
                                </Badge>
                              )}
                              {doc.ai_summary && (
                                <Badge variant="outline" className="text-xs text-blue-700 border-blue-200">
                                  AI Analyzed
                                </Badge>
                              )}
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectRecordsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateFromRecords}
                  disabled={selectedDocIds.length === 0}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate from {selectedDocIds.length} Record{selectedDocIds.length !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <Dialog open={addOpen} onOpenChange={(open) => {
            setAddOpen(open)
            if (!open) resetForm()
          }}>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entry-title">Title *</Label>
                  <Input
                    id="entry-title"
                    placeholder="Event title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry-date">Date/Time *</Label>
                    <Input
                      id="entry-date"
                      type="datetime-local"
                      value={formDatetime}
                      onChange={(e) => setFormDatetime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry-type">Event Type *</Label>
                    <Select value={formEventType} onValueChange={setFormEventType}>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry-provider">Provider</Label>
                    <Input
                      id="entry-provider"
                      placeholder="Provider name"
                      value={formProvider}
                      onChange={(e) => setFormProvider(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry-facility">Facility</Label>
                    <Input
                      id="entry-facility"
                      placeholder="Facility name"
                      value={formFacility}
                      onChange={(e) => setFormFacility(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-desc">Description</Label>
                  <Textarea
                    id="entry-desc"
                    placeholder="Describe the event..."
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="entry-significant"
                    checked={formSignificant}
                    onCheckedChange={setFormSignificant}
                  />
                  <Label htmlFor="entry-significant">Mark as significant/critical event</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setAddOpen(false) }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEntry}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timeline entries"
          description="Add events manually or generate a timeline from uploaded medical records."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenRecordSelector} disabled={generating}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate from Records
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 mt-5 w-[10px] h-[10px] rounded-full shrink-0 ring-2 ring-background ${getDotColor(entry.event_type, entry.is_significant)}`}
                  style={{ marginLeft: '15px' }}
                />

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
                          {entry.ai_generated && (
                            <Badge variant="outline" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm mt-1">{entry.title}</h4>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {entry.provider_name && (
                            <p className="text-xs text-muted-foreground">
                              Provider: {entry.provider_name}
                            </p>
                          )}
                          {entry.facility && (
                            <p className="text-xs text-muted-foreground">
                              Facility: {entry.facility}
                            </p>
                          )}
                        </div>
                      </div>
                      {entry.document_id && (
                        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
