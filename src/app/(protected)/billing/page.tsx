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
import { useInvoices, useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useCases } from '@/hooks/useCases'
import { INVOICE_STATUSES, ACTIVITY_TYPES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import type { InvoiceRow, InvoiceUpdate } from '@/types/database.types'
import { DollarSign, Receipt, CreditCard, Pencil, Trash2 } from 'lucide-react'

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('invoices')
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceRow | null>(null)

  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices()
  const { data: timeEntries = [], isLoading: timeLoading } = useTimeEntries()
  const { data: cases = [] } = useCases()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  // Build a case name lookup
  const caseNames: Record<string, string> = {}
  cases.forEach((c) => { caseNames[c.id] = c.case_name })

  const totalOutstanding = invoices
    .filter((i) => ['sent', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due || 0), 0)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const thisMonthInvoices = invoices.filter((i) => i.issue_date >= startOfMonth)
  const totalInvoicedThisMonth = thisMonthInvoices.reduce((sum, i) => sum + (i.total || 0), 0)
  const totalCollectedThisMonth = thisMonthInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0)

  const stats = [
    { title: 'Total Outstanding', value: formatCurrency(totalOutstanding), icon: DollarSign, color: '#F59E0B' },
    { title: 'Invoiced This Month', value: formatCurrency(totalInvoicedThisMonth), icon: Receipt, color: '#091525' },
    { title: 'Collected This Month', value: formatCurrency(totalCollectedThisMonth), icon: CreditCard, color: '#10B981' },
  ]

  const isLoading = invoicesLoading || timeLoading

  // Edit form state
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')

  function openEditDialog(invoice: InvoiceRow) {
    setEditInvoice(invoice)
    setEditStatus(invoice.status)
    setEditDueDate(invoice.due_date)
    setEditNotes(invoice.notes || '')
    setEditTerms(invoice.terms || '')
  }

  function handleSaveEdit() {
    if (!editInvoice) return
    const data: InvoiceUpdate = {
      status: editStatus as InvoiceUpdate['status'],
      due_date: editDueDate,
      notes: editNotes || null,
      terms: editTerms || null,
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

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Billing" description="Manage invoices, time entries, and billing rates" />
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
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
          <TabsTrigger value="time-entries">Time Entries ({timeEntries.length})</TabsTrigger>
        </TabsList>

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
                        <TableCell className="text-sm">{caseNames[invoice.case_id] || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          <span style={{ color: invoice.balance_due > 0 ? '#F59E0B' : '#10B981' }}>
                            {formatCurrency(invoice.balance_due)}
                          </span>
                        </TableCell>
                        <TableCell className={`text-sm ${invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(invoice.due_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
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
                        <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                        <TableCell className="text-sm">{caseNames[entry.case_id] || '—'}</TableCell>
                        <TableCell className="text-sm">{getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{entry.description}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatDuration(entry.duration_hours)}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{formatCurrency(entry.amount)}</TableCell>
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
      </Tabs>

      {/* Edit Invoice Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={(open) => !open && setEditInvoice(null)}>
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
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
              <Label htmlFor="edit-terms">Terms</Label>
              <Input
                id="edit-terms"
                value={editTerms}
                onChange={(e) => setEditTerms(e.target.value)}
                placeholder="e.g., Net 30"
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
              <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete invoice <strong>{deleteConfirm?.invoice_number}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
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
    </div>
  )
}
