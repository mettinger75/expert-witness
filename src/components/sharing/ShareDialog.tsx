'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSharedLinks, useCreateSharedLink, useRevokeSharedLink } from '@/hooks/useSharedLinks'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import { formatDate } from '@/lib/formatters'
import { authHeaders } from '@/lib/api-client'
import {
  Share2,
  Copy,
  Check,
  X,
  Link as LinkIcon,
  Loader2,
  Shield,
  Eye,
  Pencil,
  FileSignature,
  Mail,
  Send,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SharedLinkPermission } from '@/types/database.types'

interface ShareDialogProps {
  entityType: 'report' | 'contract'
  entityId: string
  entityName: string
  caseId?: string
  defaultPermission?: SharedLinkPermission
  children?: React.ReactNode
}

const PERMISSION_OPTIONS: { value: SharedLinkPermission; label: string; description: string; icon: typeof Eye }[] = [
  { value: 'view', label: 'View Only', description: 'Can read the document', icon: Eye },
  { value: 'edit', label: 'Edit', description: 'Can read and make changes', icon: Pencil },
  { value: 'sign', label: 'Sign', description: 'Can view and sign the document', icon: FileSignature },
]

const EXPIRY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

export function ShareDialog({
  entityType,
  entityId,
  entityName,
  caseId,
  defaultPermission = 'view',
  children,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState<SharedLinkPermission>(defaultPermission)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [pin, setPin] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [createdPermission, setCreatedPermission] = useState<SharedLinkPermission>('view')
  const [createdRecipientName, setCreatedRecipientName] = useState('')
  const [createdRecipientEmail, setCreatedRecipientEmail] = useState('')

  // Email sending state
  const [senderMessage, setSenderMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const { data: existingLinks } = useSharedLinks(entityType, entityId)
  const createLink = useCreateSharedLink()
  const revokeLink = useRevokeSharedLink()
  const { data: caseContacts } = useCaseContacts(caseId || '')

  function handleContactSelect(contactId: string) {
    if (contactId === '') {
      setSelectedContactId(null)
      return
    }
    setSelectedContactId(contactId)
    const contact = caseContacts?.find((cc) => cc.contact_id === contactId)
    if (contact?.contacts) {
      const c = contact.contacts as { first_name?: string; last_name?: string; email?: string }
      setRecipientName([c.first_name, c.last_name].filter(Boolean).join(' '))
      setRecipientEmail(c.email || '')
    }
  }

  const activeLinks = existingLinks?.filter((l) => l.is_active && new Date(l.expires_at) > new Date()) || []

  async function handleCreate() {
    // Capture values before they get cleared
    const name = recipientName
    const email = recipientEmail
    const perm = permission

    const result = await createLink.mutateAsync({
      entityType,
      entityId,
      permission,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      expiresInDays,
      pin: pin || undefined,
      contactId: selectedContactId || undefined,
    })
    setCreatedUrl(result.url)
    setCreatedPermission(perm)
    setCreatedRecipientName(name)
    setCreatedRecipientEmail(email)
    setEmailSent(false)
    setSenderMessage('')
    setRecipientName('')
    setRecipientEmail('')
    setPin('')
    setSelectedContactId(null)
  }

  async function handleSendEmail() {
    if (!createdUrl || !createdRecipientEmail) {
      toast.error('Recipient email is required to send')
      return
    }

    setSendingEmail(true)
    try {
      const res = await fetch('/api/shared-links/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          recipientEmail: createdRecipientEmail,
          recipientName: createdRecipientName,
          shareUrl: createdUrl,
          entityType,
          entityName,
          permission: createdPermission,
          senderMessage: senderMessage || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send email')
      }

      setEmailSent(true)
      toast.success(`Email sent to ${createdRecipientEmail}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  function handleCopyUrl(url: string, linkId: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(linkId)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getPermissionBadge(perm: string) {
    switch (perm) {
      case 'view': return <Badge variant="secondary" className="text-xs"><Eye className="h-3 w-3 mr-1" />View</Badge>
      case 'edit': return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800"><Pencil className="h-3 w-3 mr-1" />Edit</Badge>
      case 'sign': return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800"><FileSignature className="h-3 w-3 mr-1" />Sign</Badge>
      default: return null
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share {entityType === 'report' ? 'Report' : 'Contract'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Just-created URL + Email sending */}
          {createdUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="text-sm font-medium text-green-800">Link Created</div>
              <div className="flex items-center gap-2">
                <Input value={createdUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyUrl(createdUrl, 'new')}
                >
                  {copiedId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Email section */}
              {emailSent ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-md p-2">
                  <Check className="h-4 w-4" />
                  Email sent to {createdRecipientEmail}
                </div>
              ) : (
                <div className="border-t border-green-200 pt-3 space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-green-800">
                    <Mail className="h-4 w-4" />
                    Send via Email
                  </div>
                  {!createdRecipientEmail ? (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Recipient Email</label>
                      <Input
                        value={createdRecipientEmail}
                        onChange={(e) => setCreatedRecipientEmail(e.target.value)}
                        placeholder="attorney@firm.com"
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-green-700">
                      To: {createdRecipientName ? `${createdRecipientName} <${createdRecipientEmail}>` : createdRecipientEmail}
                    </p>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Message (optional)</label>
                    <textarea
                      value={senderMessage}
                      onChange={(e) => setSenderMessage(e.target.value)}
                      placeholder="Please review the attached document at your convenience..."
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={sendingEmail || (!createdRecipientEmail)}
                    className="w-full"
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Email
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Create new link form */}
          <div className="space-y-4">
            <div className="text-sm font-medium">Create New Share Link</div>

            {/* Permission */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Permission</label>
              <div className="grid grid-cols-3 gap-2">
                {PERMISSION_OPTIONS.filter(
                  (opt) => entityType === 'report' ? opt.value !== 'sign' : true
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPermission(opt.value)}
                    className={`p-2 rounded-md border text-xs text-center transition-colors ${
                      permission === opt.value
                        ? 'border-[#DFC06A] bg-[#DFC06A]/10 text-[#0E1F35]'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <opt.icon className="h-4 w-4 mx-auto mb-1" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Selector */}
            {caseId && caseContacts && caseContacts.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  <Users className="h-3 w-3 inline mr-1" />
                  Select Contact
                </label>
                <select
                  value={selectedContactId || ''}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Manual entry</option>
                  {caseContacts.map((cc) => {
                    const c = cc.contacts as { first_name?: string; last_name?: string; email?: string; organization_name?: string } | null
                    if (!c) return null
                    const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
                    const org = c.organization_name ? ` (${c.organization_name})` : ''
                    return (
                      <option key={cc.contact_id} value={cc.contact_id}>
                        {name}{org} — {cc.role}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Recipient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient Name</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Attorney name"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient Email</label>
                <Input
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="attorney@firm.com"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Expires In</label>
              <div className="flex gap-2">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiresInDays(opt.value)}
                    className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      expiresInDays === opt.value
                        ? 'border-[#DFC06A] bg-[#DFC06A]/10'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Shield className="h-3 w-3 inline mr-1" />
                PIN Protection (optional)
              </label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="4-6 digit PIN"
                maxLength={6}
                className="text-sm w-32"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={createLink.isPending}
              className="w-full"
            >
              {createLink.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Create Share Link
            </Button>
          </div>

          {/* Existing links */}
          {activeLinks.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Active Links</div>
              <div className="space-y-2">
                {activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getPermissionBadge(link.permission)}
                        {link.recipient_name && (
                          <span className="text-xs text-muted-foreground">{link.recipient_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expires {formatDate(link.expires_at)} · {link.view_count} views
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => handleCopyUrl(`${appUrl}/shared/${link.token}`, link.id)}
                    >
                      {copiedId === link.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-red-500 hover:text-red-700"
                      onClick={() => revokeLink.mutate(link.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
