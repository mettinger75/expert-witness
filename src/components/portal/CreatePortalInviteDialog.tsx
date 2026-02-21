'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Copy, Check, Link2, Loader2, Mail, Send, FileSignature } from 'lucide-react'

interface CreatePortalInviteDialogProps {
  caseId: string
  contactId?: string
  contactName?: string
  contactEmail?: string
  contactOrganization?: string
  caseName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePortalInviteDialog({ caseId, contactId, contactName, contactEmail, contactOrganization, caseName, open, onOpenChange }: CreatePortalInviteDialogProps) {
  const [creating, setCreating] = useState(false)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Permissions
  const [canViewSummary, setCanViewSummary] = useState(true)
  const [canViewTimeline, setCanViewTimeline] = useState(false)
  const [canMessage, setCanMessage] = useState(true)
  const [canViewReports, setCanViewReports] = useState(true)
  const [canEditReports, setCanEditReports] = useState(false)
  const [canUploadDocuments, setCanUploadDocuments] = useState(true)
  const [canViewFeeSchedule, setCanViewFeeSchedule] = useState(true)
  const [canViewDepositions, setCanViewDepositions] = useState(true)
  const [canViewBilling, setCanViewBilling] = useState(true)
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [invitationMessage, setInvitationMessage] = useState('')

  // Contract / Onboarding
  const [attachContract, setAttachContract] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('500')
  const [depositionRate, setDepositionRate] = useState('750')
  const [trialRate, setTrialRate] = useState('750')
  const [retainerAmount, setRetainerAmount] = useState('5000')

  async function handleCreate() {
    if (!contactId) {
      toast.error('No contact selected')
      return
    }
    setCreating(true)
    try {
      let contractId: string | null = null

      // Step 1: Create contract if attaching retention agreement
      if (attachContract) {
        const contractRes = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            contactId,
            firmName: contactOrganization || null,
            firmContactName: contactName || null,
            firmEmail: contactEmail || null,
            hourlyRate: parseFloat(hourlyRate) || 500,
            depositionRate: parseFloat(depositionRate) || 750,
            trialRate: parseFloat(trialRate) || 750,
            retainerAmount: parseFloat(retainerAmount) || 5000,
          }),
        })
        if (!contractRes.ok) throw new Error('Failed to create contract')
        const contractData = await contractRes.json()
        contractId = contractData.contract.id

