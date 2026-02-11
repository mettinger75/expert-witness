'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileSignature, Loader2, Send, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface CaseContact {
  id: string
  role: string
  is_primary: boolean
  contacts: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone_primary: string | null
    organization_name: string | null
    contact_type: string
  }
}

interface PortalInvite {
  id: string
  contact_id: string
  is_active: boolean
  can_sign_contract: boolean
  contract_id: string | null
  contacts?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface SendForSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractTitle: string
  caseId: string
  caseContacts: CaseContact[]
  portalInvites: PortalInvite[]
  onSent?: () => void
}

export function SendForSignatureDialog({
  open,
  onOpenChange,
  contractId,
  contractTitle,
  caseId,
  caseContacts,
  portalInvites,
  onSent,
}: SendForSignatureDialogProps) {
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [enableOnboarding, setEnableOnboarding] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)

  // Auto-select retaining attorney
  useEffect(() => {
    if (!open) return
    const retaining = caseContacts.find((cc) => cc.role === 'retaining_attorney')
    if (retaining) {
      setSelectedContactId(retaining.contacts.id)
    } else if (caseContacts.length > 0) {
      setSelectedContactId(caseContacts[0].contacts.id)
    }
    setSent(false)
    setMessage('')
  }, [open, caseContacts])

  // Check if contact already has an active portal invite
  const existingInvite = portalInvites.find(
    (inv) => inv.contact_id === selectedContactId && inv.is_active
  )

  const selectedContact = caseContacts.find(
    (cc) => cc.contacts.id === selectedContactId
  )?.contacts

  async function handleSend() {
    if (!selectedContactId) {
      toast.error('Please select a recipient')
      return
    }

    setSending(true)
    try {
      if (existingInvite) {
        // Attach contract to existing portal invite
        const res = await fetch('/api/portal/attach-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portalInviteId: existingInvite.id,
            contractId,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to attach contract')
        }

        toast.success('Contract attached to existing portal invite')
      } else {
        // Create new portal invite with contract
        const res = await fetch('/api/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            contactId: selectedContactId,
            canSignContract: true,
            contractId,
            onboardingMode: enableOnboarding,
            canViewSummary: true,
            canMessage: true,
            canViewReports: true,
            canUploadDocuments: true,
            canViewFeeSchedule: true,
            canViewDepositions: true,
            invitationMessage: message || null,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create portal invite')
        }

        const data = await res.json()

        // Send invitation email
        if (sendEmail && selectedContact?.email) {
          try {
            await fetch('/api/portal/invite-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                portalInviteId: data.invite.id,
                contactEmail: selectedContact.email,
                contactName: `${selectedContact.first_name} ${selectedContact.last_name}`,
                portalUrl: data.portalUrl,
                caseId,
                message: message || undefined,
                contractTitle,
              }),
            })
          } catch {
            toast.error('Portal created but failed to send email')
          }
        }

        toast.success('Contract sent for signature via portal')
      }

      setSent(true)
      onSent?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send contract')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[#C9A84C]" />
            Send for Signature
          </DialogTitle>
          <DialogDescription>
            Send &ldquo;{contractTitle}&rdquo; to an attorney for electronic signature via the case portal.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-emerald-800 mb-1">Sent Successfully!</h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedContact
                ? `${selectedContact.first_name} ${selectedContact.last_name} will receive an email with a link to review and sign the contract.`
                : 'The attorney will receive the contract via their portal.'}
            </p>
            <Button onClick={() => onOpenChange(false)} className="bg-[#0E1F35] hover:bg-[#0E1F35]/90">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {/* Recipient */}
              <div>
                <Label>Recipient</Label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select attorney..." />
                  </SelectTrigger>
                  <SelectContent>
                    {caseContacts.map((cc) => (
                      <SelectItem key={cc.contacts.id} value={cc.contacts.id}>
                        {cc.contacts.first_name} {cc.contacts.last_name}
                        {cc.contacts.organization_name && ` (${cc.contacts.organization_name})`}
                        {cc.role === 'retaining_attorney' && ' — Retaining'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {existingInvite && (
                  <p className="text-xs text-amber-600 mt-1">
                    This contact already has an active portal invite. The contract will be attached to their existing portal.
                  </p>
                )}
              </div>

              {/* Custom message */}
              {!existingInvite && (
                <div>
                  <Label>Custom Message (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a personal message to include in the email..."
                    rows={3}
                  />
                </div>
              )}

              {/* Onboarding toggle */}
              {!existingInvite && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <Label className="text-sm font-medium">Guided Onboarding</Label>
                    <p className="text-xs text-muted-foreground">
                      Walk the attorney through signing, payment, and document upload
                    </p>
                  </div>
                  <Switch checked={enableOnboarding} onCheckedChange={setEnableOnboarding} />
                </div>
              )}

              {/* Send email toggle */}
              {!existingInvite && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <Label className="text-sm font-medium">Send Email Invitation</Label>
                    <p className="text-xs text-muted-foreground">
                      Email the attorney with the portal link
                    </p>
                  </div>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !selectedContactId}
                className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {existingInvite ? 'Attach to Portal' : 'Send for Signature'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
