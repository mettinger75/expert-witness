'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Copy, Check, Link2, Loader2, Mail, Send, FileSignature, Eye, Clock, CheckCircle2, RefreshCw, Plus, Activity as ActivityIcon, ExternalLink, SlidersHorizontal } from 'lucide-react'
import { PortalActivityDrawer } from './PortalActivityDrawer'

interface ExistingInvite {
  id: string
  token: string
  view_count: number
  last_accessed_at: string | null
  onboarding_completed_at: string | null
  onboarding_mode: boolean
  onboarding_steps: Record<string, string> | null
  created_at: string
  expires_at: string
  can_view_summary: boolean
  can_view_timeline: boolean
  can_message: boolean
  can_view_reports: boolean
  can_edit_reports: boolean
  can_upload_documents: boolean
  can_view_fee_schedule: boolean
  can_view_depositions: boolean
  can_view_billing: boolean
  can_book_scheduling: boolean
  can_sign_contract: boolean
  contract_id: string | null
}

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

  // Existing invite state
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existingInvite, setExistingInvite] = useState<ExistingInvite | null>(null)
  const [showCreateNew, setShowCreateNew] = useState(false)

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
  const [canBookScheduling, setCanBookScheduling] = useState(true)
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [invitationMessage, setInvitationMessage] = useState('')

  // Contract / Onboarding
  const [attachContract, setAttachContract] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('500')
  const [depositionRate, setDepositionRate] = useState('750')
  const [trialRate, setTrialRate] = useState('750')
  const [retainerAmount, setRetainerAmount] = useState('5000')

  // Onboarding stage control (granular send options)
  const ONBOARDING_STEPS: Array<{ key: string; label: string }> = [
    { key: 'review_fee_schedule', label: 'Review fee schedule' },
    { key: 'review_cv', label: 'Review CV' },
    { key: 'enter_case_details', label: 'Enter case details' },
    { key: 'sign_contract', label: 'Sign retention agreement' },
    { key: 'retainer_payment', label: 'Pay retainer' },
    { key: 'upload_documents', label: 'Upload documents' },
  ]
  const [showStageControl, setShowStageControl] = useState(false)
  const [startingStep, setStartingStep] = useState<string>('review_fee_schedule')
  const [stepOverrides, setStepOverrides] = useState<Record<string, string>>({})

  // Activity drawer
  const [activityOpen, setActivityOpen] = useState(false)

  // Check for existing invite when dialog opens
  useEffect(() => {
    if (open && contactId && caseId) {
      setLoadingExisting(true)
      setExistingInvite(null)
      setShowCreateNew(false)
      setPortalUrl(null)
      fetch(`/api/portal?caseId=${caseId}&contactId=${contactId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.invites && data.invites.length > 0) {
            // Find the most recent active, non-expired invite
            const active = data.invites.find(
              (inv: ExistingInvite) => new Date(inv.expires_at) > new Date()
            )
            if (active) {
              setExistingInvite(active)
            }
          }
        })
        .catch(() => {
          // Silently fail — just show the create form
        })
        .finally(() => setLoadingExisting(false))
    }
  }, [open, contactId, caseId])

  const existingPortalUrl = existingInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${existingInvite.token}`
    : null

  const hasBeenAccessed = existingInvite && existingInvite.view_count > 0
  const onboardingDone = existingInvite?.onboarding_completed_at != null

  async function handleCreate() {
    if (!contactId) {
      toast.error('No contact selected')
      return
    }
    setCreating(true)
    try {
      // If creating a new invite while one exists, deactivate the old one
      if (existingInvite) {
        await fetch(`/api/portal/${existingInvite.token}`, {
          method: 'DELETE',
        }).catch(() => {}) // Best-effort deactivation
      }

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
          canBookScheduling,
          canSignContract: attachContract,
          contractId,
          onboardingMode: true,
          invitationMessage: invitationMessage.trim() || undefined,
          startingStep: showStageControl ? startingStep : undefined,
          onboardingStepsOverride:
            showStageControl && Object.keys(stepOverrides).length > 0 ? stepOverrides : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const { portalUrl: url } = await res.json()
      setPortalUrl(url)
      setExistingInvite(null) // Clear existing since we created new
      setShowCreateNew(false)
      toast.success('Portal invite created' + (attachContract ? ' with retention agreement' : ''))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create portal invite')
    } finally {
      setCreating(false)
    }
  }

  function handleCopy(url?: string) {
    const urlToCopy = url || portalUrl
    if (urlToCopy) {
      navigator.clipboard.writeText(urlToCopy)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSendEmail(url?: string) {
    const urlToSend = url || portalUrl
    if (!urlToSend || !contactEmail) {
      toast.error('No email address available for this contact')
      return
    }
    setSendingEmail(true)
    try {
      const features: string[] = []
      const inv = existingInvite
      const checkSummary = inv ? inv.can_view_summary : canViewSummary
      const checkTimeline = inv ? inv.can_view_timeline : canViewTimeline
      const checkMessage = inv ? inv.can_message : canMessage
      const checkReports = inv ? inv.can_view_reports : canViewReports
      const checkDocs = inv ? inv.can_upload_documents : canUploadDocuments
      const checkFee = inv ? inv.can_view_fee_schedule : canViewFeeSchedule
      const checkBilling = inv ? inv.can_view_billing : canViewBilling
      const checkDepos = inv ? inv.can_view_depositions : canViewDepositions
      const checkBooking = inv ? inv.can_book_scheduling : canBookScheduling
      const checkContract = inv ? inv.can_sign_contract : attachContract

      if (checkSummary) features.push('View case summary and updates')
      if (checkTimeline) features.push('Review communication timeline')
      if (checkMessage) features.push('Send secure messages')
      if (checkReports) features.push('Access shared reports')
      if (checkDocs) features.push('Upload documents and records')
      if (checkFee) features.push('View fee schedule')
      if (checkBilling) features.push('View invoices and billing')
      if (checkDepos) features.push('Review depositions')
      if (checkBooking) features.push('Book expert calls and depositions')
      if (checkContract) features.push('Review and sign retention agreement')

      const res = await fetch('/api/portal/invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalUrl: urlToSend,
          recipientEmail: contactEmail,
          recipientName: contactName,
          caseName: caseName || undefined,
          caseId,
          invitationMessage: invitationMessage.trim() || undefined,
          features,
        }),
      })
      if (!res.ok) {
        // Read as text first so we don't choke on empty / non-JSON bodies
        const text = await res.text().catch(() => '')
        let message = `Failed to send email (HTTP ${res.status})`
        if (text) {
          try {
            const err = JSON.parse(text)
            message = err.details || err.error || message
          } catch {
            message = text.slice(0, 200) // fall back to raw body snippet
          }
        }
        throw new Error(message)
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
    setExistingInvite(null)
    setShowCreateNew(false)
    setLoadingExisting(false)
    onOpenChange(false)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function formatRelative(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateStr)
  }

  // Loading state
  if (loadingExisting) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E1F35]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Existing invite found — show status view
  if (existingInvite && !showCreateNew && !portalUrl) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0E1F35]">
              <Link2 className="h-5 w-5 inline mr-2 text-[#DFC06A]" />
              Portal Access — {contactName}
            </DialogTitle>
            <DialogDescription>
              {contactName} already has an active portal invite for this case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status Card */}
            <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Portal Status</span>
                {hasBeenAccessed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Accessed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Invite Sent</p>
                  <p className="font-medium">{formatRelative(existingInvite.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Accessed</p>
                  <p className="font-medium">{existingInvite.last_accessed_at ? formatRelative(existingInvite.last_accessed_at) : 'Never'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Times Viewed</p>
                  <p className="font-medium flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                    {existingInvite.view_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expires</p>
                  <p className="font-medium">{formatDate(existingInvite.expires_at)}</p>
                </div>
              </div>

              {existingInvite.onboarding_mode && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Onboarding</span>
                    {onboardingDone ? (
                      <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {formatRelative(existingInvite.onboarding_completed_at!)}
                      </span>
                    ) : hasBeenAccessed ? (
                      <span className="text-xs font-medium text-blue-700">In Progress</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">Not Started</span>
                    )}
                  </div>
                  {existingInvite.onboarding_steps && !onboardingDone && (
                    <div className="mt-2 flex gap-1">
                      {Object.entries(existingInvite.onboarding_steps).map(([key, status]) => (
                        <div
                          key={key}
                          className={`h-1.5 flex-1 rounded-full ${
                            status === 'completed'
                              ? 'bg-green-500'
                              : status === 'pending'
                                ? 'bg-amber-400'
                                : status === 'not_applicable'
                                  ? 'bg-gray-200'
                                  : 'bg-gray-300'
                          }`}
                          title={`${key}: ${status}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Portal Link */}
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={existingPortalUrl || ''}
                className="flex-1 text-xs bg-white border rounded px-2 py-1.5 font-mono"
              />
              <Button size="sm" variant="outline" onClick={() => handleCopy(existingPortalUrl || undefined)}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* View Activity + View as Recipient */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivityOpen(true)}
                className="text-xs"
              >
                <ActivityIcon className="h-3.5 w-3.5 mr-1.5" />
                View All Activity
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (existingPortalUrl) {
                    window.open(`${existingPortalUrl}?preview=1`, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View as Recipient
              </Button>
            </div>

            {/* Resend Email */}
            {contactEmail && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        {hasBeenAccessed ? 'Resend portal link' : 'Send invitation email'}
                      </p>
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
                      onClick={() => handleSendEmail(existingPortalUrl || undefined)}
                      disabled={sendingEmail}
                      className="bg-[#0E1F35] hover:bg-[#0E1F35]/90"
                    >
                      {sendingEmail ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      {sendingEmail ? 'Sending...' : hasBeenAccessed ? 'Resend Link' : 'Send Email'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateNew(true)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create New Invite
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
        <PortalActivityDrawer
          inviteId={existingInvite?.id ?? null}
          contactName={contactName}
          open={activityOpen}
          onOpenChange={setActivityOpen}
        />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0E1F35]">
            <Link2 className="h-5 w-5 inline mr-2 text-[#DFC06A]" />
            {showCreateNew ? 'Create New Portal Invite' : 'Create Portal Invite'}
          </DialogTitle>
          <DialogDescription>
            {showCreateNew
              ? `This will replace ${contactName}'s existing portal access with a new invite.`
              : contactName
                ? `Invite ${contactName} to access this case portal.`
                : 'Create a portal invite for an attorney.'}
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
                <Button size="sm" variant="outline" onClick={() => handleCopy()}>
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
                      onClick={() => handleSendEmail()}
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
                  <FileSignature className="h-4 w-4 text-[#DFC06A]" />
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
                  { label: 'Call & Deposition Booking', checked: canBookScheduling, onChange: setCanBookScheduling },
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

            {/* Onboarding Stage Control */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowStageControl((v) => !v)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#DFC06A]" />
                  Onboarding Stage Control
                </span>
                <span className="text-xs text-gray-400">{showStageControl ? 'Hide' : 'Customize'}</span>
              </button>
              {showStageControl && (
                <div className="px-3 pb-3 space-y-3 border-t pt-3">
                  <p className="text-xs text-gray-500">
                    Pre-complete steps the attorney has already done, or pick where they start. Default skips
                    steps already satisfied from case data.
                  </p>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Start attorney at</label>
                    <Select value={startingStep} onValueChange={setStartingStep}>
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ONBOARDING_STEPS.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Everything before this step will be marked completed.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Per-step overrides</label>
                    <div className="space-y-1.5">
                      {ONBOARDING_STEPS.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-gray-700 truncate">{s.label}</span>
                          <Select
                            value={stepOverrides[s.key] ?? 'auto'}
                            onValueChange={(v) => {
                              setStepOverrides((prev) => {
                                const next = { ...prev }
                                if (v === 'auto') delete next[s.key]
                                else next[s.key] = v
                                return next
                              })
                            }}
                          >
                            <SelectTrigger className="h-7 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto (default)</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="locked">Locked</SelectItem>
                              <SelectItem value="completed">Skip (done)</SelectItem>
                              <SelectItem value="not_applicable">Hide (N/A)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                className="w-full text-sm border rounded-md p-2.5 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#DFC06A]/50 focus:border-[#DFC06A]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {portalUrl ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              {showCreateNew && (
                <Button variant="outline" onClick={() => setShowCreateNew(false)}>
                  Back
                </Button>
              )}
              <Button onClick={handleCreate} disabled={creating || !contactId}>
                {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {attachContract ? 'Create Invite with Agreement' : 'Create Invite'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
      <PortalActivityDrawer
        inviteId={existingInvite?.id ?? null}
        contactName={contactName}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </Dialog>
  )
}
