'use client'

import { useState } from 'react'
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
import { useCaseInvoices, useDeleteInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { ACTIVITY_TYPES, INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import type { InvoiceRow, InvoiceUpdate } from '@/types/database.types'
import { Plus, DollarSign, Clock, Receipt, CreditCard, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

export default function CaseBillingPage() {
  const params = useParams()
  const caseId = params.id as string

  const { data: timeEntries = [], isLoading: timeLoading } = useCaseTimeEntries(caseId)
  const { data: invoices = [], isLoading: invoicesLoading } = useCaseInvoices(caseId)
  const createTimeEntry = useCreateTimeEntry()
  const deleteTimeEntry = useDeleteTimeEntry()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceRow | null>(null)

  // Log time form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [entryActivity, setEntryActivity] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [entryHours, setEntryHours] = useState('')
  const [entryRate, setEntryRate] = useState('500')

  // Edit invoice form state
  const [editStatus, setEditStatus] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

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
        rate: rate,
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

  if (timeLoading || invoicesLoading) {
    return <LoadingSpinner className="py-20" />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
            Billing
          </h2>
          <p className="text-sm" style={{ color: '#8892A2' }}>Time entries and invoicing for this case</p>
        </div>
        <div className="flex items-center gap-2">
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
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                    Total: {formatCurrency(parseFloat(entryHours || '0') * parseFloat(entryRate || '0'))}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setLogTimeOpen(false)}>Cancel</Button>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
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
            <CardTitle className="text-lg" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
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
                    <TableCell className="text-sm">{getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatDuration(entry.duration_hours)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{formatCurrency(entry.amount)}</TableCell>
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
                  <TableCell colSpan={3} className="text-right text-sm">Totals</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatDuration(totalHours)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(totalBilled)}</TableCell>
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
            <CardTitle className="text-lg" style={{ fontFamily: 'Georgia, serif', color: '#091525' }}>
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
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <span style={{ color: inv.balance_due > 0 ? '#F59E0B' : '#10B981' }}>
                        {formatCurrency(inv.balance_due)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
      <Dialog open={!!editInvoice} onOpenChange={(open) => !open && setEditInvoice(null)}>
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
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
              <Button onClick={handleSaveInvoice} disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete invoice <strong>{deleteConfirm?.invoice_number}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteInvoice} disabled={deleteInvoice.isPending}>
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
