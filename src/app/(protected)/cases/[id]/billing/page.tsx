'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { ACTIVITY_TYPES, getLabelForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import { Plus, DollarSign, Clock, Receipt, CreditCard, Timer } from 'lucide-react'

// Placeholder time entries
const placeholderEntries = [
  { id: '1', date: '2025-08-15', activity_type: 'record_review', description: 'Review of anesthesia records and operative notes', duration_hours: 3.5, rate: 500, amount: 1750 },
  { id: '2', date: '2025-08-18', activity_type: 'research', description: 'Literature review - anesthesia monitoring standards', duration_hours: 2.0, rate: 500, amount: 1000 },
  { id: '3', date: '2025-08-22', activity_type: 'conference', description: 'Conference call with retaining attorney re: case strategy', duration_hours: 1.0, rate: 500, amount: 500 },
  { id: '4', date: '2025-09-01', activity_type: 'report_writing', description: 'Draft preliminary opinion letter', duration_hours: 4.0, rate: 500, amount: 2000 },
  { id: '5', date: '2025-09-10', activity_type: 'deposition_prep', description: 'Deposition preparation - review key documents', duration_hours: 2.5, rate: 500, amount: 1250 },
]

const totalHours = placeholderEntries.reduce((sum, e) => sum + e.duration_hours, 0)
const totalBilled = placeholderEntries.reduce((sum, e) => sum + e.amount, 0)
const totalPaid = 3250
const balanceDue = totalBilled - totalPaid

export default function CaseBillingPage() {
  const params = useParams()
  const caseId = params.id as string
  const [logTimeOpen, setLogTimeOpen] = useState(false)

  const stats = [
    { title: 'Total Hours', value: formatDuration(totalHours), icon: Clock, color: 'text-primary' },
    { title: 'Total Billed', value: formatCurrency(totalBilled), icon: DollarSign, color: 'text-emerald-600' },
    { title: 'Total Paid', value: formatCurrency(totalPaid), icon: CreditCard, color: 'text-green-600' },
    { title: 'Balance Due', value: formatCurrency(balanceDue), icon: Receipt, color: 'text-amber-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">Time entries and invoicing for this case</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
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
                    <Input id="entry-date" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="entry-activity">Activity Type</Label>
                    <Select>
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
                  <Textarea id="entry-description" placeholder="Describe the work performed..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-hours">Hours</Label>
                    <Input id="entry-hours" type="number" step="0.25" placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="entry-rate">Rate ($/hr)</Label>
                    <Input id="entry-rate" type="number" defaultValue="500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setLogTimeOpen(false)}>Cancel</Button>
                  <Button onClick={() => setLogTimeOpen(false)}>Save Entry</Button>
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
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time Entries Table */}
      {placeholderEntries.length === 0 ? (
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Entries</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholderEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                    <TableCell className="text-sm">{getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right text-sm">{formatDuration(entry.duration_hours)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(entry.rate)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={3} className="text-right text-sm">Totals</TableCell>
                  <TableCell className="text-right text-sm">{formatDuration(totalHours)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-sm">{formatCurrency(totalBilled)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
