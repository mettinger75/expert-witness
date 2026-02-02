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
import { useCommunicationLogs, useCreateCommunicationLog } from '@/hooks/useCommunicationLogs'
import { formatDateTime } from '@/lib/formatters'
import type { CommunicationType } from '@/types/enums'
import {
  Mail, Phone, Video, MessageSquare, Plus, ArrowUpRight,
  ArrowDownLeft, Minus, Loader2, Clock,
} from 'lucide-react'
import { toast } from 'sonner'

const COMM_TYPES = [
  { value: 'email_inbound', label: 'Email (Inbound)' },
  { value: 'email_outbound', label: 'Email (Outbound)' },
  { value: 'phone_inbound', label: 'Phone (Inbound)' },
  { value: 'phone_outbound', label: 'Phone (Outbound)' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'letter', label: 'Letter' },
  { value: 'fax', label: 'Fax' },
  { value: 'text', label: 'Text Message' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'other', label: 'Other' },
]

function getCommIcon(type: string) {
  if (type.includes('email')) return Mail
  if (type.includes('phone') || type === 'voicemail') return Phone
  if (type === 'video_call') return Video
  if (type === 'text') return MessageSquare
  return Mail
}

function getDirectionIcon(direction: string) {
  if (direction === 'inbound') return ArrowDownLeft
  if (direction === 'outbound') return ArrowUpRight
  return Minus
}

function getDirectionFromType(type: string): string {
  if (type.includes('inbound')) return 'inbound'
  if (type.includes('outbound')) return 'outbound'
  return 'outbound'
}

export default function CaseEmailsPage() {
  const params = useParams()
  const caseId = params.id as string
  const { data: logs = [], isLoading } = useCommunicationLogs(caseId)
  const createLog = useCreateCommunicationLog()
  const [addOpen, setAddOpen] = useState(false)

  // Form state
  const [formType, setFormType] = useState<string>('email_outbound')
  const [formSubject, setFormSubject] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formDetails, setFormDetails] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16))

  function resetForm() {
    setFormType('email_outbound')
    setFormSubject('')
    setFormSummary('')
    setFormDetails('')
    setFormDate(new Date().toISOString().slice(0, 16))
  }

  async function handleAdd() {
    if (!formSummary) {
      toast.error('Summary is required')
      return
    }

    await createLog.mutateAsync({
      case_id: caseId,
      communication_type: formType as CommunicationType,
      direction: getDirectionFromType(formType),
      subject: formSubject || null,
      summary: formSummary,
      details: formDetails || null,
      communication_date: new Date(formDate).toISOString(),
    })

    resetForm()
    setAddOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Communications</h2>
          <p className="text-sm text-muted-foreground">
            Email and communication log for this case
            {!isLoading && ` (${logs.length} entries)`}
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetForm()
        }}>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date/Time</Label>
                  <Input
                    type="datetime-local"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Communication subject..."
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Summary *</Label>
                <Textarea
                  placeholder="Brief summary of the communication..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  placeholder="Detailed notes..."
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setAddOpen(false) }}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={createLog.isPending}>
                {createLog.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Log Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No communications logged"
          description="Log emails, phone calls, and other communications for this case."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          }
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {logs.map((log) => {
              const CommIcon = getCommIcon(log.communication_type)
              const DirIcon = getDirectionIcon(log.direction)

              return (
                <div key={log.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-4 w-[10px] h-[10px] rounded-full shrink-0 ring-2 ring-background bg-primary" style={{ marginLeft: '15px' }} />

                  <Card className="flex-1">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-muted mt-0.5">
                          <CommIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatDateTime(log.communication_date)}
                            </span>
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <DirIcon className="h-3 w-3" />
                              {COMM_TYPES.find((t) => t.value === log.communication_type)?.label || log.communication_type}
                            </Badge>
                            {log.follow_up_needed && (
                              <Badge variant="outline" className="text-xs text-amber-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Follow-up
                              </Badge>
                            )}
                          </div>
                          {log.subject && (
                            <h4 className="font-medium text-sm mt-1">{log.subject}</h4>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{log.summary}</p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap border-t pt-2">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
