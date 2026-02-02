'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { useInvoice, useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { useCase } from '@/hooks/useCases'
import { INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { InvoiceUpdate, InvoiceLineItemRow, PaymentRow } from '@/types/database.types'
import { ArrowLeft, CreditCard, FileText, Pencil, Trash2 } from 'lucide-react'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const caseId = invoice?.case_id || ''
  const { data: caseData } = useCase(caseId)
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Edit form state
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')

  function openEdit() {
    if (!invoice) return
    setEditStatus(invoice.status)
    setEditDueDate(invoice.due_date)
    setEditNotes(invoice.notes || '')
    setEditTerms(invoice.terms || '')
    setEditOpen(true)
  }

  function handleSaveEdit() {
    if (!invoice) return
    const data: InvoiceUpdate = {
      status: editStatus as InvoiceUpdate['status'],
      due_date: editDueDate,
      notes: editNotes || null,
      terms: editTerms || null,
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

  const lineItems = (invoice as unknown as { invoice_line_items: InvoiceLineItemRow[] }).invoice_line_items || []
  const payments = (invoice as unknown as { payments: PaymentRow[] }).payments || []

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
          <p className="text-sm" style={{ color: '#8892A2' }}>{caseData?.case_name || '—'}</p>
        </div>
        <div className="flex items-center gap-2">
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
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.issue_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.due_date)}</p>
                  </div>
                  {invoice.terms && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terms</label>
                      <p className="mt-1 text-sm">{invoice.terms}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
              </CardContent>
            </Card>
          )}

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
                  <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
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
              <Label>Terms</Label>
              <Input value={editTerms} onChange={(e) => setEditTerms(e.target.value)} placeholder="e.g., Net 30" />
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
    </div>
  )
}
