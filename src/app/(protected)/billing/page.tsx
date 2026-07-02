'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { useInvoices, useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useCases } from '@/hooks/useCases'
import {
  useInvoiceTemplates,
  useCreateInvoiceTemplate,
  useUpdateInvoiceTemplate,
  useDeleteInvoiceTemplate,
} from '@/hooks/useInvoiceTemplates'
import { INVOICE_STATUSES, ACTIVITY_TYPES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import type { InvoiceRow, InvoiceUpdate, InvoiceTemplateRow } from '@/types/database.types'
import {
  DollarSign,
  Receipt,
  CreditCard,
  Pencil,
  Trash2,
  Plus,
  FileText,
  Star,
  Download,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('invoices')
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceRow | null>(null)
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState<InvoiceRow | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Template management state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<InvoiceTemplateRow | null>(null)
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<InvoiceTemplateRow | null>(null)

  // Template form state
  const [tplName, setTplName] = useState('')
  const [tplDescription, setTplDescription] = useState('')
  const [tplPaymentTerms, setTplPaymentTerms] = useState('30')
  const [tplPaymentInstructions, setTplPaymentInstructions] = useState('')
  const [tplNotes, setTplNotes] = useState('')
  const [tplTaxRate, setTplTaxRate] = useState('')
  const [tplHeaderText, setTplHeaderText] = useState('')
  const [tplFooterText, setTplFooterText] = useState('')
  const [tplIsDefault, setTplIsDefault] = useState(false)

  // Data queries
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices()
  const { data: timeEntries = [], isLoading: timeLoading } = useTimeEntries()
  const { data: cases = [] } = useCases()
  const { data: templates = [], isLoading: templatesLoading } = useInvoiceTemplates()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()
  const createTemplate = useCreateInvoiceTemplate()
  const updateTemplate = useUpdateInvoiceTemplate()
  const deleteTemplate = useDeleteInvoiceTemplate()

  // Case name lookup
  const caseNames: Record<string, string> = {}
  cases.forEach((c) => {
    caseNames[c.id] = c.case_name
  })

  // Stats
  const totalOutstanding = invoices
    .filter((i) => ['sent', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const thisMonthInvoices = invoices.filter((i) => i.invoice_date >= startOfMonth)
  const totalInvoicedThisMonth = thisMonthInvoices.reduce(
    (sum, i) => sum + (i.total_amount || 0),
    0
  )
  const totalCollectedThisMonth = thisMonthInvoices.reduce(
    (sum, i) => sum + (i.amount_paid || 0),
    0
  )

  const stats = [
    {
      title: 'Total Outstanding',
      value: formatCurrency(totalOutstanding),
      icon: DollarSign,
      color: '#F59E0B',
    },
    {
      title: 'Invoiced This Month',
      value: formatCurrency(totalInvoicedThisMonth),
      icon: Receipt,
      color: '#091525',
    },
    {
      title: 'Collected This Month',
      value: formatCurrency(totalCollectedThisMonth),
      icon: CreditCard,
      color: '#10B981',
    },
  ]

  const isLoading = invoicesLoading || timeLoading

  // -----------------------------------------------------------------------
  // Invoice Edit handlers
  // -----------------------------------------------------------------------
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')

  function openEditDialog(invoice: InvoiceRow) {
    setEditInvoice(invoice)
    setEditStatus(invoice.status)
    setEditDueDate(invoice.due_date)
    setEditNotes(invoice.notes || '')
    setEditTerms(invoice.payment_terms != null ? String(invoice.payment_terms) : '')
  }

  function handleSaveEdit() {
    if (!editInvoice) return
    const data: InvoiceUpdate = {
      status: editStatus as InvoiceUpdate['status'],
      due_date: editDueDate,
      notes: editNotes || null,
      payment_terms: editTerms ? parseInt(editTerms, 10) : null,
    }
    updateInvoice.mutate(
      { id: editInvoice.id, data },
      { onSuccess: () => setEditInvoice(null) }
    )
  }

  function handleDelete() {
    if (!deleteConfirm) return
    deleteInvoice.mutate(
      { id: deleteConfirm.id, caseId: deleteConfirm.case_id },
      { onSuccess: () => setDeleteConfirm(null) }
    )
  }

  // -----------------------------------------------------------------------
  // PDF Export
  // -----------------------------------------------------------------------
  async function exportPDF(invoiceId: string, preview: boolean) {
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
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setExportingId(null)
    }
  }

  // -----------------------------------------------------------------------
  // Template handlers
  // -----------------------------------------------------------------------
  function resetTemplateForm() {
    setTplName('')
    setTplDescription('')
    setTplPaymentTerms('30')
    setTplPaymentInstructions('')
    setTplNotes('')
    setTplTaxRate('')
    setTplHeaderText('')
    setTplFooterText('')
    setTplIsDefault(false)
  }

  function openNewTemplate() {
    resetTemplateForm()
    setEditTemplate(null)
    setTemplateDialogOpen(true)
  }

  function openEditTemplate(tpl: InvoiceTemplateRow) {
    setEditTemplate(tpl)
    setTplName(tpl.template_name)
    setTplDescription(tpl.description || '')
    setTplPaymentTerms(String(tpl.default_payment_terms))
    setTplPaymentInstructions(tpl.payment_instructions || '')
    setTplNotes(tpl.default_notes || '')
    setTplTaxRate(tpl.default_tax_rate != null ? String(tpl.default_tax_rate) : '')
    setTplHeaderText(tpl.header_text || '')
    setTplFooterText(tpl.footer_text || '')
    setTplIsDefault(tpl.is_default)
    setTemplateDialogOpen(true)
  }

  function handleSaveTemplate() {
    if (!tplName.trim()) {
      toast.error('Template name is required')
      return
    }

    const payload = {
      template_name: tplName.trim(),
      description: tplDescription || null,
      default_payment_terms: parseInt(tplPaymentTerms) || 30,
      payment_instructions: tplPaymentInstructions || null,
      default_notes: tplNotes || null,
      default_tax_rate: tplTaxRate ? parseFloat(tplTaxRate) : null,
      header_text: tplHeaderText || null,
      footer_text: tplFooterText || null,
      is_default: tplIsDefault,
    }

    if (editTemplate) {
      updateTemplate.mutate(
        { id: editTemplate.id, data: payload },
        {
          onSuccess: () => {
            setTemplateDialogOpen(false)
            resetTemplateForm()
            setEditTemplate(null)
          },
        }
      )
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => {
          setTemplateDialogOpen(false)
          resetTemplateForm()
        },
      })
    }
  }

  function handleDeleteTemplate() {
    if (!deleteTemplateConfirm) return
    deleteTemplate.mutate(deleteTemplateConfirm.id, {
      onSuccess: () => setDeleteTemplateConfirm(null),
    })
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Billing"
          description="Manage invoices, time entries, and billing rates"
        />
        <LoadingSpinner className="py-20" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage invoices, time entries, and billing rates"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="time-entries">
            Time Entries ({timeEntries.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Invoice Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* INVOICES TAB */}
        {/* ============================================================== */}
        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices"
              description="Create an invoice from a case's billing tab."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <StatusBadge
                            label={getLabelForValue(INVOICE_STATUSES, invoice.status)}
                            color={getColorForValue(INVOICE_STATUSES, invoice.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/billing/invoices/${invoice.id}`}
                            className="font-mono text-sm hover:underline"
                            style={{ color: '#091525' }}
                          >
                            {invoice.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {caseNames[invoice.case_id] || '\u2014'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          <span
                            style={{
                              color: invoice.balance_due > 0 ? '#F59E0B' : '#10B981',
                            }}
                          >
                            {formatCurrency(invoice.balance_due)}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`text-sm ${
                            invoice.status === 'overdue'
                              ? 'text-red-600 font-medium'
                              : ''
                          }`}
                        >
                          {formatDate(invoice.due_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportPDF(invoice.id, true)}
                              disabled={exportingId === invoice.id}
                              title="Preview PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportPDF(invoice.id, false)}
                              disabled={exportingId === invoice.id}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {(invoice.balance_due || 0) > 0 && invoice.status !== 'void' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRecordPaymentInvoice(invoice)}
                                title="Record payment"
                                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(invoice)}
                              title="Edit invoice"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(invoice)}
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
        </TabsContent>

        {/* ============================================================== */}
        {/* TIME ENTRIES TAB */}
        {/* ============================================================== */}
        <TabsContent value="time-entries" className="mt-4">
          {timeEntries.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No time entries"
              description="Log time from a case's billing tab."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Billed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {caseNames[entry.case_id] || '\u2014'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatDuration(entry.duration_hours)}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* INVOICE TEMPLATES TAB */}
        {/* ============================================================== */}
        <TabsContent value="templates" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
              >
                Invoice Templates
              </h3>
              <p className="text-sm text-muted-foreground">
                Create reusable templates for consistent invoicing
              </p>
            </div>
            <Button onClick={openNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          {templatesLoading ? (
            <LoadingSpinner className="py-10" />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoice templates"
              description="Create a template to pre-fill invoice defaults like payment terms and instructions."
              action={
                <Button onClick={openNewTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="relative">
                  {tpl.is_default && (
                    <div
                      className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#DFC06A20', color: '#DFC06A' }}
                    >
                      <Star className="h-3 w-3" />
                      Default
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle
                      className="text-base"
                      style={{ fontFamily: 'Georgia, serif', color: '#091525' }}
                    >
                      {tpl.template_name}
                    </CardTitle>
                    {tpl.description && (
                      <p className="text-sm text-muted-foreground">{tpl.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Terms</span>
                        <span className="font-medium">
                          Net {tpl.default_payment_terms}
                        </span>
                      </div>
                      {tpl.default_tax_rate != null && tpl.default_tax_rate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Default Tax Rate</span>
                          <span className="font-medium">{tpl.default_tax_rate}%</span>
                        </div>
                      )}
                      {tpl.payment_instructions && (
                        <div>
                          <span className="text-muted-foreground text-xs">
                            Payment Instructions
                          </span>
                          <p className="text-xs mt-0.5 line-clamp-2">
                            {tpl.payment_instructions}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTemplate(tpl)}
                        className="flex-1"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTemplateConfirm(tpl)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* TEMPLATE CREATE / EDIT DIALOG */}
      {/* ================================================================ */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateDialogOpen(false)
            setEditTemplate(null)
            resetTemplateForm()
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTemplate ? 'Edit Invoice Template' : 'New Invoice Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g., Standard Expert Invoice"
              />
            </div>
            <div>
              <Label htmlFor="tpl-description">Description</Label>
              <Textarea
                id="tpl-description"
                value={tplDescription}
                onChange={(e) => setTplDescription(e.target.value)}
                rows={2}
                placeholder="Optional description of this template"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tpl-terms">Payment Terms (days)</Label>
                <Input
                  id="tpl-terms"
                  type="number"
                  value={tplPaymentTerms}
                  onChange={(e) => setTplPaymentTerms(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="tpl-tax">Default Tax Rate (%)</Label>
                <Input
                  id="tpl-tax"
                  type="number"
                  step="0.01"
                  value={tplTaxRate}
                  onChange={(e) => setTplTaxRate(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tpl-instructions">Payment Instructions</Label>
              <Textarea
                id="tpl-instructions"
                value={tplPaymentInstructions}
                onChange={(e) => setTplPaymentInstructions(e.target.value)}
                rows={2}
                placeholder="Please make checks payable to Mark Ettinger, M.D."
              />
            </div>
            <div>
              <Label htmlFor="tpl-notes">Default Notes</Label>
              <Textarea
                id="tpl-notes"
                value={tplNotes}
                onChange={(e) => setTplNotes(e.target.value)}
                rows={2}
                placeholder="Notes that appear on every invoice using this template"
              />
            </div>
            <div>
              <Label htmlFor="tpl-header">Header Text</Label>
              <Input
                id="tpl-header"
                value={tplHeaderText}
                onChange={(e) => setTplHeaderText(e.target.value)}
                placeholder="Custom header text for PDF"
              />
            </div>
            <div>
              <Label htmlFor="tpl-footer">Footer Text</Label>
              <Input
                id="tpl-footer"
                value={tplFooterText}
                onChange={(e) => setTplFooterText(e.target.value)}
                placeholder="Custom footer text for PDF"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tpl-default"
                type="checkbox"
                checked={tplIsDefault}
                onChange={(e) => setTplIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="tpl-default" className="cursor-pointer">
                Set as default template
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateDialogOpen(false)
                  setEditTemplate(null)
                  resetTemplateForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending
                  ? 'Saving...'
                  : editTemplate
                    ? 'Update Template'
                    : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* DELETE TEMPLATE CONFIRMATION */}
      {/* ================================================================ */}
      <Dialog
        open={!!deleteTemplateConfirm}
        onOpenChange={(open) => !open && setDeleteTemplateConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete template{' '}
              <strong>{deleteTemplateConfirm?.template_name}</strong>? Existing invoices
              using this template will not be affected.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTemplateConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* EDIT INVOICE DIALOG */}
      {/* ================================================================ */}
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
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger id="edit-status">
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
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-terms">Payment Terms (days)</Label>
              <Input
                id="edit-terms"
                type="number"
                value={editTerms}
                onChange={(e) => setEditTerms(e.target.value)}
                placeholder="e.g., 30"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditInvoice(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* DELETE INVOICE CONFIRMATION */}
      {/* ================================================================ */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete invoice{' '}
              <strong>{deleteConfirm?.invoice_number}</strong>? This action cannot be
              undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      {recordPaymentInvoice && (
        <RecordPaymentDialog
          invoice={recordPaymentInvoice}
          open={!!recordPaymentInvoice}
          onOpenChange={(open) => !open && setRecordPaymentInvoice(null)}
        />
      )}
    </div>
  )
}
