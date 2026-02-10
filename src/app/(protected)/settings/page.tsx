'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { User, DollarSign, Brain, Save, Plus, Pencil, XCircle, Star } from 'lucide-react'
import { useBillingRates, useCreateBillingRate, useUpdateBillingRate } from '@/hooks/useBillingRates'
import { ACTIVITY_TYPES, getLabelForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { BillingRateRow, BillingRateInsert, BillingRateUpdate } from '@/types/database.types'
import { toast } from 'sonner'

// --------------------------------------------------
// Invoice Settings — localStorage helpers
// --------------------------------------------------
const INVOICE_SETTINGS_KEY = 'ew-invoice-settings'

interface InvoiceSettings {
  invoicePrefix: string
  paymentTerms: string
  invoiceNotes: string
  retainerAmount: string
}

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  invoicePrefix: 'INV',
  paymentTerms: 'net30',
  invoiceNotes: 'Payment due within 30 days of receipt. Thank you for your business.',
  retainerAmount: '5000',
}

function loadInvoiceSettings(): InvoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_INVOICE_SETTINGS
  try {
    const raw = localStorage.getItem(INVOICE_SETTINGS_KEY)
    if (raw) return JSON.parse(raw) as InvoiceSettings
  } catch {
    // ignore parse errors
  }
  return DEFAULT_INVOICE_SETTINGS
}

// --------------------------------------------------
// Billing Rate Dialog form state
// --------------------------------------------------
interface RateFormState {
  activity_type: string
  rate: string
  description: string
  effective_date: string
  is_default: boolean
}

const emptyRateForm = (): RateFormState => ({
  activity_type: '',
  rate: '',
  description: '',
  effective_date: new Date().toISOString().split('T')[0],
  is_default: false,
})

