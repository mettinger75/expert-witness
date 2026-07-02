'use client'

import { useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ChargeForm } from '@/components/billing/ChargeForm'
import { SendInvoiceDialog } from '@/components/billing/SendInvoiceDialog'
import {
  useCaseTimeEntries,
  useUnbilledTime,
  useCreateTimeEntry,
  useDeleteTimeEntry,
} from '@/hooks/useTimeEntries'
import {
  useCaseInvoices,
  useDeleteInvoice,
  useUpdateInvoice,
  useGenerateInvoice,
  useAddToInvoice,
} from '@/hooks/useInvoices'
import { useUnbilledCharges, useDeleteCharge } from '@/hooks/useCharges'
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates'
import { useCaseContacts } from '@/hooks/useCaseContacts'
import {
  ACTIVITY_TYPES,
  INVOICE_STATUSES,
  CHARGE_TYPES,
  getLabelForValue,
  getColorForValue,
} from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import type { InvoiceRow } from '@/types/database.types'
import type { InvoiceLineItemRow } from '@/types/database.types'
import type { CaseContactWithContact } from '@/services/caseContacts.service'
import {
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  FileText,
  Trash2,
  Pencil,
  Download,
  Eye,
  Mail,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

// ---------------------------------------------------------------------------
// Unified unbilled item type for the combined table
// ---------------------------------------------------------------------------
interface UnbilledItem {
  id: string
  kind: 'time' | 'charge'
  date: string
  type: string
  typeBadgeColor: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export default function CaseBillingPage() {
  const params = useParams()
  const caseId = params.id as string

  // ---- Data hooks ----
  const { data: allTimeEntries = [], isLoading: timeLoading } = useCaseTimeEntries(caseId)
  const { data: unbilledTimeEntries = [] } = useUnbilledTime(caseId)
  const { data: unbilledCharges = [] } = useUnbilledCharges(caseId)
  const { data: invoices = [], isLoading: invoicesLoading } = useCaseInvoices(caseId)
  const { data: templates = [] } = useInvoiceTemplates()
  const { data: caseContacts = [] } = useCaseContacts(caseId)

  // ---- Mutations ----
  const createTimeEntry = useCreateTimeEntry()
  const deleteTimeEntry = useDeleteTimeEntry()
  const deleteCharge = useDeleteCharge()
  const deleteInvoice = useDeleteInvoice()
  const updateInvoice = useUpdateInvoice()
  const generateInvoice = useGenerateInvoice()
  const addToInvoice = useAddToInvoice()

  // ---- Dialog state ----
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false)
  const [addToExistingOpen, setAddToExistingOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceRow | null>(null)
  const [sendInvoice, setSendInvoice] = useState<InvoiceRow | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // ---- Log time form state ----
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryActivity, setEntryActivity] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [entryHours, setEntryHours] = useState('')
  const [entryRate, setEntryRate] = useState('500')
  const [entryBillable, setEntryBillable] = useState(true)

  // ---- Create invoice form state ----
  const [invTemplateId, setInvTemplateId] = useState('')
  const [invBillToContactId, setInvBillToContactId] = useState('')
  const [invDueDate, setInvDueDate] = useState('')
  const [invPaymentTerms, setInvPaymentTerms] = useState('30')
  const [invTaxRate, setInvTaxRate] = useState('')
  const [invPaymentInstructions, setInvPaymentInstructions] = useState('')
  const [invNotes, setInvNotes] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  // ---- Edit invoice form state ----
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // =======================================================================
  // Computed: stats
  // =======================================================================
  const totalHours = allTimeEntries.reduce((sum, e) => sum + e.duration_hours, 0)
  const totalBilled = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0)
  const balanceDue = invoices.reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const stats = [
    { title: 'Total Hours', value: formatDuration(totalHours), icon: Clock, bgColor: '#0E1F35', iconColor: '#DFC06A' },
    { title: 'Total Billed', value: formatCurrency(totalBilled), icon: DollarSign, bgColor: '#0E1F35', iconColor: '#DFC06A' },
    { title: 'Total Paid', value: formatCurrency(totalPaid), icon: CreditCard, bgColor: '#059669', iconColor: '#ffffff' },
    { title: 'Balance Due', value: formatCurrency(balanceDue), icon: Receipt, bgColor: '#DFC06A', iconColor: '#0E1F35' },
  ]

  // =======================================================================
  // Computed: unified unbilled items list
  // =======================================================================
  const unbilledItems: UnbilledItem[] = useMemo(() => {
    const items: UnbilledItem[] = []

    for (const te of unbilledTimeEntries) {
      items.push({
        id: te.id,
        kind: 'time',
        date: te.date,
        type: 'Time',
        typeBadgeColor: 'blue',
        description: te.description,
        quantity: te.duration_hours,
        rate: te.rate_per_hour,
        amount: te.amount,
      })
    }

    for (const ch of unbilledCharges) {
      items.push({
        id: ch.id,
        kind: 'charge',
        date: ch.created_at?.split('T')[0] ?? '',
        type: getLabelForValue(CHARGE_TYPES, ch.activity_type),
        typeBadgeColor: 'amber',
        description: ch.description,
        quantity: ch.quantity,
        rate: ch.unit_price,
        amount: ch.amount,
      })
    }

    // Sort by date descending
    items.sort((a, b) => (b.date > a.date ? 1 : a.date > b.date ? -1 : 0))
    return items
  }, [unbilledTimeEntries, unbilledCharges])

  const totalUnbilled = unbilledItems.reduce((sum, i) => sum + i.amount, 0)

  // =======================================================================
  // Handlers: Log Time
  // =======================================================================
  function resetLogTimeForm() {
    setEntryActivity('')
    setEntryDescription('')
    setEntryHours('')
    setEntryRate('500')
    setEntryBillable(true)
    setEntryDate(new Date().toISOString().split('T')[0])
  }

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
        is_billable: entryBillable,
      },
      {
        onSuccess: () => {
          setLogTimeOpen(false)
          resetLogTimeForm()
        },
      }
    )
  }

  // =======================================================================
  // Handlers: Create Invoice
  // =======================================================================
  function handleCreateInvoiceClick() {
    if (unbilledItems.length === 0) {
      toast.error('No unbilled items to invoice')
      return
    }

    // Check for existing unpaid invoices
    const unpaidInvoice = invoices.find(
      (inv) => inv.status !== 'paid' && (inv.status as string) !== 'void'
    )
    if (unpaidInvoice) {
      setAddToExistingOpen(true)
      return
    }

    openCreateInvoiceDialog()
  }

  function openCreateInvoiceDialog() {
    setAddToExistingOpen(false)
    // Pre-select all unbilled items
    setSelectedItemIds(new Set(unbilledItems.map((i) => i.id)))
    setCreateInvoiceOpen(true)
  }

  function handleAddToExisting() {
    const unpaidInvoice = invoices.find(
      (inv) => inv.status !== 'paid' && (inv.status as string) !== 'void'
    )
    if (!unpaidInvoice) return

    const timeIds = unbilledItems.filter((i) => i.kind === 'time').map((i) => i.id)
    const chargeIds = unbilledItems.filter((i) => i.kind === 'charge').map((i) => i.id)

    addToInvoice.mutate(
      {
        invoiceId: unpaidInvoice.id,
        timeEntryIds: timeIds,
        chargeIds: chargeIds,
      },
      {
        onSuccess: () => {
          setAddToExistingOpen(false)
        },
      }
    )
  }

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

  function toggleItemSelection(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAllItems(checked: boolean) {
    if (checked) {
      setSelectedItemIds(new Set(unbilledItems.map((i) => i.id)))
    } else {
      setSelectedItemIds(new Set())
    }
  }

  const selectedItems = unbilledItems.filter((i) => selectedItemIds.has(i.id))
  const invSubtotal = selectedItems.reduce((sum, i) => sum + i.amount, 0)
  const invTaxRateNum = parseFloat(invTaxRate) || 0
  const invTaxAmount = invSubtotal * (invTaxRateNum / 100)
  const invTotal = invSubtotal + invTaxAmount

  function resetCreateInvoiceForm() {
    // Auto-apply default template
    const defaultTpl = templates.find((t) => t.is_default)
    if (defaultTpl) {
      setInvTemplateId(defaultTpl.id)
      if (defaultTpl.default_payment_terms) setInvPaymentTerms(String(defaultTpl.default_payment_terms))
      if (defaultTpl.payment_instructions) setInvPaymentInstructions(defaultTpl.payment_instructions)
      if (defaultTpl.default_notes) setInvNotes(defaultTpl.default_notes)
      if (defaultTpl.default_tax_rate) setInvTaxRate(String(defaultTpl.default_tax_rate))
    } else {
      setInvTemplateId('')
      setInvPaymentTerms('30')
      setInvTaxRate('')
      setInvPaymentInstructions('')
      setInvNotes('')
    }
    setInvBillToContactId('')
    setInvDueDate('')
    setSelectedItemIds(new Set())
  }

  function handleCreateInvoice() {
    if (selectedItemIds.size === 0) {
      toast.error('Please select at least one item')
      return
    }

    const timeEntryIds = selectedItems
      .filter((i) => i.kind === 'time')
      .map((i) => i.id)
    const chargeIds = selectedItems
      .filter((i) => i.kind === 'charge')
      .map((i) => i.id)

    // Find contact details
    const selectedCC = caseContacts.find(
      (cc) => cc.contact_id === invBillToContactId
    ) as CaseContactWithContact | undefined
    const selectedContact = selectedCC?.contacts

    const terms = parseInt(invPaymentTerms) || 30
    const dueDate =
      invDueDate ||
      new Date(Date.now() + terms * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

    generateInvoice.mutate(
      {
        caseId,
        timeEntryIds,
        chargeIds,
        billToContactId: invBillToContactId || undefined,
        billToName: selectedContact
          ? `${selectedContact.first_name} ${selectedContact.last_name}`
          : undefined,
        billToOrganization: selectedContact?.organization_name ?? undefined,
        billToEmail: selectedContact?.email ?? undefined,
        billToAddress: selectedContact
          ? [
              selectedContact.address_street,
              selectedContact.address_city && selectedContact.address_state
                ? `${selectedContact.address_city}, ${selectedContact.address_state} ${selectedContact.address_zip ?? ''}`.trim()
                : null,
            ]
              .filter(Boolean)
              .join(', ')
          : undefined,
        templateId: invTemplateId || undefined,
        dueDate,
        paymentTerms: terms,
        taxRate: invTaxRateNum || undefined,
        paymentInstructions: invPaymentInstructions || undefined,
        notes: invNotes || undefined,
      },
      {
        onSuccess: () => {
          setCreateInvoiceOpen(false)
          resetCreateInvoiceForm()
        },
      }
    )
  }

  // =======================================================================
  // Handlers: Edit Invoice
  // =======================================================================
  function openEditInvoice(inv: InvoiceRow) {
    setEditInvoice(inv)
    setEditStatus(inv.status)
    setEditDueDate(inv.due_date)
    setEditNotes(inv.notes || '')
  }

  function handleSaveInvoice() {
    if (!editInvoice) return
    updateInvoice.mutate(
      {
        id: editInvoice.id,
        data: {
          status: editStatus as InvoiceRow['status'],
          due_date: editDueDate,
          notes: editNotes || null,
        },
      },
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

  // =======================================================================
  // Handlers: PDF Export & Preview
  // =======================================================================
  const exportPDF = useCallback(
    async (invoiceId: string, preview: boolean) => {
      setExportingId(invoiceId)
      try {
        const response = await fetch('/api/invoices/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
        toast.error(
          error instanceof Error ? error.message : 'Failed to export PDF'
        )
      } finally {
        setExportingId(null)
      }
    },
    []
  )

  // =======================================================================
  // Loading
  // =======================================================================
  if (timeLoading || invoicesLoading) {
    return <LoadingSpinner className="py-20" />
  }

  // =======================================================================
  // Render
  // =======================================================================
  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
        >
          Billing
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setLogTimeOpen(true)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Log Time
          </Button>
          <Button
            variant="outline"
            onClick={() => setChargeOpen(true)}
          >
            <Receipt className="h-4 w-4 mr-2" />
            New Charge
          </Button>
          <Button onClick={handleCreateInvoiceClick} style={{ backgroundColor: '#0E1F35' }}>
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div
                className="h-8 w-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" style={{ color: '#0E1F35' }}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---- Unbilled Items Section ---- */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle
              className="text-lg"
              style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
            >
              Unbilled Items
            </CardTitle>
            {unbilledItems.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: '#DFC06A', color: '#0E1F35' }}
              >
                {unbilledItems.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {unbilledItems.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No unbilled items"
              description="Log time or add charges to create unbilled items."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLogTimeOpen(true)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Log Time
                  </Button>
                  <Button variant="outline" onClick={() => setChargeOpen(true)}>
                    <Receipt className="h-4 w-4 mr-2" />
                    New Charge
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unbilledItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.kind === 'time'
                              ? 'border-blue-300 text-blue-700 bg-blue-50'
                              : 'border-amber-300 text-amber-700 bg-amber-50'
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {item.kind === 'time'
                          ? formatDuration(item.quantity)
                          : item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(item.rate)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (item.kind === 'time') {
                              deleteTimeEntry.mutate({ id: item.id, caseId })
                            } else {
                              deleteCharge.mutate(item.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Footer total row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={5} className="text-right text-sm">
                      Total Unbilled
                    </TableCell>
                    <TableCell
                      className="text-right text-sm font-semibold tabular-nums"
                      style={{ color: '#DFC06A' }}
                    >
                      {formatCurrency(totalUnbilled)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---- Invoices Section ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle
              className="text-lg"
              style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
            >
              Invoices
            </CardTitle>
            {invoices.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: '#DFC06A', color: '#0E1F35' }}
              >
                {invoices.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices"
              description="Create an invoice from your unbilled items to get started."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
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
                        style={{ color: '#0E1F35' }}
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(inv.invoice_date)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCurrency(inv.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <span
                        style={{
                          color: inv.balance_due > 0 ? '#F59E0B' : '#10B981',
                        }}
                      >
                        {formatCurrency(inv.balance_due)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(inv.due_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="View invoice"
                        >
                          <Link href={`/billing/invoices/${inv.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSendInvoice(inv)}
                          title="Send invoice"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPDF(inv.id, true)}
                          disabled={exportingId === inv.id}
                          title="Preview invoice"
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
          )}
        </CardContent>
      </Card>

      {/* ==================================================================
          DIALOGS
          ================================================================== */}

      {/* ---- Log Time Dialog ---- */}
      <Dialog open={logTimeOpen} onOpenChange={setLogTimeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
              Log Time Entry
            </DialogTitle>
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="entry-billable"
                checked={entryBillable}
                onCheckedChange={(checked) =>
                  setEntryBillable(checked === true)
                }
              />
              <Label htmlFor="entry-billable" className="text-sm cursor-pointer">
                Billable
              </Label>
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
              <Button
                variant="outline"
                onClick={() => {
                  setLogTimeOpen(false)
                  resetLogTimeForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogTime}
                disabled={createTimeEntry.isPending}
                style={{ backgroundColor: '#0E1F35' }}
              >
                {createTimeEntry.isPending ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- New Charge Dialog ---- */}
      <ChargeForm
        caseId={caseId}
        open={chargeOpen}
        onOpenChange={setChargeOpen}
      />

      {/* ---- Add To Existing Invoice Dialog ---- */}
      <Dialog open={addToExistingOpen} onOpenChange={setAddToExistingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
              Existing Unpaid Invoice
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            There is an unpaid invoice (
            <strong className="font-mono">
              {invoices.find((inv) => inv.status !== 'paid' && (inv.status as string) !== 'void')?.invoice_number}
            </strong>
            ) for this case. Would you like to add these items to it?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={openCreateInvoiceDialog}>
              Create New Invoice
            </Button>
            <Button
              onClick={handleAddToExisting}
              disabled={addToInvoice.isPending}
              style={{ backgroundColor: '#0E1F35' }}
            >
              {addToInvoice.isPending ? 'Adding...' : 'Add to Existing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Create Invoice Dialog ---- */}
      <Dialog
        open={createInvoiceOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateInvoiceForm()
          setCreateInvoiceOpen(open)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
              Create Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Items selection table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Select Items to Invoice</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      unbilledItems.length > 0 &&
                      selectedItemIds.size === unbilledItems.length
                    }
                    onCheckedChange={(checked) => toggleAllItems(checked === true)}
                  />
                  <Label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">
                    Select All
                  </Label>
                </div>
              </div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unbilledItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.kind === 'time'
                                ? 'border-blue-300 text-blue-700 bg-blue-50'
                                : 'border-amber-300 text-amber-700 bg-amber-50'
                            }
                          >
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {item.kind === 'time'
                            ? formatDuration(item.quantity)
                            : item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatCurrency(item.rate)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Bill-To + Template */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inv-bill-to">Bill To Contact</Label>
                <Select
                  value={invBillToContactId}
                  onValueChange={setInvBillToContactId}
                >
                  <SelectTrigger id="inv-bill-to">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseContacts.map((cc) => {
                      const c = (cc as CaseContactWithContact).contacts
                      return (
                        <SelectItem key={cc.contact_id} value={cc.contact_id}>
                          {c.first_name} {c.last_name}
                          {c.organization_name ? ` (${c.organization_name})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inv-template">Invoice Template</Label>
                <Select
                  value={invTemplateId}
                  onValueChange={handleTemplateChange}
                >
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

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-[260px] space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({selectedItemIds.size} items)
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(invSubtotal)}
                  </span>
                </div>
                {invTaxRateNum > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({invTaxRateNum}%)
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(invTaxAmount)}
                    </span>
                  </div>
                )}
                <div
                  className="flex justify-between pt-1 border-t font-semibold"
                  style={{ borderColor: '#DFC06A' }}
                >
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(invTotal)}</span>
                </div>
              </div>
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
              <Button
                onClick={handleCreateInvoice}
                disabled={generateInvoice.isPending || selectedItemIds.size === 0}
                style={{ backgroundColor: '#0E1F35' }}
              >
                {generateInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Invoice Dialog ---- */}
      <Dialog
        open={!!editInvoice}
        onOpenChange={(open) => !open && setEditInvoice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}>
              Edit Invoice {editInvoice?.invoice_number}
            </DialogTitle>
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
              <Button
                onClick={handleSaveInvoice}
                disabled={updateInvoice.isPending}
                style={{ backgroundColor: '#0E1F35' }}
              >
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Invoice Confirmation ---- */}
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
            <strong>{deleteConfirm?.invoice_number}</strong>? This action cannot
            be undone.
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

      {/* ---- Send Invoice Dialog ---- */}
      {sendInvoice && (
        <SendInvoiceDialog
          invoice={sendInvoice}
          open={!!sendInvoice}
          onOpenChange={(open) => !open && setSendInvoice(null)}
        />
      )}
    </div>
  )
}
