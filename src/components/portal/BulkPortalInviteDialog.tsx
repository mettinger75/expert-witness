'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import type { CaseContactWithContact } from '@/services/caseContacts.service'
import { CASE_CONTACT_ROLES, getLabelForValue } from '@/lib/constants'
import { Users, Mail, Check, Loader2, Link2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

interface BulkPortalInviteDialogProps {
  caseId: string
  caseName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExistingInvite {
  id: string
  contact_id: string
  is_active: boolean
  expires_at: string
}

export function BulkPortalInviteDialog({ caseId, caseName, open, onOpenChange }: BulkPortalInviteDialogProps) {
  const { data: caseContacts = [], isLoading: contactsLoading } = useCaseContacts(caseId)
  const [existingInvites, setExistingInvites] = useState<ExistingInvite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [done, setDone] = useState(false)

  // Fetch existing invites when dialog opens
  useEffect(() => {
    if (open && caseId) {
      setInvitesLoading(true)
      setDone(false)
      setSentCount(0)
      setSelectedIds(new Set())
      authHeaders()
        .then(h => fetch(`/api/portal?caseId=${caseId}`, { headers: { ...h } }))
        .then(r => r.json())
        .then(data => setExistingInvites(Array.isArray(data) ? data : []))
        .catch(() => setExistingInvites([]))
        .finally(() => setInvitesLoading(false))
    }
  }, [open, caseId])

  const activeInviteContactIds = new Set(
    existingInvites
      .filter(i => i.is_active && new Date(i.expires_at) > new Date())
      .map(i => i.contact_id)
  )

  // Filter to contacts that have emails and aren't already invited
  const eligibleContacts = (caseContacts as CaseContactWithContact[])
    .map((cc) => {
      const contact = cc.contacts
      if (!contact) return null
      return {
        contactId: cc.contact_id,
        name: `${contact.first_name} ${contact.last_name}`.trim(),
        email: contact.email,
        organization: contact.organization_name,
        role: cc.role,
        hasInvite: activeInviteContactIds.has(cc.contact_id),
        hasEmail: !!contact.email,
      }
    })
    .filter(Boolean) as Array<{
      contactId: string; name: string; email: string; organization: string | null;
      role: string; hasInvite: boolean; hasEmail: boolean
    }>

  function toggleContact(contactId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  function selectAllEligible() {
    const eligible = eligibleContacts.filter(c => c.hasEmail && !c.hasInvite).map(c => c.contactId)
    setSelectedIds(new Set(eligible))
  }

  async function handleSend() {
    if (selectedIds.size === 0) return
    setSending(true)
    let count = 0

    for (const contactId of selectedIds) {
      const contact = eligibleContacts.find(c => c.contactId === contactId)
      if (!contact || !contact.hasEmail) continue

      try {
        // Create portal invite
        const inviteRes = await fetch('/api/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            caseId,
            contactId,
            permissions: {
              canViewSummary: true,
              canViewTimeline: true,
              canMessage: true,
              canViewReports: true,
              canUploadDocuments: true,
              canViewFeeSchedule: true,
              canViewBilling: true,
              canBookScheduling: true,
            },
            onboardingMode: true,
            expiresInDays: 90,
          }),
        })

        if (!inviteRes.ok) continue
        const { portalUrl } = await inviteRes.json()

        // Send email
        await fetch('/api/portal/invite-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            recipientEmail: contact.email,
            recipientName: contact.name,
            portalUrl,
            caseName,
            isInquiry: false,
          }),
        })

        count++
      } catch {
        // Continue with next contact
      }
    }

    setSentCount(count)
    setDone(true)
    setSending(false)
    if (count > 0) toast.success(`${count} portal invite${count > 1 ? 's' : ''} sent`)
  }

  const isLoading = contactsLoading || invitesLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
            Send Portal Invites
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{caseName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : done ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="font-semibold text-lg" style={{ color: '#0E1F35' }}>
              {sentCount} Invite{sentCount !== 1 ? 's' : ''} Sent
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Portal invitations have been emailed to the selected contacts.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : eligibleContacts.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No contacts linked to this case yet. Add contacts from the case detail page first.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {eligibleContacts.map((c) => {
                const isSelected = selectedIds.has(c.contactId)
                const disabled = !c.hasEmail || c.hasInvite

                return (
                  <div
                    key={c.contactId}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'
                    } ${isSelected ? 'bg-[#DFC06A]/10 border border-[#DFC06A]/30' : ''}`}
                    onClick={() => !disabled && toggleContact(c.contactId)}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      c.hasInvite ? 'bg-emerald-500 border-emerald-500' :
                      isSelected ? 'bg-[#DFC06A] border-[#DFC06A]' : 'border-gray-300'
                    }`}>
                      {(isSelected || c.hasInvite) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: '#0E1F35' }}>{c.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {getLabelForValue(CASE_CONTACT_ROLES, c.role)}
                        </Badge>
                      </div>
                      {c.email ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />{c.email}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 mt-0.5">No email address</p>
                      )}
                      {c.organization && (
                        <p className="text-xs text-muted-foreground">{c.organization}</p>
                      )}
                    </div>
                    {c.hasInvite && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                        Invited
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="ghost" size="sm" onClick={selectAllEligible} className="text-xs">
                Select All
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                  onClick={handleSend}
                  disabled={selectedIds.size === 0 || sending}
                  style={{ backgroundColor: '#0E1F35' }}
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Link2 className="h-4 w-4 mr-2" />Send {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
