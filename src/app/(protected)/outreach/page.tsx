'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Target, Mail, Send, Check, X,
  ExternalLink, Star, Pencil, Trash2, Loader2, RefreshCw,
} from 'lucide-react'
import type { LeadRow, LeadStatus, LeadSide, LeadPriority } from '@/types/database.types'

const STATUS_TABS: { label: string; value: LeadStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Approved', value: 'approved' },
  { label: 'Sent', value: 'sent' },
  { label: 'Dismissed', value: 'dismissed' },
]

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
  dismissed: 'bg-gray-100 text-gray-500 border-gray-200',
}

const EMPTY_FORM: Omit<LeadRow, 'id' | 'contact_id' | 'sent_at' | 'created_at' | 'updated_at' | 'status'> = {
  first_name: null,
  last_name: null,
  firm_name: null,
  location: null,
  email: null,
  phone: null,
  website: null,
  side: 'unknown',
  priority: 'normal',
  context: null,
  source_url: null,
  notes: null,
}

function displayName(lead: LeadRow) {
  if (lead.first_name || lead.last_name) {
    return [lead.first_name, lead.last_name].filter(Boolean).join(' ')
  }
  return lead.firm_name || 'Unknown'
}

export default function OutreachPage() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<LeadStatus | 'all'>('new')
  const [search, setSearch] = useState('')
  const [sideFilter, setSideFilter] = useState<string>('all')
  const [editLead, setEditLead] = useState<LeadRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newLead, setNewLead] = useState({ ...EMPTY_FORM })
  const [sending, setSending] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewLead, setPreviewLead] = useState<LeadRow | null>(null)

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusTab !== 'all') params.set('status', statusTab)
      if (search) params.set('search', search)
      if (sideFilter !== 'all') params.set('side', sideFilter)
      const res = await fetch(`/api/outreach/leads?${params}`)
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load leads')
    } finally {
      setIsLoading(false)
    }
  }, [statusTab, sideFilter, search])

  useEffect(() => {
    const timer = setTimeout(fetchLeads, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchLeads, search])

  async function updateStatus(id: string, status: LeadStatus) {
    const res = await fetch(`/api/outreach/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('Failed to update lead'); return }
    fetchLeads()
  }

  function openSendPreview(lead: LeadRow) {
    if (!lead.email) {
      toast.error('Add an email address before sending outreach.')
      setEditLead(lead)
      return
    }
    setPreviewLead(lead)
  }

  async function confirmSendOutreach(lead: LeadRow, subject: string, message: string) {
    setSending(lead.id)
    try {
      const res = await fetch('/api/emails/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: lead.first_name || lead.firm_name || 'Attorney',
          lastName: lead.last_name || '',
          email: lead.email,
          subject: subject || undefined,
          message: message || undefined,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      await fetch(`/api/outreach/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
      })
      toast.success(`Outreach sent to ${lead.email}`)
      setPreviewLead(null)
      fetchLeads()
    } catch {
      toast.error('Failed to send outreach email')
    } finally {
      setSending(null)
    }
  }

  async function deleteLead(id: string) {
    const res = await fetch(`/api/outreach/leads/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete lead'); return }
    toast.success('Lead removed')
    fetchLeads()
  }

  async function saveLead() {
    if (!editLead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/outreach/leads/${editLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLead),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Lead updated')
      setEditLead(null)
      fetchLeads()
    } catch {
      toast.error('Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  async function createLead() {
    setSaving(true)
    try {
      const res = await fetch('/api/outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      })
      if (!res.ok) throw new Error('Create failed')
      toast.success('Lead added')
      setAddOpen(false)
      setNewLead({ ...EMPTY_FORM })
      fetchLeads()
    } catch {
      toast.error('Failed to add lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Review attorney leads and send introduction emails"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#D8DCE3]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              statusTab === tab.value
                ? 'border-[#DFC06A] text-[#0E1F35]'
                : 'border-transparent text-muted-foreground hover:text-[#0E1F35]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, firm, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sideFilter} onValueChange={setSideFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="plaintiff">Plaintiff</SelectItem>
            <SelectItem value="defense">Defense</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : !leads.length ? (
        <EmptyState
          icon={Target}
          title="No leads found"
          description={
            statusTab === 'new'
              ? 'No new leads yet. The daily lead gen task will populate these automatically.'
              : 'No leads match your current filters.'
          }
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead Manually
            </Button>
          }
        />
      ) : (
        <div className="bg-white border border-[#D8DCE3] rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#091525] hover:bg-[#091525]">
                <TableHead className="text-white/80 font-semibold">Name / Firm</TableHead>
                <TableHead className="text-white/80 font-semibold">Location</TableHead>
                <TableHead className="text-white/80 font-semibold">Side</TableHead>
                <TableHead className="text-white/80 font-semibold">Contact</TableHead>
                <TableHead className="text-white/80 font-semibold">Context</TableHead>
                <TableHead className="text-white/80 font-semibold">Status</TableHead>
                <TableHead className="text-white/80 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-[#DFC06A]/5">
                  <TableCell>
                    <div className="flex items-start gap-1.5">
                      {lead.priority === 'high' && (
                        <Star className="h-3.5 w-3.5 mt-0.5 fill-[#DFC06A] text-[#DFC06A] shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-[#0E1F35]">{displayName(lead)}</p>
                        {lead.firm_name && (lead.first_name || lead.last_name) && (
                          <p className="text-xs text-muted-foreground">{lead.firm_name}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {lead.location || '—'}
                  </TableCell>

                  <TableCell>
                    {lead.side === 'plaintiff' && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs border">Plaintiff</Badge>
                    )}
                    {lead.side === 'defense' && (
                      <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs border">Defense</Badge>
                    )}
                    {lead.side === 'unknown' && (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[180px]">{lead.email}</span>
                      </a>
                    ) : lead.phone ? (
                      <span className="text-sm text-muted-foreground">{lead.phone}</span>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground hover:text-[#0E1F35] underline-offset-2 hover:underline"
                        onClick={() => setEditLead(lead)}
                      >
                        Add email
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="max-w-[220px]">
                    <p className="text-sm text-muted-foreground truncate">{lead.context || '—'}</p>
                  </TableCell>

                  <TableCell>
                    <Badge className={cn('text-xs border', STATUS_STYLES[lead.status])}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Edit */}
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setEditLead(lead)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Approve (new → approved) */}
                      {lead.status === 'new' && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => updateStatus(lead.id, 'approved')}
                          title="Approve"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Send outreach */}
                      {(lead.status === 'new' || lead.status === 'approved') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => openSendPreview(lead)}
                          disabled={sending === lead.id}
                          title={lead.email ? 'Preview & send outreach email' : 'Add email first'}
                          className={cn(
                            'hover:bg-green-50',
                            lead.email ? 'text-green-600 hover:text-green-700' : 'text-gray-300'
                          )}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Dismiss */}
                      {(lead.status === 'new' || lead.status === 'approved') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => updateStatus(lead.id, 'dismissed')}
                          title="Dismiss"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Website link */}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" title="Visit website">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}

                      {/* Delete (dismissed leads) */}
                      {lead.status === 'dismissed' && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => deleteLead(lead.id)}
                          title="Delete"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Lead Dialog */}
      {editLead && (
        <LeadDialog
          lead={editLead}
          onChange={setEditLead}
          onSave={saveLead}
          onClose={() => setEditLead(null)}
          saving={saving}
          title="Edit Lead"
        />
      )}

      {/* Add Lead Dialog */}
      {addOpen && (
        <LeadDialog
          lead={{ ...EMPTY_FORM, id: '', status: 'new', contact_id: null, sent_at: null, created_at: '', updated_at: '' }}
          onChange={(v) => setNewLead(v)}
          onSave={createLead}
          onClose={() => { setAddOpen(false); setNewLead({ ...EMPTY_FORM }) }}
          saving={saving}
          title="Add Lead"
        />
      )}

      {/* Outreach Preview & Send Dialog */}
      {previewLead && (
        <OutreachPreviewDialog
          lead={previewLead}
          sending={sending === previewLead.id}
          onSend={(subject, message) => confirmSendOutreach(previewLead, subject, message)}
          onClose={() => setPreviewLead(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Outreach preview & send dialog
// ---------------------------------------------------------------------------

interface OutreachPreviewDialogProps {
  lead: LeadRow
  sending: boolean
  onSend: (subject: string, message: string) => void
  onClose: () => void
}

function OutreachPreviewDialog({ lead, sending, onSend, onClose }: OutreachPreviewDialogProps) {
  const defaultSubject = 'Expert Witness Services — Anesthesiology'
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const recipientName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.firm_name || 'Attorney'

  const fetchPreview = useCallback(async () => {
    setLoadingPreview(true)
    try {
      const params = new URLSearchParams({
        firstName: lead.first_name || lead.firm_name || 'Attorney',
        lastName: lead.last_name || '',
        subject,
        ...(message ? { message } : {}),
      })
      const res = await fetch(`/api/emails/outreach?${params}`)
      const data = await res.json()
      setPreviewHtml(data.html)
    } catch {
      toast.error('Failed to load preview')
    } finally {
      setLoadingPreview(false)
    }
  }, [lead, subject, message])

  useEffect(() => {
    fetchPreview()
  }, []) // only on mount; refresh is manual

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#D8DCE3] shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Preview Outreach Email
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pt-4 pb-4 shrink-0">
          {/* Recipient row */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-16 shrink-0">To:</span>
            <span className="font-medium text-[#0E1F35]">{recipientName}</span>
            <span className="text-muted-foreground">&lt;{lead.email}&gt;</span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2">
            <Label className="w-16 shrink-0 text-muted-foreground text-sm font-normal">Subject:</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Personal note */}
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Personal note <span className="font-normal">(optional — added after the second paragraph)</span></Label>
            <Textarea
              rows={2}
              placeholder="e.g. I noticed your firm recently won the Smith v. Mercy case..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Refresh preview button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchPreview} disabled={loadingPreview}>
              {loadingPreview ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Refresh Preview
            </Button>
          </div>
        </div>

        {/* Email preview iframe */}
        <div className="flex-1 overflow-hidden border-t border-[#D8DCE3] min-h-[320px]">
          {loadingPreview && !previewHtml ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#D8DCE3] shrink-0">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={() => onSend(subject, message)}
            disabled={sending}
            className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Send Email</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Lead edit / create dialog
// ---------------------------------------------------------------------------

interface LeadDialogProps {
  lead: LeadRow
  onChange: (lead: LeadRow) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  title: string
}

function LeadDialog({ lead, onChange, onSave, onClose, saving, title }: LeadDialogProps) {
  function set(field: keyof LeadRow, value: string) {
    onChange({ ...lead, [field]: value || null })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input
              value={lead.first_name || ''}
              onChange={(e) => set('first_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input
              value={lead.last_name || ''}
              onChange={(e) => set('last_name', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Firm / Organization</Label>
            <Input
              value={lead.firm_name || ''}
              onChange={(e) => set('firm_name', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Location</Label>
            <Input
              placeholder="e.g. Chicago, IL"
              value={lead.location || ''}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={lead.email || ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              value={lead.phone || ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Website</Label>
            <Input
              placeholder="https://..."
              value={lead.website || ''}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Side</Label>
            <Select value={lead.side} onValueChange={(v) => onChange({ ...lead, side: v as LeadSide })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plaintiff">Plaintiff</SelectItem>
                <SelectItem value="defense">Defense</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select value={lead.priority} onValueChange={(v) => onChange({ ...lead, priority: v as LeadPriority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Context</Label>
            <Textarea
              rows={3}
              placeholder="Why is this a lead? Recent case, verdict, etc."
              value={lead.context || ''}
              onChange={(e) => set('context', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={lead.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Source URL</Label>
            <Input
              placeholder="https://..."
              value={lead.source_url || ''}
              onChange={(e) => set('source_url', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
