'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Eye, Mail } from 'lucide-react'
import { toast } from 'sonner'

const EMAIL_TEMPLATES = [
  { value: 'freeform', label: 'Custom Email', description: 'Write a custom email with branded template' },
  { value: 'portal_invite', label: 'Portal Invitation', description: 'Invite attorney to case portal' },
  { value: 'report_sent', label: 'Report Sent', description: 'Notify that a report is ready for review' },
  { value: 'report_finalized', label: 'Report Finalized', description: 'Notify that the final report is ready' },
  { value: 'invoice_sent', label: 'Invoice', description: 'Send an invoice for services' },
  { value: 'retainer_request', label: 'Retainer Agreement', description: 'Send retainer agreement for signing' },
  { value: 'deposition_scheduled', label: 'Deposition Scheduled', description: 'Confirm deposition scheduling' },
  { value: 'case_update', label: 'Case Update', description: 'General case update' },
  { value: 'follow_up', label: 'Follow Up', description: 'Follow up on pending items' },
  { value: 'outreach', label: 'Cold Outreach', description: 'Introduce your practice to a new attorney' },
] as const

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  caseName?: string
  caseNumber?: string
  contacts?: Array<{
    id: string
    name: string
    email: string | null
    role?: string
  }>
  defaultTemplate?: string
  defaultRecipientEmail?: string
  defaultRecipientName?: string
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  caseId,
  caseName,
  caseNumber,
  contacts = [],
  defaultTemplate = 'freeform',
  defaultRecipientEmail,
  defaultRecipientName,
}: ComposeEmailDialogProps) {
    const [template, setTemplate] = useState(defaultTemplate)
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || '')
  const [recipientName, setRecipientName] = useState(defaultRecipientName || '')
  const [contactId, setContactId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTemplate(defaultTemplate)
      setRecipientEmail(defaultRecipientEmail || '')
      setRecipientName(defaultRecipientName || '')
      setContactId('')
      setSubject('')
      setBody('')
      setPreviewHtml(null)
    }
  }, [open, defaultTemplate, defaultRecipientEmail, defaultRecipientName])

  // Auto-fill subject based on template
  useEffect(() => {
    if (template === 'freeform') {
      setSubject(caseName ? `Re: ${caseName}` : '')
    } else {
      const tmpl = EMAIL_TEMPLATES.find(t => t.value === template)
      if (tmpl && caseName) {
        setSubject(`${tmpl.label} — ${caseName}`)
      }
    }
  }, [template, caseName])

  function handleContactSelect(cId: string) {
    setContactId(cId)
    const contact = contacts.find(c => c.id === cId)
    if (contact) {
      setRecipientEmail(contact.email || '')
      setRecipientName(contact.name)
    }
  }

  async function handlePreview() {
    // For now, show a simple preview. In the future this could call an API to render the template.
    setPreviewHtml('preview')
  }

  async function handleSend() {
    if (!recipientEmail) {
      toast.error('Recipient email is required')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: template,
          recipientEmail,
          recipientName,
          caseId,
          contactId: contactId || undefined,
          customSubject: template === 'freeform' ? subject : undefined,
          customBody: template === 'freeform' ? body : undefined,
          metadata: {
            caseName,
            caseNumber,
            caseId,
            message: body || undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      toast.success(`Email sent to ${recipientEmail}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const contactsWithEmail = contacts.filter(c => c.email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        {previewHtml ? (
          // Preview mode
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p><strong>To:</strong> {recipientName} &lt;{recipientEmail}&gt;</p>
              <p><strong>Subject:</strong> {subject}</p>
              <p><strong>Template:</strong> {EMAIL_TEMPLATES.find(t => t.value === template)?.label}</p>
            </div>
            <div className="border rounded-lg p-4 bg-white text-sm text-muted-foreground text-center py-8">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Email will be sent with the branded expert witness template.</p>
              <p className="text-xs mt-1">Navy header, gold accent, your signature block.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewHtml(null)}>
                Back to Edit
              </Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Send Email</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Compose mode
          <div className="space-y-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground">— {t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient */}
            {contactsWithEmail.length > 0 ? (
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={contactId} onValueChange={handleContactSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsWithEmail.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.role && <Badge variant="secondary" className="text-[10px]">{c.role}</Badge>}
                          <span className="text-xs text-muted-foreground">{c.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipientEmail && (
                  <p className="text-xs text-muted-foreground">{recipientName} &lt;{recipientEmail}&gt;</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="jane@lawfirm.com"
                  />
                </div>
              </div>
            )}

            {/* Case context (if set) */}
            {caseName && (
              <div className="bg-muted/50 rounded-md px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Case: <span className="font-medium text-foreground">{caseName}</span>
                  {caseNumber && <span className="ml-2">({caseNumber})</span>}
                </p>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {/* Body (for freeform or additional message) */}
            <div className="space-y-2">
              <Label>{template === 'freeform' ? 'Message' : 'Additional Message (optional)'}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={template === 'freeform'
                  ? 'Write your email message here...'
                  : 'Add a personal note to the template (optional)...'
                }
                rows={template === 'freeform' ? 8 : 4}
              />
            </div>
          </div>
        )}

        {!previewHtml && (
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={!recipientEmail}>
              <Eye className="h-4 w-4 mr-2" />
              Preview & Send
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
