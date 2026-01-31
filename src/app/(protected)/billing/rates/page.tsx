'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ACTIVITY_TYPES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Edit, DollarSign } from 'lucide-react'

// Placeholder billing rates
const placeholderRates = ACTIVITY_TYPES.map((at, index) => ({
  id: String(index + 1),
  activity_type: at.value,
  label: at.label,
  rate: at.value === 'deposition' || at.value === 'trial' ? 750 : at.value === 'travel' ? 250 : 500,
  effective_date: '2025-01-01',
  end_date: null as string | null,
}))

export default function BillingRatesPage() {
  const [editRate, setEditRate] = useState<typeof placeholderRates[0] | null>(null)

  return (
    <div>
      <PageHeader
        title="Billing Rates"
        description="Configure hourly rates by activity type"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Activity Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Type</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium text-sm">{rate.label}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(rate.rate)}/hr</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(rate.effective_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rate.end_date ? formatDate(rate.end_date) : 'Current'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditRate(rate)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editRate} onOpenChange={(open) => !open && setEditRate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Rate: {editRate?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-rate">Hourly Rate ($)</Label>
              <Input
                id="edit-rate"
                type="number"
                defaultValue={editRate?.rate}
                step="25"
              />
            </div>
            <div>
              <Label htmlFor="edit-effective">Effective Date</Label>
              <Input
                id="edit-effective"
                type="date"
                defaultValue={editRate?.effective_date}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditRate(null)}>Cancel</Button>
              <Button onClick={() => setEditRate(null)}>Save Rate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
