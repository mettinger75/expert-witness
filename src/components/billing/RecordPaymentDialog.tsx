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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePayment } from '@/hooks/usePayments'
import { formatCurrency } from '@/lib/formatters'
import type { InvoiceRow, PaymentMethod } from '@/types/database.types'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RecordPaymentDialogProps {
  invoice: InvoiceRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'check', label: 'Check' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'money_order', label: 'Money Order' },
  { value: 'other', label: 'Other' },
]

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: RecordPaymentDialogProps) {
  const createPayment = useCreatePayment()

  // Initial values come from the invoice; parent re-mounts this component each
  // time the dialog opens (so these initial values are fresh per open).
  const [amount, setAmount] = useState(
    invoice.balance_due > 0 ? String(invoice.balance_due) : ''
  )
  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('check')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [receivedFrom, setReceivedFrom] = useState(
    invoice.bill_to_name || invoice.bill_to_organization || ''
  )
  const [notes, setNotes] = useState('')

  const numericAmount = Number(amount)
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0
  const willFullyPay =
    isValidAmount && numericAmount + (invoice.amount_paid || 0) >= invoice.total_amount

  function handleSubmit() {
    if (!isValidAmount) {
      toast.error('Enter a payment amount greater than 0')
      return
    }

    createPayment.mutate(
      {
        invoice_id: invoice.id,
        case_id: invoice.case_id,
        amount: numericAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || null,
        check_number: paymentMethod === 'check' ? checkNumber.trim() || null : null,
        received_from: receivedFrom.trim() || null,
        notes: notes.trim() || null,
        status: 'received',
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
          >
            Record Payment
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
              <span
                className="font-mono font-medium"
                style={{ color: '#0E1F35' }}
              >
                {invoice.invoice_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span
                className="tabular-nums"
                style={{ color: '#0E1F35' }}
              >
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid</span>
              <span
                className="tabular-nums"
                style={{ color: '#10B981' }}
              >
                {formatCurrency(invoice.amount_paid || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t border-[#E5DFD0]">
              <span style={{ color: '#0E1F35' }}>Balance Due</span>
              <span
                className="tabular-nums"
                style={{ color: '#F59E0B' }}
              >
                {formatCurrency(invoice.balance_due || 0)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="payment-amount">Amount *</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {isValidAmount && (
              <p className="text-xs text-muted-foreground mt-1">
                {willFullyPay
                  ? 'Invoice will be marked as paid.'
                  : `Remaining balance after payment: ${formatCurrency(
                      Math.max(
                        0,
                        invoice.total_amount - (invoice.amount_paid || 0) - numericAmount
                      )
                    )}`}
              </p>
            )}
          </div>

          {/* Date + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Check number (only for check) */}
          {paymentMethod === 'check' && (
            <div>
              <Label htmlFor="check-number">Check Number</Label>
              <Input
                id="check-number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="e.g., 1042"
              />
            </div>
          )}

          {/* Reference number (any method) */}
          <div>
            <Label htmlFor="reference-number">
              Reference Number{paymentMethod === 'check' ? ' (optional)' : ''}
            </Label>
            <Input
              id="reference-number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={
                paymentMethod === 'wire_transfer'
                  ? 'Wire confirmation #'
                  : paymentMethod === 'ach'
                  ? 'ACH trace #'
                  : 'Optional reference'
              }
            />
          </div>

          {/* Received from */}
          <div>
            <Label htmlFor="received-from">Received From</Label>
            <Input
              id="received-from"
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              placeholder="Payer name"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="payment-notes">Notes (optional)</Label>
            <Textarea
              id="payment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this payment..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createPayment.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPayment.isPending || !isValidAmount}
              style={{ backgroundColor: '#0E1F35' }}
            >
              {createPayment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
