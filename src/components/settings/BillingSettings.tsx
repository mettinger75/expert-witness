'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { OptionListManager } from '@/components/settings/OptionListManager'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { Plus, Pencil, XCircle, Star, Save, Loader2 } from 'lucide-react'
import { useBillingRates, useCreateBillingRate, useUpdateBillingRate } from '@/hooks/useBillingRates'
import { ACTIVITY_TYPES, getLabelForValue, OPTION_KEYS, type OptionItem } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { BillingRateRow, BillingRateInsert, BillingRateUpdate } from '@/types/database.types'
import { toast } from 'sonner'

interface RateFormState {
  activity_type: string
  rate_per_hour: string
  flat_fee: string
  daily_rate: string
  description: string
  effective_date: string
  is_active: boolean
}

const emptyRateForm = (): RateFormState => ({
  activity_type: '',
  rate_per_hour: '',
  flat_fee: '',
  daily_rate: '',
  description: '',
  effective_date: new Date().toISOString().split('T')[0],
  is_active: true,
})

export function BillingSettings() {
  const { getOptions, refresh } = useAppOptions()
  const { data: billingRates = [], isLoading: ratesLoading } = useBillingRates()
  const createRate = useCreateBillingRate()
  const updateRate = useUpdateBillingRate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<BillingRateRow | null>(null)
  const [form, setForm] = useState<RateFormState>(emptyRateForm())

  // Invoice settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [paymentTerms, setPaymentTerms] = useState('net30')
  const [invoiceNotes, setInvoiceNotes] = useState('Payment due within 30 days of receipt. Thank you for your business.')
  const [retainerAmount, setRetainerAmount] = useState('5000')
  const [savingInvoice, setSavingInvoice] = useState(false)

  useEffect(() => {
    fetch('/api/settings/options')
      .then((r) => r.json())
      .then((data) => {
        const inv = data['options.invoice_settings']
        if (inv) {
          if (inv.invoicePrefix) setInvoicePrefix(inv.invoicePrefix)
          if (inv.paymentTerms) setPaymentTerms(inv.paymentTerms)
          if (inv.invoiceNotes) setInvoiceNotes(inv.invoiceNotes)
          if (inv.retainerAmount) setRetainerAmount(inv.retainerAmount)
        }
      })
      .catch(() => {})
  }, [])

  function openAddDialog() {
    setEditingRate(null)
    setForm(emptyRateForm())
    setDialogOpen(true)
  }

  function openEditDialog(rate: BillingRateRow) {
    setEditingRate(rate)
    setForm({
      activity_type: rate.activity_type,
      rate_per_hour: String(rate.rate_per_hour),
      flat_fee: rate.flat_fee != null ? String(rate.flat_fee) : '',
      daily_rate: rate.daily_rate != null ? String(rate.daily_rate) : '',
      description: rate.description ?? '',
      effective_date: rate.effective_date,
      is_active: rate.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSaveRate() {
    if (!form.activity_type) { toast.error('Please select an activity type'); return }
    const rateNum = parseFloat(form.rate_per_hour)
    if (isNaN(rateNum) || rateNum <= 0) { toast.error('Please enter a valid hourly rate'); return }

    const flatFeeNum = form.flat_fee ? parseFloat(form.flat_fee) : null
    const dailyRateNum = form.daily_rate ? parseFloat(form.daily_rate) : null

    if (editingRate) {
      const payload: BillingRateUpdate = {
        activity_type: form.activity_type as BillingRateInsert['activity_type'],
        rate_per_hour: rateNum,
        flat_fee: flatFeeNum,
        daily_rate: dailyRateNum,
        description: form.description || '',
        effective_date: form.effective_date,
        is_active: form.is_active,
      }
      updateRate.mutate({ id: editingRate.id, data: payload }, { onSuccess: () => setDialogOpen(false) })
    } else {
      const payload: BillingRateInsert = {
        activity_type: form.activity_type as BillingRateInsert['activity_type'],
        rate_per_hour: rateNum,
        flat_fee: flatFeeNum,
        daily_rate: dailyRateNum,
        description: form.description || '',
        effective_date: form.effective_date,
        is_active: form.is_active,
      }
      createRate.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  function handleDeactivate(rate: BillingRateRow) {
    const today = new Date().toISOString().split('T')[0]
    updateRate.mutate({ id: rate.id, data: { end_date: today } })
  }

  async function handleSaveInvoiceSettings() {
    setSavingInvoice(true)
    try {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'options.invoice_settings',
          options: { invoicePrefix, paymentTerms, invoiceNotes, retainerAmount } as unknown as OptionItem[],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Invoice settings saved')
    } catch {
      toast.error('Failed to save invoice settings')
    } finally {
      setSavingInvoice(false)
    }
  }

  const handleOptionSave = useCallback(
    async (settingKey: string, options: OptionItem[]) => {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingKey, options }),
      })
      if (!res.ok) throw new Error('Failed to save')
      await refresh()
    },
    [refresh]
  )

  return (
    <div className="space-y-6">
      {/* Billing Rates Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Billing Rates</CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          {ratesLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading billing rates...</p>
          ) : billingRates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No billing rates configured yet. Click &quot;Add Rate&quot; to get started.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Type</TableHead>
                    <TableHead className="text-right">Rate/Hr</TableHead>
                    <TableHead className="text-right">Flat Fee</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingRates.map((rate) => {
                    const isActive = !rate.end_date
                    return (
                      <TableRow key={rate.id} className={!isActive ? 'opacity-60' : undefined}>
                        <TableCell className="font-medium">{getLabelForValue(ACTIVITY_TYPES, rate.activity_type)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(rate.rate_per_hour)}/hr</TableCell>
                        <TableCell className="text-right font-mono">{rate.flat_fee != null ? formatCurrency(rate.flat_fee) : <span className="text-gray-300">—</span>}</TableCell>
                        <TableCell className="text-right font-mono">{rate.daily_rate != null ? `${formatCurrency(rate.daily_rate)}/day` : <span className="text-gray-300">—</span>}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{rate.description || '-'}</TableCell>
                        <TableCell>{formatDate(rate.effective_date)}</TableCell>
                        <TableCell className="text-center">
                          {rate.is_active && <Star className="h-4 w-4 text-[#DFC06A] fill-[#DFC06A] inline-block" />}
                        </TableCell>
                        <TableCell>
                          {isActive ? <StatusBadge label="Active" color="green" /> : <StatusBadge label="Inactive" color="gray" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(rate)} title="Edit rate">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isActive && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeactivate(rate)} title="Deactivate rate" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Billing Rate' : 'Add Billing Rate'}</DialogTitle>
            <DialogDescription>
              {editingRate ? 'Update the details for this billing rate.' : 'Configure a new billing rate for an activity type.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Activity Type</Label>
              <Select value={form.activity_type} onValueChange={(v) => setForm((p) => ({ ...p, activity_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select activity type" /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hourly Rate ($/hr)</Label>
              <Input type="number" min="0" step="25" placeholder="e.g. 500" value={form.rate_per_hour} onChange={(e) => setForm((p) => ({ ...p, rate_per_hour: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Flat Fee ($)</Label>
                <Input type="number" min="0" step="50" placeholder="Optional" value={form.flat_fee} onChange={(e) => setForm((p) => ({ ...p, flat_fee: e.target.value }))} />
              </div>
              <div>
                <Label>Daily Rate ($/day)</Label>
                <Input type="number" min="0" step="50" placeholder="Optional" value={form.daily_rate} onChange={(e) => setForm((p) => ({ ...p, daily_rate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Standard record review rate" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked === true }))} />
              <Label className="cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRate} disabled={createRate.isPending || updateRate.isPending}>
              {(createRate.isPending || updateRate.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Invoice Number Prefix</Label>
            <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
          </div>
          <div>
            <Label>Default Payment Terms</Label>
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                <SelectItem value="net15">Net 15</SelectItem>
                <SelectItem value="net30">Net 30</SelectItem>
                <SelectItem value="net45">Net 45</SelectItem>
                <SelectItem value="net60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Invoice Notes</Label>
            <Textarea rows={3} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} />
          </div>
          <div>
            <Label>Default Retainer Amount</Label>
            <Input type="number" value={retainerAmount} onChange={(e) => setRetainerAmount(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveInvoiceSettings} disabled={savingInvoice}>
              {savingInvoice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Invoice Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurable Option Lists */}
      <OptionListManager
        settingKey={OPTION_KEYS.ACTIVITY_TYPES}
        title="Activity Types"
        description="Billable activity types for time entries"
        options={getOptions(OPTION_KEYS.ACTIVITY_TYPES)}
        onSave={(opts) => handleOptionSave(OPTION_KEYS.ACTIVITY_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CHARGE_TYPES}
        title="Charge Types"
        description="Non-time line item charge types"
        options={getOptions(OPTION_KEYS.CHARGE_TYPES)}
        onSave={(opts) => handleOptionSave(OPTION_KEYS.CHARGE_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.INVOICE_STATUSES}
        title="Invoice Statuses"
        description="Invoice lifecycle statuses"
        hasColor
        options={getOptions(OPTION_KEYS.INVOICE_STATUSES)}
        onSave={(opts) => handleOptionSave(OPTION_KEYS.INVOICE_STATUSES, opts)}
      />
    </div>
  )
}
