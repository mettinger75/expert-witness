'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate, formatDuration } from '@/lib/formatters'
import { useDepositions, useCreateDeposition, useDepositionExcerpts } from '@/hooks/useDepositions'
import type { DeponentRole } from '@/types/enums'
import { Plus, Gavel, ChevronDown, ChevronUp, Video, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Deponent role options matching DB constraint
const DEPONENT_ROLES = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defendant', label: 'Defendant' },
  { value: 'treating_physician', label: 'Treating Physician' },
  { value: 'expert_witness', label: 'Expert Witness' },
  { value: 'fact_witness', label: 'Fact Witness' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'first_responder', label: 'First Responder' },
  { value: 'corporate_representative', label: 'Corporate Representative' },
  { value: 'other', label: 'Other' },
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'cancelled': return 'destructive'
    default: return 'outline'
  }
}

function ExcerptsList({ depositionId }: { depositionId: string }) {
  const { data: excerpts = [], isLoading } = useDepositionExcerpts(depositionId)

  if (isLoading) {
    return <LoadingSpinner size="sm" className="py-4" />
  }

  if (excerpts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">No excerpts recorded yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Key Excerpts
      </h4>
      {excerpts.map((excerpt) => (
        <div key={excerpt.id} className="bg-muted/50 rounded-md p-3">
          <span className="text-xs font-mono text-muted-foreground">
            {excerpt.page_line_start}–{excerpt.page_line_end}
          </span>
          {excerpt.category && (
            <Badge variant="outline" className="ml-2 text-[10px] py-0 capitalize">
              {excerpt.category.replace(/_/g, ' ')}
            </Badge>
          )}
          <p className="text-sm mt-1 italic">&ldquo;{excerpt.excerpt_text}&rdquo;</p>
          {excerpt.significance && (
            <p className="text-xs text-muted-foreground mt-1">{excerpt.significance}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CaseDepositionsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Real data
  const { data: depositions = [], isLoading, isError } = useDepositions(caseId)
  const createDeposition = useCreateDeposition()

  // Form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formVideo, setFormVideo] = useState(false)

  function resetForm() {
    setFormName('')
    setFormRole('')
    setFormDate('')
    setFormLocation('')
    setFormNotes('')
    setFormVideo(false)
  }

  function handleAddDeposition() {
    if (!formName.trim() || !formRole || !formDate) {
      toast.error('Please fill in required fields: name, role, and date')
      return
    }
    createDeposition.mutate(
      {
        case_id: caseId,
        deponent_name: formName.trim(),
        deponent_role: formRole as DeponentRole,
        deposition_date: formDate,
        deposition_location: formLocation.trim() || null,
        preparation_notes: formNotes.trim() || null,
        is_video_recorded: formVideo,
        status: 'scheduled',
      },
      {
        onSuccess: () => {
          resetForm()
          setAddOpen(false)
        },
      }
    )
  }

  if (isLoading) {
    return <LoadingSpinner className="py-20" />
  }

  if (isError) {
    return (
      <EmptyState
        icon={Gavel}
        title="Unable to load depositions"
        description="There was an error loading deposition data. Please refresh the page and try again."
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Deposition Preparation</h2>
          <p className="text-sm text-muted-foreground">
            Prepare for your expert deposition — track key testimony, excerpts, and preparation notes.
            Deposition transcripts from other parties are in the Documents tab.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deposition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Deposition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="deponent-name">Deponent Name *</Label>
                <Input
                  id="deponent-name"
                  placeholder="Full name of deponent"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deponent-role">Role *</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger id="deponent-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPONENT_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="depo-date">Date *</Label>
                  <Input
                    id="depo-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="depo-location">Location</Label>
                <Input
                  id="depo-location"
                  placeholder="Deposition location"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="depo-video"
                  checked={formVideo}
                  onChange={(e) => setFormVideo(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="depo-video" className="font-normal">Video recorded</Label>
              </div>
              <div>
                <Label htmlFor="depo-notes">Preparation Notes</Label>
                <Textarea
                  id="depo-notes"
                  placeholder="Preparation notes..."
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { resetForm(); setAddOpen(false) }}>
                  Cancel
                </Button>
                <Button onClick={handleAddDeposition} disabled={createDeposition.isPending}>
                  {createDeposition.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Deposition'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {depositions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No deposition prep started"
          description="Add deposition details to begin preparing — track key testimony, excerpts, and notes for your expert deposition."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deposition
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {depositions.map((depo) => (
            <Card key={depo.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{depo.deponent_name}</h3>
                      <Badge variant="secondary">
                        {DEPONENT_ROLES.find((r) => r.value === depo.deponent_role)?.label ?? depo.deponent_role}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(depo.status)} className="capitalize">
                        {depo.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span>{formatDate(depo.deposition_date)}</span>
                      {depo.duration_hours && <span>{formatDuration(depo.duration_hours)}</span>}
                      {depo.is_video_recorded && (
                        <span className="flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" />
                          Video recorded
                        </span>
                      )}
                      {depo.deposition_location && (
                        <span>{depo.deposition_location}</span>
                      )}
                    </div>
                    {depo.summary && (
                      <p className="text-sm text-muted-foreground mt-2">{depo.summary}</p>
                    )}
                    {depo.ai_summary && !depo.summary && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{depo.ai_summary}</p>
                    )}
                    {depo.key_admissions && depo.key_admissions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {depo.key_admissions.map((item: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0 text-green-700 border-green-200 bg-green-50">
                            {item.length > 50 ? item.substring(0, 50) + '...' : item}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === depo.id ? null : depo.id)}
                  >
                    {expandedId === depo.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="ml-1 text-xs">Excerpts</span>
                  </Button>
                </div>

                {/* Expanded excerpts from real data */}
                {expandedId === depo.id && (
                  <div className="mt-4 pt-4 border-t">
                    <ExcerptsList depositionId={depo.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
