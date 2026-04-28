'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateInvoice } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/formatters'
import type { InvoiceRow } from '@/types/database.types'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SendInvoiceDialogProps {
  invoice: InvoiceRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: SendInvoiceDialogProps) {
  const updateInvoice = useUpdateInvoice()

  const [recipientEmail, setRecipientEmail] = useState(
    invoice.bill_to_email ?? ''
  )
  const [senderMessage, setSenderMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSend() {
    if (!recipientEmail.trim()) {
      toast.error('Please enter a recipient email address')
      return
    }

    setIsSending(true)
    try {
      // Step 1: Create a shared link
      const linkRes = await fetch('/api/shared-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'invoice',
          entityId: invoice.id,
          permission: 'view',
          recipientName: invoice.bill_to_name,
          recipientEmail: recipientEmail.trim(),
          expiresInDays: 90,
        }),
      })

      if (!linkRes.ok) {
        const err = await linkRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create shared link')
      }

      const { url: shareUrl } = await linkRes.json()

      // Step 2: Send the email
      const emailRes = await fetch('/api/shared-links/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          recipientName: invoice.bill_to_name,
          shareUrl,
          entityType: 'invoice',
          entityName: invoice.invoice_number,
          permission: 'view',
          senderMessage: senderMessage.trim() || undefined,
          invoiceAmount: invoice.balance_due > 0 ? invoice.balance_due : invoice.total_amount,
          invoiceDueDate: invoice.due_date,
        }),
      })

      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to send email')
      }

      // Step 3: Update invoice status to 'sent'
      updateInvoice.mutate(
        {
          id: invoice.id,
          data: {
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_method: 'email',
          },
        },
        {
          onSuccess: () => {
            toast.success(`Invoice ${invoice.invoice_number} sent to ${recipientEmail}`)
            onOpenChange(false)
            setSenderMessage('')
          },
        }
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send invoice'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
          >
            Send Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Invoice Summary */}
          <div
            className="rounded-md px-4 py-3 space-y-1"
            style={{ backgroundColor: '#F8F6F1' }}
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium" style={{ color: '#0E1F35' }}>
                {invoice.invoice_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums" style={{ color: '#0E1F35' }}>
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            {invoice.bill_to_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span style={{ color: '#0E1F35' }}>{invoice.bill_to_name}</span>
              </div>
            )}
          </div>

          {/* Recipient Email */}
          <div>
            <Label htmlFor="send-email">Recipient Email *</Label>
            <Input
              id="send-email"
              type="email"
              placeholder="attorney@firm.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          {/* Optional Message */}
          <div>
            <Label htmlFor="send-message">Message (optional)</Label>
            <Textarea
              id="send-message"
              rows={3}
              placeholder="Add a personal note to include with the invoice..."
              value={senderMessage}
              onChange={(e) => setSenderMessage(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !recipientEmail.trim()}
              style={{ backgroundColor: '#0E1F35' }}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
