'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCaseTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from '@/hooks/useTimeEntries'
import { useCaseInvoices, useCreateInvoice, useDeleteInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import { ACTIVITY_TYPES, INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import type { InvoiceRow, InvoiceUpdate, InvoiceLineItemRow } from '@/types/database.types'
import type { CaseContactWithContact } from '@/services/caseContacts.service'
import {
  Plus,
  DollarSign,
  Clock,
  Receipt,
  CreditCard,
  Trash2,
  Pencil,
  FileText,
  Download,
  Eye,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Line item for the create-invoice dialog
// ---------------------------------------------------------------------------
interface NewLineItem {
  description: string
  quantity: string
  unit_price: string
}

function emptyLineItem(): NewLineItem {
  return { description: '', quantity: '', unit_price: '' }
}

export default function CaseBillingPage() {
  const params = useParams()
  const caseId = params.id as string

  const { data: timeEntries = [], isLoading: timeLoading } = useCaseTimeEntries(caseId)
  const { data: invoices = [], isLoading: invoicesLoading } = useCaseInvoices(caseId)
  const { data: templates = [] } = useInvoiceTemplates()
  const { data: caseContacts = [] } = useCaseContacts(caseId)
  const createTimeEntry = useCreateTimeEntry()
  const createInvoice = useCreateInvoice()
  const deleteTimeEntry = useDeleteTimeEntry()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  // ----- Dialog state -----
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceRow | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // ----- Log time form state -----
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryActivity, setEntryActivity] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [entryHours, setEntryHours] = useState('')
  const [entryRate, setEntryRate] = useState('500')

  // ----- Create invoice form state -----
  const [invTemplateId, setInvTemplateId] = useState('')
  const [invBillToContactId, setInvBillToContactId] = useState('')
  const [invDueDate, setInvDueDate] = useState('')
  const [invPaymentTerms, setInvPaymentTerms] = useState('30')
  const [invTaxRate, setInvTaxRate] = useState('')
  const [invPaymentInstructions, setInvPaymentInstructions] = useState('')
  const [invNotes, setInvNotes] = useState('')
  const [invLineItems, setInvLineItems] = useState<NewLineItem[]>([emptyLineItem()])

  // ----- Edit invoice form state -----
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Stats
  const totalHours = timeEntries.reduce((sum, e) => sum + e.duration_hours, 0)
  const totalBilled = timeEntries.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0)
  const balanceDue = invoices.reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const stats = [
    { title: 'Total Hours', value: formatDuration(totalHours), icon: Clock, color: '#091525' },
    { title: 'Total Billed', value: formatCurrency(totalBilled), icon: DollarSign, color: '#10B981' },
    { title: 'Total Paid', value: formatCurrency(totalPaid), icon: CreditCard, color: '#059669' },
    { title: 'Balance Due', value: formatCurrency(balanceDue), icon: Receipt, color: '#F59E0B' },
  ]

  // -----------------------------------------------------------------------
  // Handlers: Log Time
  // -----------------------------------------------------------------------
  function handleLogTime() {
    if (!entryActivity || !entryDescription || !entryHours) {
      toast.error('Please fill in all required fields')
      return
    }
    const hours = parseFloat(entryHours)
    const rate = parseFloat(entryRate)
    if (isNaN(hours) || isNaN(rate)) {
      toast.error('Hours and rate must be valid numbers')
      return
    }
    createTimeEntry.mutate(
      {
        case_id: caseId,
        activity_type: entryActivity as 'record_review',
        description: entryDescription,
        date: entryDate,
        duration_hours: hours,
        rate_per_hour: rate,
        amount: hours * rate,
        is_billable: true,
      },
      {
        onSuccess: () => {
          setLogTimeOpen(false)
          setEntryActivity('')
          setEntryDescription('')
          setEntryHours('')
          setEntryRate('500')
          setEntryDate(new Date().toISOString().split('T')[0])
        },
      }
    )
  }

  // -----------------------------------------------------------------------
  // Handlers: Create Invoice
  // -----------------------------------------------------------------------
  function handleTemplateChange(templateId: string) {
    setInvTemplateId(templateId)
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      if (tpl.default_payment_terms) setInvPaymentTerms(String(tpl.default_payment_terms))
      if (tpl.payment_instructions) setInvPaymentInstructions(tpl.payment_instructions)
      if (tpl.default_notes) setInvNotes(tpl.default_notes)
      if (tpl.default_tax_rate) setInvTaxRate(String(tpl.default_tax_rate))
    }
  }

  function handleBillToChange(contactId: string) {
    setInvBillToContactId(contactId)
  }

  function addLineItem() {
    setInvLineItems((prev) => [...prev, emptyLineItem()])
  }

  function removeLineItem(idx: number) {
    setInvLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLineItem(idx: number, field: keyof NewLineItem, value: string) {
    setInvLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  function lineItemAmount(item: NewLineItem): number {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return qty * price
  }

  function computeSubtotal(): number {
    return invLineItems.reduce((sum, item) => sum + lineItemAmount(item), 0)
  }

  function resetCreateInvoiceForm() {
    setInvTemplateId('')
    setInvBillToContactId('')
    setInvDueDate('')
    setInvPaymentTerms('30')
    setInvTaxRate('')
    setInvPaymentInstructions('')
    setInvNotes('')
    setInvLineItems([emptyLineItem()])
  }

  async function handleCreateInvoice() {
    const validItems = invLineItems.filter(
      (i) => i.description && i.quantity && i.unit_price
    )
    if (validItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }

    const subtotal = computeSubtotal()
    const taxRate = parseFloat(invTaxRate) || 0
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount
    const terms = parseInt(invPaymentTerms) || 30

    const dueDate =
      invDueDate ||
      new Date(Date.now() + terms * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const invoiceNumber = `INV-${Date.now()}`

    // Find contact details for bill_to fields
    const selectedCC = caseContacts.find(
      (cc) => cc.contact_id === invBillToContactId
    ) as CaseContactWithContact | undefined
    const selectedContact = selectedCC?.contacts

    createInvoice.mutate(
      {
        case_id: caseId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        subtotal,
        tax_rate: taxRate || null,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        payment_terms: terms,
        payment_instructions: invPaymentInstructions || null,
        notes: invNotes || null,
        template_id: invTemplateId || null,
        bill_to_contact_id: invBillToContactId || null,
        bill_to_name: selectedContact
          ? `${selectedContact.first_name} ${selectedContact.last_name}`
          : null,
        bill_to_organization: selectedContact?.organization ?? null,
        bill_to_email: selectedContact?.email ?? null,
        bill_to_address: selectedContact
          ? [
              selectedContact.address_line1,
              selectedContact.address_line2,
              selectedContact.city &&
              selectedContact.state
                ? `${selectedContact.city}, ${selectedContact.state} ${selectedContact.zip ?? ''}`.trim()
                : null,
            ]
              .filter(Boolean)
              .join(', ')
          : null,
      },
      {
        onSuccess: async (invoice) => {
          // Create line items
          const { supabase } = await import('@/lib/supabase')
          const lineItemsToInsert = validItems.map((item, idx) => ({
            invoice_id: invoice.id,
            line_type: 'time' as const,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            amount: lineItemAmount(item),
            sort_order: idx,
          }))

          const { error: lineError } = await supabase
            .from('invoice_line_items')
            .insert(lineItemsToInsert)

          if (lineError) {
            toast.error(`Invoice created but line items failed: ${lineError.message}`)
          }

          setCreateInvoiceOpen(false)
          resetCreateInvoiceForm()
        },
      }
    )
  }

  // -----------------------------------------------------------------------
  // Handlers: Edit Invoice
  // -----------------------------------------------------------------------
  function openEditInvoice(inv: InvoiceRow) {
    setEditInvoice(inv)
    setEditStatus(inv.status)
    setEditDueDate(inv.due_date)
    setEditNotes(inv.notes || '')
  }

  function handleSaveInvoice() {
    if (!editInvoice) return
    const data: InvoiceUpdate = {
      status: editStatus as InvoiceUpdate['status'],
      due_date: editDueDate,
      notes: editNotes || null,
    }
    updateInvoice.mutate(
      { id: editInvoice.id, data },
      { onSuccess: () => setEditInvoice(null) }
    )
  }

  function handleDeleteInvoice() {
    if (!deleteConfirm) return
    deleteInvoice.mutate(
      { id: deleteConfirm.id, caseId: deleteConfirm.case_id },
      { onSuccess: () => setDeleteConfirm(null) }
    )
  }

  // -----------------------------------------------------------------------
  // Handlers: PDF Export & Preview
  // -----------------------------------------------------------------------
  const exportPDF = useCallback(async (invoiceId: string, preview: boolean) => {
    setExportingId(invoiceId)
    try {
      const response = await fetch('/api/invoices/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (preview) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Invoice PDF downloaded')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setExportingId(null)
    }
  }, [])

  if (timeLoading || invoicesLoading) {
    return <LoadingSpinner className="py-20" />
  }

  const subtotal = computeSubtotal()
  const taxRate = parseFloat(invTaxRate) || 0
  const taxAmount = subtotal * (taxRate / 100)
  const invoiceTotal = subtotal + taxAmount

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
          >
            Billing
          </h2>
          <p className="text-sm" style={{ color: '#8892A2' }}>
            Time entries and invoicing for this case
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="text-sm font-medium hover:underline"
            style={{ color: '#C9A84C' }}
          >
            View Full Billing Dashboard &rarr;
          </Link>

          {/* Create Invoice Button */}
          <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-4">
                {/* Template + Bill To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inv-template">Invoice Template</Label>
                    <Select value={invTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger id="inv-template">
                        <SelectValue placeholder="Select template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.template_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="inv-bill-to">Bill To Contact</Label>
                    <Select value={invBillToContactId} onValueChange={handleBillToChange}>
                      <SelectTrigger id="inv-bill-to">
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {caseContacts.map((cc) => {
                          const c = (cc as CaseContactWithContact).contacts
                          return (
                            <SelectItem key={cc.contact_id} value={cc.contact_id}>
                              {c.first_name} {c.last_name}
                              {c.organization ? ` (${c.organization})` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date + Payment Terms + Tax */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="inv-due-date">Due Date</Label>
                    <Input
                      id="inv-due-date"
                      type="date"
                      value={invDueDate}
                      onChange={(e) => setInvDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-terms">Payment Terms (days)</Label>
                    <Input
                      id="inv-terms"
                      type="number"
                      value={invPaymentTerms}
                      onChange={(e) => setInvPaymentTerms(e.target.value)}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inv-tax">Tax Rate (%)</Label>
                    <Input
                      id="inv-tax"
                      type="number"
                      step="0.01"
                      value={invTaxRate}
                      onChange={(e) => setInvTaxRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Line Items</Label>
                    <Button variant="ghost" size="sm" onClick={addLineItem}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                      <span>Description</span>
                      <span className="text-right">Qty (hrs)</span>
                      <span className="text-right">Unit Price</span>
                      <span className="text-right">Amount</span>
                      <span />
                    </div>
                    {invLineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center"
                      >
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        />
                        <Input
                          type="number"
                          step="0.25"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="text-right"
                        />
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)}
                          className="text-right"
                        />
                        <div className="text-right text-sm font-medium tabular-nums pr-1">
                          {formatCurrency(lineItemAmount(item))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(idx)}
                          disabled={invLineItems.length === 1}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-3 flex justify-end">
                    <div className="w-[240px] space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                          <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div
                        className="flex justify-between pt-1 border-t font-semibold"
                        style={{ borderColor: '#C9A84C' }}
                      >
                        <span>Total</span>
                        <span className="tabular-nums">{formatCurrency(invoiceTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions + Notes */}
                <div>
                  <Label htmlFor="inv-instructions">Payment Instructions</Label>
                  <Textarea
                    id="inv-instructions"
                    rows={2}
                    value={invPaymentInstructions}
                    onChange={(e) => setInvPaymentInstructions(e.target.value)}
                    placeholder="Please make checks payable to Mark Ettinger, M.D."
                  />
                </div>
                <div>
                  <Label htmlFor="inv-notes">Notes</Label>
                  <Textarea
                    id="inv-notes"
                    rows={2}
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    placeholder="Optional notes for the invoice"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateInvoiceOpen(false)
                      resetCreateInvoiceForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending}>
                    {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Log Time Button */}
          <Dialog open={logTimeOpen} onOpenChange={setLogTimeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Log Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-date">Date</Label>
                    <Input
                      id="entry-date"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry-activity">Activity Type</Label>
                    <Select value={entryActivity} onValueChange={setEntryActivity}>
                      <SelectTrigger id="entry-activity">
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="entry-description">Description</Label>
                  <Textarea
                    id="entry-description"
                    placeholder="Describe the work performed..."
                    rows={3}
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-hours">Hours</Label>
                    <Input
                      id="entry-hours"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={entryHours}
                      onChange={(e) => setEntryHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry-rate">Rate ($/hr)</Label>
                    <Input
                      id="entry-rate"
                      type="number"
                      value={entryRate}
                      onChange={(e) => setEntryRate(e.target.value)}
                    />
                  </div>
                </div>
                {entryHours && entryRate && (
                  <p className="text-sm text-muted-foreground text-right">
                    Total:{' '}
                    {formatCurrency(
                      parseFloat(entryHours || '0') * parseFloat(entryRate || '0')
                    )}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setLogTimeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLogTime} disabled={createTimeEntry.isPending}>
                    {createTimeEntry.isPending ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time Entries Table */}
      {timeEntries.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No time entries"
          description="Log your time to start tracking billable hours."
          action={
            <Button onClick={() => setLogTimeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          }
        />
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle
              className="text-lg"
              style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
            >
              Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                    <TableCell className="text-sm">
                      {getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatDuration(entry.duration_hours)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(entry.rate_per_hour)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={entry.is_billed ? 'Billed' : 'Unbilled'}
                        color={entry.is_billed ? 'green' : 'yellow'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTimeEntry.mutate({ id: entry.id, caseId })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={3} className="text-right text-sm">
                    Totals
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatDuration(totalHours)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(totalBilled)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoices Section */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg"
              style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
            >
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <StatusBadge
                        label={getLabelForValue(INVOICE_STATUSES, inv.status)}
                        color={getColorForValue(INVOICE_STATUSES, inv.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/billing/invoices/${inv.id}`}
                        className="font-mono text-sm hover:underline"
                        style={{ color: '#091525' }}
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <span
                        style={{ color: inv.balance_due > 0 ? '#F59E0B' : '#10B981' }}
                      >
                        {formatCurrency(inv.balance_due)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPDF(inv.id, true)}
                          disabled={exportingId === inv.id}
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPDF(inv.id, false)}
                          disabled={exportingId === inv.id}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditInvoice(inv)}
                          title="Edit invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(inv)}
                          title="Delete invoice"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Invoice Dialog */}
      <Dialog
        open={!!editInvoice}
        onOpenChange={(open) => !open && setEditInvoice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invoice {editInvoice?.invoice_number}</DialogTitle>
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
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditInvoice(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInvoice} disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete invoice{' '}
            <strong>{deleteConfirm?.invoice_number}</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