        // Step 2: Generate HTML for the contract
        const pdfRes = await fetch('/api/contracts/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId }),
        })
        if (!pdfRes.ok) throw new Error('Failed to generate contract')
      }

      // Step 3: Create the portal invite
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          contactId,
          expiresInDays: parseInt(expiresInDays),
          canViewSummary,
          canViewTimeline,
          canMessage,
          canViewReports,
          canEditReports: canViewReports ? canEditReports : false,
          canUploadDocuments,
          canViewFeeSchedule,
          canViewDepositions,
          canViewBilling,
          canSignContract: attachContract,
          contractId,
          onboardingMode: true,
          invitationMessage: invitationMessage.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const { portalUrl: url } = await res.json()
      setPortalUrl(url)
      toast.success('Portal invite created' + (attachContract ? ' with retention agreement' : ''))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create portal invite')
    } finally {
      setCreating(false)
    }
  }

  function handleCopy() {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSendEmail() {
    if (!portalUrl || !contactEmail) {
      toast.error('No email address available for this contact')
      return
    }
    setSendingEmail(true)
    try {
      // Build features list based on enabled permissions
      const features: string[] = []
      if (canViewSummary) features.push('View case summary and updates')
      if (canViewTimeline) features.push('Review communication timeline')
      if (canMessage) features.push('Send secure messages')
      if (canViewReports) features.push('Access shared reports')
      if (canUploadDocuments) features.push('Upload documents and records')
      if (canViewFeeSchedule) features.push('View fee schedule')
      if (canViewBilling) features.push('View invoices and billing')
      if (canViewDepositions) features.push('Review depositions')
      if (attachContract) features.push('Review and sign retention agreement')

      const res = await fetch('/api/portal/invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalUrl,
          recipientEmail: contactEmail,
          recipientName: contactName,
          caseName: caseName || undefined,
          caseId,
          invitationMessage: invitationMessage.trim() || undefined,
          features,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send email')
      }
      setEmailSent(true)
      toast.success(`Invitation email sent to ${contactEmail}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  function handleClose() {
    setPortalUrl(null)
    setCopied(false)
    setEmailSent(false)
    setSendingEmail(false)
    setInvitationMessage('')
    setAttachContract(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0E1F35]">
            <Link2 className="h-5 w-5 inline mr-2 text-[#C9A84C]" />
            Create Portal Invite
          </DialogTitle>
          <DialogDescription>
            {contactName ? `Invite ${contactName} to access this case portal.` : 'Create a portal invite for an attorney.'}
          </DialogDescription>
        </DialogHeader>

        {portalUrl ? (
          // Success state — show the link + send email option
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Portal link created!</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={portalUrl}
                  className="flex-1 text-xs bg-white border rounded px-2 py-1.5 font-mono"
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Send Email Section */}
            {contactEmail ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Send invitation email</p>
                      <p className="text-xs text-blue-600">{contactEmail}</p>
                    </div>
                  </div>
                  {emailSent ? (
                    <div className="flex items-center gap-1 text-green-700">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Sent</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
                    >
                      {sendingEmail ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      {sendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                No email address on file for this contact. Copy the link above to share manually.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              This link expires in {expiresInDays} days.
            </p>
          </div>
        ) : (
          // Configuration form
          <div className="space-y-5 py-2">
            {/* Contact */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Attorney</label>
              <div className="text-sm px-3 py-2 bg-gray-50 border rounded-md">
                {contactName || 'No contact selected'}
                {contactEmail && (
                  <span className="text-gray-400 ml-2 text-xs">({contactEmail})</span>
                )}
              </div>
            </div>

            {/* Retention Agreement */}
            <div className="p-4 bg-[#0E1F35]/5 border border-[#0E1F35]/10 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={attachContract}
                  onCheckedChange={(checked) => setAttachContract(checked === true)}
                />
                <div className="flex items-center gap-1.5">
                  <FileSignature className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-sm font-medium text-[#0E1F35]">Attach Retention Agreement</span>
                </div>
              </div>
              {attachContract && (
                <div className="space-y-3 pl-6">
                  <p className="text-xs text-gray-500">
                    A retention agreement will be auto-generated with {contactName || 'the attorney'}&apos;s information and the rates below.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Hourly Rate</label>
                      <Input
                        type="number"
                        min="0"
                        step="25"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Deposition Rate</label>
                      <Input
                        type="number"
                        min="0"
                        step="25"
                        value={depositionRate}
                        onChange={(e) => setDepositionRate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Trial Rate</label>
                      <Input
                        type="number"
                        min="0"
                        step="25"
                        value={trialRate}
                        onChange={(e) => setTrialRate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Retainer Amount</label>
                      <Input
                        type="number"
                        min="0"
                        step="500"
                        value={retainerAmount}
                        onChange={(e) => setRetainerAmount(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Portal Features</label>
              <div className="space-y-2.5">
                {[
                  { label: 'Case Summary', checked: canViewSummary, onChange: setCanViewSummary },
                  { label: 'Communication Timeline', checked: canViewTimeline, onChange: setCanViewTimeline },
                  { label: 'Messaging', checked: canMessage, onChange: setCanMessage },
                  { label: 'View Reports', checked: canViewReports, onChange: setCanViewReports },
                  { label: 'Edit Reports', checked: canEditReports && canViewReports, onChange: setCanEditReports, disabled: !canViewReports },
                  { label: 'Upload Documents', checked: canUploadDocuments, onChange: setCanUploadDocuments },
                  { label: 'Fee Schedule', checked: canViewFeeSchedule, onChange: setCanViewFeeSchedule },
                  { label: 'Billing & Invoices', checked: canViewBilling, onChange: setCanViewBilling },
                  { label: 'Depositions', checked: canViewDepositions, onChange: setCanViewDepositions },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => item.onChange(checked === true)}
                      disabled={item.disabled}
                    />
                    <span className={`text-sm ${item.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Expires In</label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Custom Message (optional)</label>
              <textarea
                value={invitationMessage}
                onChange={(e) => setInvitationMessage(e.target.value)}
                placeholder="Add a personal note to the invitation..."
                className="w-full text-sm border rounded-md p-2.5 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {portalUrl ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating || !contactId}>
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {attachContract ? 'Create Invite with Agreement' : 'Create Invite'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
