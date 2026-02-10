'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Copy, Check, Link2, Loader2 } from 'lucide-react'

interface CreatePortalInviteDialogProps {
  caseId: string
  contactId?: string
  contactName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePortalInviteDialog({ caseId, contactId, contactName, open, onOpenChange }: CreatePortalInviteDialogProps) {
  const [creating, setCreating] = useState(false)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Permissions
  const [canViewSummary, setCanViewSummary] = useState(true)
  const [canViewTimeline, setCanViewTimeline] = useState(false)
  const [canMessage, setCanMessage] = useState(true)
  const [canViewReports, setCanViewReports] = useState(true)
  const [canEditReports, setCanEditReports] = useState(false)
  const [canUploadDocuments, setCanUploadDocuments] = useState(true)
  const [canViewFeeSchedule, setCanViewFeeSchedule] = useState(true)
  const [canViewDepositions, setCanViewDepositions] = useState(true)
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [invitationMessage, setInvitationMessage] = useState('')

  async function handleCreate() {
    if (!contactId) {
      toast.error('No contact selected')
      return
    }
    setCreating(true)
    try {
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
          invitationMessage: invitationMessage.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create invite')
      const { portalUrl: url } = await res.json()
      setPortalUrl(url)
      toast.success('Portal invite created')
    } catch {
      toast.error('Failed to create portal invite')
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

  function handleClose() {
    setPortalUrl(null)
    setCopied(false)
    setInvitationMessage('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
          // Success state — show the link
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
            <p className="text-xs text-muted-foreground">
              Share this link with {contactName || 'the attorney'}. It expires in {expiresInDays} days.
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
              </div>
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
              Create Invite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
