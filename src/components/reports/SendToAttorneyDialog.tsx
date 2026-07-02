'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Loader2,
  User,
  AlertTriangle,
  Building2,
  Mail,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

// ── Types ──

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  organization_name: string | null
  contact_type: string
}

interface CaseContact {
  id: string
  contact_id: string
  role: string
  is_primary: boolean
  contacts: Contact
}

interface PortalInvite {
  id: string
  contact_id: string
  can_edit_reports: boolean
  can_view_reports: boolean
  is_active: boolean
  expires_at: string
}

/** A case contact merged with its portal invite (if any) */
interface ContactWithPortal {
  caseContactId: string
  contact: Contact
  role: string
  isPrimary: boolean
  portalInvite: PortalInvite | null
  hasActivePortal: boolean
}

interface SendToAttorneyDialogProps {
  reportId: string
  reportName: string
  caseId: string
  html?: string
  onSent?: () => void
  trigger?: React.ReactNode
}

// ── Helpers ──

const ROLE_LABELS: Record<string, string> = {
  retaining_attorney: 'Retaining Attorney',
  opposing_attorney: 'Opposing Attorney',
  co_counsel: 'Co-Counsel',
  paralegal: 'Paralegal',
  defendant_provider: 'Defendant Provider',
  plaintiff_patient: 'Plaintiff / Patient',
  insurance_adjuster: 'Insurance Adjuster',
  other_expert: 'Other Expert',
  court_reporter: 'Court Reporter',
  videographer: 'Videographer',
  other: 'Other',
}

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role.replace(/_/g, ' ')
}

// ── Component ──

export function SendToAttorneyDialog({
  reportId,
  reportName,
  caseId,
  html,
  onSent,
  trigger,
}: SendToAttorneyDialogProps) {
  const [open, setOpen] = useState(false)
  const [caseContacts, setCaseContacts] = useState<CaseContact[]>([])
  const [portalInvites, setPortalInvites] = useState<PortalInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch case contacts + portal invites when dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setSelectedContactId(null)

    authHeaders()
      .then((h) =>
        Promise.all([
          // Fetch case contacts
          fetch(`/api/case-contacts?caseId=${caseId}`, { headers: { ...h } }).then((r) => r.json()),
          // Fetch portal invites
          fetch(`/api/portal?caseId=${caseId}`, { headers: { ...h } }).then((r) => r.json()),
        ])
      )
      .then(([contactsData, invitesData]) => {
        setCaseContacts(contactsData.contacts || [])
        const activeInvites = (invitesData.invites || []).filter(
          (inv: { is_active: boolean; expires_at: string }) =>
            inv.is_active && new Date(inv.expires_at) > new Date()
        )
        setPortalInvites(activeInvites)
      })
      .catch(() => setError('Failed to load case contacts'))
      .finally(() => setLoading(false))
  }, [open, caseId])

  // Merge case contacts with portal invites
  const contactsWithPortal: ContactWithPortal[] = useMemo(() => {
    return caseContacts.map((cc) => {
      const invite = portalInvites.find(
        (inv) => inv.contact_id === cc.contact_id
      )
      return {
        caseContactId: cc.id,
        contact: cc.contacts,
        role: cc.role,
        isPrimary: cc.is_primary,
        portalInvite: invite || null,
        hasActivePortal: !!invite,
      }
    })
  }, [caseContacts, portalInvites])

  // Sort: contacts with portal first, then by primary, then by name
  const sortedContacts = useMemo(() => {
    return [...contactsWithPortal].sort((a, b) => {
      if (a.hasActivePortal && !b.hasActivePortal) return -1
      if (!a.hasActivePortal && b.hasActivePortal) return 1
      if (a.isPrimary && !b.isPrimary) return -1
      if (!a.isPrimary && b.isPrimary) return 1
      const nameA = `${a.contact.last_name} ${a.contact.first_name}`
      const nameB = `${b.contact.last_name} ${b.contact.first_name}`
      return nameA.localeCompare(nameB)
    })
  }, [contactsWithPortal])

  const selectedEntry = useMemo(
    () => sortedContacts.find((c) => c.contact.id === selectedContactId),
    [sortedContacts, selectedContactId]
  )

  async function handleSend() {
    if (!selectedEntry?.portalInvite) {
      setError('Please select a contact with an active portal')
      return
    }

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/send-to-attorney`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          portalInviteId: selectedEntry.portalInvite.id,
          notes: notes || null,
          html: html || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send report')
        return
      }

      const contactName = `${selectedEntry.contact.first_name} ${selectedEntry.contact.last_name}`
      toast.success(`${reportName} sent to ${contactName}`)
      setOpen(false)
      setNotes('')
      setSelectedContactId(null)
      onSent?.()
    } catch {
      setError('Failed to send report. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-1" />
            Submit for Redlines
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Report for Review</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          {/* Report info */}
          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-sm font-medium text-[#0E1F35]">{reportName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a contact to send this report to for review and editing.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* No contacts */}
          {!loading && sortedContacts.length === 0 && (
            <div className="text-center py-4">
              <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No contacts associated with this case.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add contacts to the case first from the Contacts tab.
              </p>
            </div>
          )}

          {/* Contact list */}
          {!loading && sortedContacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Contacts
              </label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sortedContacts.map((entry) => {
                  const { contact, role, isPrimary, hasActivePortal, portalInvite } = entry
                  const isSelected = selectedContactId === contact.id
                  const canSelect = hasActivePortal

                  return (
                    <button
                      key={contact.id}
                      onClick={() => canSelect && setSelectedContactId(contact.id)}
                      disabled={!canSelect}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-[#DFC06A] bg-[#DFC06A]/5 ring-1 ring-[#DFC06A]/30'
                          : canSelect
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-[#0E1F35]">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {isPrimary && (
                              <Badge className="bg-[#0E1F35]/10 text-[#0E1F35] text-[10px] px-1.5 py-0">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-[#DFC06A] font-medium">
                              {getRoleLabel(role)}
                            </span>
                            {contact.organization_name && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Building2 className="h-3 w-3" />
                                {contact.organization_name}
                              </span>
                            )}
                          </div>
                          {contact.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {hasActivePortal ? (
                            <>
                              <Badge className="bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">
                                <ShieldCheck className="h-3 w-3 mr-0.5" />
                                Portal Active
                              </Badge>
                              {portalInvite?.can_edit_reports && (
                                <Badge className="bg-blue-50 text-blue-700 text-[10px] border border-blue-200">
                                  Can Edit
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-400 text-[10px] border border-gray-200">
                              <ShieldOff className="h-3 w-3 mr-0.5" />
                              No Portal
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!hasActivePortal && (
                        <p className="text-[10px] text-gray-400 mt-1.5 italic">
                          Create a portal invite for this contact to send them reports.
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {!loading && sortedContacts.length > 0 && selectedContactId && (
            <div>
              <label
                htmlFor="send-notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (optional)
              </label>
              <textarea
                id="send-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for the recipient about this report..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#DFC06A] focus:ring-2 focus:ring-[#DFC06A]/20 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Actions */}
          {!loading && sortedContacts.length > 0 && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !selectedEntry?.hasActivePortal}
                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90 text-white"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send for Review
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
