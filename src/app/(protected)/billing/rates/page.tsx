'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ACTIVITY_TYPES, getLabelForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useBillingRates, useCreateBillingRate, useUpdateBillingRate } from '@/hooks/useBillingRates'
import type { BillingRateRow } from '@/types/database.types'
import { Edit, DollarSign, Plus, Loader2 } from 'lucide-react'

export default function BillingRatesPage() {
  const { data: rates = [], isLoading } = useBillingRates()
  const createMutation = useCreateBillingRate()
  const updateMutation = useUpdateBillingRate()

  // Edit dialog state
  const [editRate, setEditRate] = useState<BillingRateRow | null>(null)
  const [editForm, setEditForm] = useState({
    rate_per_hour: 0,
    effective_date: '',
    end_date: '',
    description: '',
    notes: '',
    is_active: true,
  })

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({
    activity_type: '',
    rate_per_hour: 0,
    description: '',
    effective_date: new Date().toISOString().split('T')[0],
  })

  function openEditDialog(rate: BillingRateRow) {
    setEditRate(rate)
    setEditForm({
      rate_per_hour: rate.rate_per_hour,
      effective_date: rate.effective_date,
      end_date: rate.end_date ?? '',
      description: rate.description,
      notes: rate.notes ?? '',
      is_active: rate.is_active,
    })
  }

  function handleEditSave() {
    if (!editRate) return
    updateMutation.mutate(
      {
        id: editRate.id,
        data: {
          rate_per_hour: editForm.rate_per_hour,
          effective_date: editForm.effective_date,
          end_date: editForm.end_date || null,
          description: editForm.description,
          notes: editForm.notes || null,
          is_active: editForm.is_active,
        },
      },
      {
        onSuccess: () => setEditRate(null),
      }
    )
  }

  function openAddDialog() {
    setAddForm({
      activity_type: '',
      rate_per_hour: 0,
      description: '',
      effective_date: new Date().toISOString().split('T')[0],
    })
    setShowAddDialog(true)
  }

  function handleAddSave() {
    if (!addForm.activity_type || !addForm.rate_per_hour || !addForm.effective_date) return
    createMutation.mutate(
      {
        activity_type: addForm.activity_type,
        rate_per_hour: addForm.rate_per_hour,
        description: addForm.description,
        effective_date: addForm.effective_date,
      },
      {
        onSuccess: () => setShowAddDialog(false),
      }
    )
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Billing Rates"
          description="Configure hourly rates by activity type"
        />
        <LoadingSpinner className="py-20" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Billing Rates"
        description="Configure hourly rates by activity type"
        action={
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Activity Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No billing rates configured yet.</p>
              <p className="text-sm">Click &quot;Add Rate&quot; to create your first rate.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hourly Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium text-sm">
                      {getLabelForValue(ACTIVITY_TYPES, rate.activity_type)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {rate.description || '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(rate.rate_per_hour)}/hr
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rate.effective_date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rate.end_date ? formatDate(rate.end_date) : 'Current'}
                    </TableCell>
                    <TableCell>
                      {rate.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(rate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editRate} onOpenChange={(open) => !open && setEditRate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Rate: {editRate ? getLabelForValue(ACTIVITY_TYPES, editRate.activity_type) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-rate">Hourly Rate ($)</Label>
              <Input
                id="edit-rate"
                type="number"
                value={editForm.rate_per_hour}
                onChange={(e) => setEditForm((f) => ({ ...f, rate_per_hour: parseFloat(e.target.value) || 0 }))}
                step="25"
                min="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-effective">Effective Date</Label>
                <Input
                  id="edit-effective"
                  type="date"
                  value={editForm.effective_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, effective_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-end">End Date</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm((f) => ({ ...f, is_active: checked }))}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditRate(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Rate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Billing Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="add-type">Activity Type</Label>
              <Select
                value={addForm.activity_type}
                onValueChange={(value) => setAddForm((f) => ({ ...f, activity_type: value }))}
              >
                <SelectTrigger id="add-type" className="w-full">
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((at) => (
                    <SelectItem key={at.value} value={at.value}>
                      {at.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-description">Description</Label>
              <Input
                id="add-description"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g., Standard record review rate"
              />
            </div>
            <div>
              <Label htmlFor="add-rate">Hourly Rate ($)</Label>
              <Input
                id="add-rate"
                type="number"
                value={addForm.rate_per_hour || ''}
                onChange={(e) => setAddForm((f) => ({ ...f, rate_per_hour: parseFloat(e.target.value) || 0 }))}
                step="25"
                min="0"
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="add-effective">Effective Date</Label>
              <Input
                id="add-effective"
                type="date"
                value={addForm.effective_date}
                onChange={(e) => setAddForm((f) => ({ ...f, effective_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSave}
                disabled={createMutation.isPending || !addForm.activity_type || !addForm.rate_per_hour || !addForm.effective_date}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
