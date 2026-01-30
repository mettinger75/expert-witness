'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatDuration } from '@/lib/formatters'
import { Plus, Gavel, ChevronDown, ChevronUp, Video, FileText } from 'lucide-react'

// Deponent role options matching enum
const DEPONENT_ROLES = [
  { value: 'plaintiff', label: 'Plaintiff' },
  { value: 'defendant', label: 'Defendant' },
  { value: 'defendant_physician', label: 'Defendant Physician' },
  { value: 'treating_physician', label: 'Treating Physician' },
  { value: 'expert_witness', label: 'Expert Witness' },
  { value: 'fact_witness', label: 'Fact Witness' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'other', label: 'Other' },
]

// Placeholder depositions
const placeholderDepositions = [
  {
    id: '1',
    deponent_name: 'Dr. Robert Smith',
    deponent_role: 'defendant_physician',
    deposition_date: '2025-09-15',
    status: 'completed',
    duration_hours: 4.5,
    is_video_recorded: true,
    summary: 'Defendant physician deposed regarding standard of care during anesthesia administration. Key topics included monitoring protocols and response to hypotension.',
    excerpts: [
      { id: 'e1', page_line: 'p. 45:12-18', text: 'I reviewed the vital signs approximately every five minutes during the procedure.' },
      { id: 'e2', page_line: 'p. 78:3-9', text: 'The drop in blood pressure was not immediately apparent to me from the monitoring equipment.' },
    ],
  },
  {
    id: '2',
    deponent_name: 'Nancy Williams, RN',
    deponent_role: 'nurse',
    deposition_date: '2025-10-01',
    status: 'scheduled',
    duration_hours: null,
    is_video_recorded: false,
    summary: null,
    excerpts: [],
  },
  {
    id: '3',
    deponent_name: 'Dr. Sarah Johnson',
    deponent_role: 'expert_witness',
    deposition_date: '2025-11-15',
    status: 'scheduled',
    duration_hours: null,
    is_video_recorded: true,
    summary: null,
    excerpts: [],
  },
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'cancelled': return 'destructive'
    default: return 'outline'
  }
}

export default function CaseDepositionsPage() {
  const params = useParams()
  const caseId = params.id as string
  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Depositions</h2>
          <p className="text-sm text-muted-foreground">Manage depositions and testimony excerpts</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                <Label htmlFor="deponent-name">Deponent Name</Label>
                <Input id="deponent-name" placeholder="Full name of deponent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deponent-role">Role</Label>
                  <Select>
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
                  <Label htmlFor="depo-date">Date</Label>
                  <Input id="depo-date" type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="depo-location">Location</Label>
                <Input id="depo-location" placeholder="Deposition location" />
              </div>
              <div>
                <Label htmlFor="depo-notes">Preparation Notes</Label>
                <Textarea id="depo-notes" placeholder="Preparation notes..." rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={() => setAddOpen(false)}>Add Deposition</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {placeholderDepositions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No depositions"
          description="Add depositions to track testimony and key excerpts."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deposition
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {placeholderDepositions.map((depo) => (
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
                    </div>
                    {depo.summary && (
                      <p className="text-sm text-muted-foreground mt-2">{depo.summary}</p>
                    )}
                  </div>
                  {depo.excerpts.length > 0 && (
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
                      <span className="ml-1 text-xs">{depo.excerpts.length} excerpts</span>
                    </Button>
                  )}
                </div>

                {/* Expanded excerpts */}
                {expandedId === depo.id && depo.excerpts.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Key Excerpts
                    </h4>
                    {depo.excerpts.map((excerpt) => (
                      <div key={excerpt.id} className="bg-muted/50 rounded-md p-3">
                        <span className="text-xs font-mono text-muted-foreground">{excerpt.page_line}</span>
                        <p className="text-sm mt-1 italic">&ldquo;{excerpt.text}&rdquo;</p>
                      </div>
                    ))}
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