// --------------------------------------------------
// Settings Page
// --------------------------------------------------
export default function SettingsPage() {
  // ----- billing rates data -----
  const { data: billingRates = [], isLoading: ratesLoading } = useBillingRates()
  const createRate = useCreateBillingRate()
  const updateRate = useUpdateBillingRate()

  // ----- add / edit dialog -----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<BillingRateRow | null>(null)
  const [form, setForm] = useState<RateFormState>(emptyRateForm())

  function openAddDialog() {
    setEditingRate(null)
    setForm(emptyRateForm())
    setDialogOpen(true)
  }

  function openEditDialog(rate: BillingRateRow) {
    setEditingRate(rate)
    setForm({
      activity_type: rate.activity_type,
      rate: String(rate.rate),
      description: rate.description ?? '',
      effective_date: rate.effective_date,
      is_default: rate.is_default,
    })
    setDialogOpen(true)
  }

  async function handleSaveRate() {
    if (!form.activity_type) {
      toast.error('Please select an activity type')
      return
    }
    const rateNum = parseFloat(form.rate)
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Please enter a valid rate')
      return
    }

    if (editingRate) {
      // Update existing
      const payload: BillingRateUpdate = {
        activity_type: form.activity_type as BillingRateInsert['activity_type'],
        rate: rateNum,
        description: form.description || null,
        effective_date: form.effective_date,
        is_default: form.is_default,
      }
      updateRate.mutate(
        { id: editingRate.id, data: payload },
        { onSuccess: () => setDialogOpen(false) }
      )
    } else {
      // Create new
      const payload: BillingRateInsert = {
        activity_type: form.activity_type as BillingRateInsert['activity_type'],
        rate: rateNum,
        description: form.description || null,
        effective_date: form.effective_date,
        is_default: form.is_default,
      }
      createRate.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }

  function handleDeactivate(rate: BillingRateRow) {
    const today = new Date().toISOString().split('T')[0]
    updateRate.mutate({ id: rate.id, data: { end_date: today } })
  }

  // ----- invoice settings -----
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS)

  useEffect(() => {
    setInvoiceSettings(loadInvoiceSettings())
  }, [])

  function handleSaveInvoiceSettings() {
    try {
      localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(invoiceSettings))
      toast.success('Invoice settings saved')
    } catch {
      toast.error('Failed to save invoice settings')
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your expert witness practice settings"
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expert Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" defaultValue="Mark" />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" defaultValue="Ettinger" />
                </div>
              </div>
              <div>
                <Label htmlFor="credentials">Credentials</Label>
                <Input id="credentials" defaultValue="MD" placeholder="e.g., MD, DO, PhD" />
              </div>
              <div>
                <Label htmlFor="specialty">Primary Specialty</Label>
                <Input id="specialty" defaultValue="Anesthesiology" />
              </div>
              <div>
                <Label htmlFor="subspecialties">Subspecialties</Label>
                <Input id="subspecialties" placeholder="e.g., Pain Management, Critical Care" />
              </div>
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Brief professional biography for reports..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="practice-name">Practice Name</Label>
                <Input id="practice-name" placeholder="Expert Witness Practice Name" />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6 space-y-6">
          {/* ===== Billing Rates Section ===== */}
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
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead className="text-center">Default</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingRates.map((rate) => {
                        const isActive = !rate.end_date
                        return (
                          <TableRow key={rate.id} className={!isActive ? 'opacity-60' : undefined}>
                            <TableCell className="font-medium">
                              {getLabelForValue(ACTIVITY_TYPES, rate.activity_type)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(rate.rate)}/hr
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {rate.description || '-'}
                            </TableCell>
                            <TableCell>{formatDate(rate.effective_date)}</TableCell>
                            <TableCell className="text-center">
                              {rate.is_default && (
                                <Star className="h-4 w-4 text-[#C9A84C] fill-[#C9A84C] inline-block" />
                              )}
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <StatusBadge label="Active" color="green" />
                              ) : (
                                <StatusBadge label="Inactive" color="gray" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(rate)}
                                  title="Edit rate"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeactivate(rate)}
                                    title="Deactivate rate"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
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

          {/* ===== Add / Edit Rate Dialog ===== */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingRate ? 'Edit Billing Rate' : 'Add Billing Rate'}</DialogTitle>
                <DialogDescription>
                  {editingRate
                    ? 'Update the details for this billing rate.'
                    : 'Configure a new billing rate for an activity type.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="dialog-activity-type">Activity Type</Label>
                  <Select
                    value={form.activity_type}
                    onValueChange={(v) => setForm((p) => ({ ...p, activity_type: v }))}
                  >
                    <SelectTrigger id="dialog-activity-type">
                      <SelectValue placeholder="Select activity type" />
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

                <div>
                  <Label htmlFor="dialog-rate">Rate ($/hr)</Label>
                  <Input
                    id="dialog-rate"
                    type="number"
                    min="0"
                    step="25"
                    placeholder="e.g. 500"
                    value={form.rate}
                    onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="dialog-description">Description (optional)</Label>
                  <Input
                    id="dialog-description"
                    placeholder="e.g. Standard record review rate"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="dialog-effective-date">Effective Date</Label>
                  <Input
                    id="dialog-effective-date"
                    type="date"
                    value={form.effective_date}
                    onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dialog-is-default"
                    checked={form.is_default}
                    onCheckedChange={(checked) =>
                      setForm((p) => ({ ...p, is_default: checked === true }))
                    }
                  />
                  <Label htmlFor="dialog-is-default" className="cursor-pointer">
                    Set as default rate for this activity type
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveRate}
                  disabled={createRate.isPending || updateRate.isPending}
                >
                  {(createRate.isPending || updateRate.isPending) ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ===== Invoice Settings Section ===== */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
                <Input
                  id="invoice-prefix"
                  value={invoiceSettings.invoicePrefix}
                  onChange={(e) =>
                    setInvoiceSettings((p) => ({ ...p, invoicePrefix: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="payment-terms">Default Payment Terms</Label>
                <Select
                  value={invoiceSettings.paymentTerms}
                  onValueChange={(v) =>
                    setInvoiceSettings((p) => ({ ...p, paymentTerms: v }))
                  }
                >
                  <SelectTrigger id="payment-terms">
                    <SelectValue />
                  </SelectTrigger>
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
                <Label htmlFor="invoice-notes">Default Invoice Notes</Label>
                <Textarea
                  id="invoice-notes"
                  rows={3}
                  value={invoiceSettings.invoiceNotes}
                  onChange={(e) =>
                    setInvoiceSettings((p) => ({ ...p, invoiceNotes: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="retainer-amount">Default Retainer Amount</Label>
                <Input
                  id="retainer-amount"
                  type="number"
                  value={invoiceSettings.retainerAmount}
                  onChange={(e) =>
                    setInvoiceSettings((p) => ({ ...p, retainerAmount: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveInvoiceSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save Invoice Settings
            </Button>
          </div>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your API key is encrypted and stored securely.
                </p>
              </div>
              <div>
                <Label htmlFor="default-model">Default Model</Label>
                <Select defaultValue="claude-sonnet-4">
                  <SelectTrigger id="default-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5 (Fast)</SelectItem>
                    <SelectItem value="claude-sonnet-4">Claude Sonnet 4 (Standard)</SelectItem>
                    <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5 (Advanced)</SelectItem>
                    <SelectItem value="claude-opus-4-5">Claude Opus 4.5 (Research)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  defaultValue="0.3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower values produce more focused, deterministic output. Recommended: 0.2-0.4 for medical-legal work.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-summarize uploaded documents</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically generate AI summaries when documents are uploaded.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-generate timeline entries</Label>
                  <p className="text-xs text-muted-foreground">
                    Extract timeline events from uploaded medical records.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Include citations in AI responses</Label>
                  <p className="text-xs text-muted-foreground">
                    AI will reference specific documents and page numbers in responses.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save AI Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
