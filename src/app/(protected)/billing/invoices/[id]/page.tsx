'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { useInvoice, useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { useCase } from '@/hooks/useCases'
import { INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import type { InvoiceUpdate, InvoiceLineItemRow, PaymentRow } from '@/types/database.types'
import { ArrowLeft, CheckCircle2, CreditCard, Download, Eye, FileText, Mail, Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

interface EditableLineItem {
  id: string | null // null = new item
  description: string
  quantity: number
  unit_price: number
  amount: number
  time_entry_id: string | null
  _deleted?: boolean
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invoiceId = params.id as string

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const caseId = invoice?.case_id || ''
  const { data: caseData } = useCase(caseId)
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)

  // Line item editing state
  const [editingLineItems, setEditingLineItems] = useState(false)
  const [editableItems, setEditableItems] = useState<EditableLineItem[]>([])
  const [savingLineItems, setSavingLineItems] = useState(false)

  // Send invoice dialog state
  const [sendOpen, setSendOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sendName, setSendName] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  // Edit form state
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')

  const lineItems = (invoice as unknown as { invoice_line_items: InvoiceLineItemRow[] })?.invoice_line_items || []
  const payments = (invoice as unknown as { payments: PaymentRow[] })?.payments || []

  const canEditLineItems = invoice && invoice.status !== 'paid' && (invoice.status as string) !== 'void'

  function openEdit() {
    if (!invoice) return
    setEditStatus(invoice.status)
    setEditDueDate(invoice.due_date)
    setEditNotes(invoice.notes || '')
    setEditTerms(invoice.payment_terms != null ? String(invoice.payment_terms) : '')
    setEditOpen(true)
  }

  function handleSaveEdit() {
    if (!invoice) return
    const data: InvoiceUpdate = {
      status: editStatus as InvoiceUpdate['status'],
      due_date: editDueDate,
      notes: editNotes || null,
      payment_terms: editTerms ? parseInt(editTerms, 10) : null,
    }
    updateInvoice.mutate(
      { id: invoice.id, data },
      { onSuccess: () => setEditOpen(false) }
    )
  }

  function handleDelete() {
    if (!invoice) return
    deleteInvoice.mutate(
      { id: invoice.id, caseId: invoice.case_id },
      { onSuccess: () => router.push('/billing') }
    )
  }

  // --- Line item editing ---

  function startEditingLineItems() {
    setEditableItems(
      lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        time_entry_id: item.time_entry_id,
      }))
    )
    setEditingLineItems(true)
  }

  function cancelEditingLineItems() {
    setEditingLineItems(false)
    setEditableItems([])
  }

  function updateLineItem(index: number, field: 'description' | 'quantity' | 'unit_price', value: string | number) {
    setEditableItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }
      if (field === 'description') {
        item.description = value as string
      } else if (field === 'quantity') {
        item.quantity = Number(value) || 0
        item.amount = item.quantity * item.unit_price
      } else if (field === 'unit_price') {
        item.unit_price = Number(value) || 0
        item.amount = item.quantity * item.unit_price
      }
      updated[index] = item
      return updated
    })
  }

  function deleteLineItem(index: number) {
    setEditableItems((prev) => {
      const updated = [...prev]
      const item = updated[index]
      if (item.id) {
        // Mark existing items as deleted instead of removing
        updated[index] = { ...item, _deleted: true }
      } else {
        // New items can be removed directly
        updated.splice(index, 1)
      }
      return updated
    })
  }

  function addLineItem() {
    setEditableItems((prev) => [
      ...prev,
      {
        id: null,
        description: '',
        quantity: 1,
        unit_price: 0,
        amount: 0,
        time_entry_id: null,
      },
    ])
  }

  const saveLineItems = useCallback(async () => {
    if (!invoice) return
    setSavingLineItems(true)

    try {
      const visibleItems = editableItems.filter((item) => !item._deleted)
      const deletedItems = editableItems.filter((item) => item._deleted && item.id)
      const newItems = editableItems.filter((item) => !item._deleted && !item.id)
      const modifiedItems = editableItems.filter((item) => !item._deleted && item.id)

      // Delete removed items
      for (const item of deletedItems) {
        // If it had a time_entry_id, un-bill the time entry
        if (item.time_entry_id) {
          await supabase
            .from('time_entries')
            .update({ is_billed: false, invoice_id: null })
            .eq('id', item.time_entry_id)
        }
        await supabase
          .from('invoice_line_items')
          .delete()
          .eq('id', item.id!)
      }

      // Update modified items
      for (const item of modifiedItems) {
        await supabase
          .from('invoice_line_items')
          .update({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
          })
          .eq('id', item.id!)
      }

      // Insert new items
      for (const item of newItems) {
        await supabase
          .from('invoice_line_items')
          .insert({
            invoice_id: invoice.id,
            case_id: invoice.case_id,
            activity_type: 'other' as const,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
            line_number: 0,
            is_billed: true,
          })
      }

      // Recalculate invoice totals
      const newSubtotal = visibleItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      const taxRate = invoice.tax_rate || 0
      const taxAmount = newSubtotal * (taxRate / 100)
      const discountAmount = invoice.discount_amount || 0
      const totalAmount = newSubtotal + taxAmount - discountAmount
      const balanceDue = totalAmount - (invoice.amount_paid || 0)

      await supabase
        .from('invoices')
        .update({
          subtotal: newSubtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          balance_due: balanceDue,
        })
        .eq('id', invoice.id)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', invoice.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', invoice.case_id] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })

      toast.success('Line items updated')
      setEditingLineItems(false)
      setEditableItems([])
    } catch (err) {
      console.error('Failed to save line items:', err)
      toast.error('Failed to save line items')
    } finally {
      setSavingLineItems(false)
    }
  }, [invoice, editableItems, queryClient])

  // --- Send Invoice ---

  function openSendDialog() {
    if (!invoice) return
    setSendEmail(invoice.bill_to_email || '')
    setSendName(invoice.bill_to_name || '')
    setSendMessage('')
    setSendOpen(true)
  }

  async function handleSendInvoice() {
    if (!invoice || !sendEmail) return
    setSending(true)

    try {
      // Step 1: Create a shared link for the invoice
      const createRes = await fetch('/api/shared-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          entityType: 'invoice',
          entityId: invoice.id,
          permission: 'view',
          recipientName: sendName || null,
          recipientEmail: sendEmail,
          expiresInDays: 60,
        }),
      })

      if (!createRes.ok) {
        throw new Error('Failed to create shared link')
      }

      const { url: shareUrl } = await createRes.json()

      // Step 2: Send the email
      const emailRes = await fetch('/api/shared-links/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          recipientEmail: sendEmail,
          recipientName: sendName || null,
          shareUrl,
          entityType: 'invoice',
          entityName: invoice.invoice_number,
          permission: 'view',
          senderMessage: sendMessage || null,
        }),
      })

      if (!emailRes.ok) {
        throw new Error('Failed to send email')
      }

      // Step 3: Update invoice status to 'sent' if currently draft
      if (invoice.status === 'draft') {
        await supabase
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_method: 'email',
          })
          .eq('id', invoice.id)

        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        queryClient.invalidateQueries({ queryKey: ['invoices', invoice.id] })
      }

      toast.success(`Invoice sent to ${sendEmail}`)
      setSendOpen(false)
    } catch (err) {
      console.error('Failed to send invoice:', err)
      toast.error('Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Link href="/billing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Billing
        </Link>
        <LoadingSpinner className="py-20" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div>
        <Link href="/billing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Billing
        </Link>
        <p className="text-sm text-muted-foreground py-10 text-center">Invoice not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Link href="/billing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Billing
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
            >
              {invoice.invoice_number}
            </h1>
            <StatusBadge
              label={getLabelForValue(INVOICE_STATUSES, invoice.status)}
              color={getColorForValue(INVOICE_STATUSES, invoice.status)}
            />
          </div>
          <p className="text-sm" style={{ color: '#8892A2' }}>{caseData?.case_name || '\u2014'}</p>
        </div>
        <div className="flex items-center gap-2">
          {(invoice.balance_due || 0) > 0 && invoice.status !== 'void' && (
            <Button
              onClick={() => setRecordPaymentOpen(true)}
              style={{ backgroundColor: '#0E1F35' }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch('/api/invoices/export-pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                  body: JSON.stringify({ invoiceId: invoice.id }),
                })
                if (!res.ok) throw new Error('Export failed')
                const blob = await res.blob()
                window.open(URL.createObjectURL(blob), '_blank')
              } catch { toast.error('Failed to generate preview') }
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch('/api/invoices/export-pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                  body: JSON.stringify({ invoiceId: invoice.id }),
                })
                if (!res.ok) throw new Error('Export failed')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${invoice.invoice_number}.pdf`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success('Invoice PDF downloaded')
              } catch { toast.error('Failed to download PDF') }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={openSendDialog}>
            <Mail className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case</label>
                  <div className="mt-2 text-sm">
                    {caseData ? (
                      <Link href={`/cases/${caseData.id}`} className="hover:underline" style={{ color: '#091525' }}>
                        <p className="font-medium">{caseData.case_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{caseData.case_number}</p>
                      </Link>
                    ) : (
                      <p className="text-muted-foreground">\u2014</p>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.invoice_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.due_date)}</p>
                  </div>
                  {invoice.payment_terms != null && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terms</label>
                      <p className="mt-1 text-sm">Net {invoice.payment_terms}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
                  Line Items
                </CardTitle>
                {canEditLineItems && !editingLineItems && (
                  <Button variant="outline" size="sm" onClick={startEditingLineItems}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Line Items
                  </Button>
                )}
                {editingLineItems && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditingLineItems} disabled={savingLineItems}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveLineItems} disabled={savingLineItems}>
                      {savingLineItems ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {editingLineItems ? (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[45%]">Description</TableHead>
                        <TableHead className="text-right w-[15%]">Qty</TableHead>
                        <TableHead className="text-right w-[18%]">Unit Price</TableHead>
                        <TableHead className="text-right w-[15%]">Amount</TableHead>
                        <TableHead className="w-[7%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editableItems
                        .map((item, index) => ({ item, index }))
                        .filter(({ item }) => !item._deleted)
                        .map(({ item, index }) => (
                          <TableRow key={item.id || `new-${index}`}>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                placeholder="Description"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                className="h-8 text-sm text-right"
                                step="0.25"
                                min="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                                className="h-8 text-sm text-right"
                                step="0.01"
                                min="0"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteLineItem(index)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 border-t">
                    <Button variant="outline" size="sm" onClick={addLineItem} className="w-full">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Line Item
                    </Button>
                  </div>
                </div>
              ) : lineItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No line items.</p>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {(invoice.tax_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                    <span className="tabular-nums">{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="tabular-nums" style={{ color: '#10B981' }}>{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Balance Due</span>
                  <span className="tabular-nums" style={{ color: '#F59E0B' }}>
                    {formatCurrency(invoice.balance_due)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium tabular-nums">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.payment_method}{payment.reference_number ? ` - ${payment.reference_number}` : ''}
                        </p>
                      </div>
                      <span className="text-muted-foreground">{formatDate(payment.payment_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Info */}
          {caseData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
                  <FileText className="h-5 w-5" />
                  Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/cases/${caseData.id}`} className="hover:underline" style={{ color: '#091525' }}>
                  <p className="font-medium text-sm">{caseData.case_name}</p>
                </Link>
                <p className="text-xs text-muted-foreground font-mono mt-1">{caseData.case_number}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invoice {invoice.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Payment Terms (days)</Label>
              <Input type="number" value={editTerms} onChange={(e) => setEditTerms(e.target.value)} placeholder="e.g., 30" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteInvoice.isPending}>
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog (mounted only when open, for fresh form state) */}
      {recordPaymentOpen && (
        <RecordPaymentDialog
          invoice={invoice}
          open={recordPaymentOpen}
          onOpenChange={setRecordPaymentOpen}
        />
      )}

      {/* Send Invoice Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg border" style={{ backgroundColor: '#f8fafc' }}>
              <p className="text-sm font-medium" style={{ color: '#091525' }}>{invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {invoice.bill_to_name && <span>{invoice.bill_to_name}</span>}
                {invoice.bill_to_organization && <span> &mdash; {invoice.bill_to_organization}</span>}
              </p>
              <p className="text-sm font-semibold mt-2 tabular-nums" style={{ color: '#0E1F35' }}>
                Balance Due: {formatCurrency(invoice.balance_due)}
              </p>
            </div>

            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="attorney@lawfirm.com"
              />
            </div>
            <div>
              <Label>Recipient Name (optional)</Label>
              <Input
                value={sendName}
                onChange={(e) => setSendName(e.target.value)}
                placeholder="e.g., Sarah Miller"
              />
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={2}
                placeholder="Add a personal note..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
              <Button onClick={handleSendInvoice} disabled={sending || !sendEmail}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
