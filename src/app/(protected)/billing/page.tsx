'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { INVOICE_STATUSES, ACTIVITY_TYPES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate, formatDuration } from '@/lib/formatters'
import { DollarSign, Receipt, CreditCard } from 'lucide-react'

// Placeholder invoices
const placeholderInvoices = [
  { id: '1', invoice_number: 'INV-2025-001', case_name: 'Smith v. General Hospital', status: 'paid', total: 3250, due_date: '2025-09-01', amount_paid: 3250 },
  { id: '2', invoice_number: 'INV-2025-002', case_name: 'Smith v. General Hospital', status: 'sent', total: 3250, due_date: '2025-10-15', amount_paid: 0 },
  { id: '3', invoice_number: 'INV-2025-003', case_name: 'Johnson v. Metro Clinic', status: 'overdue', total: 5000, due_date: '2025-09-15', amount_paid: 0 },
  { id: '4', invoice_number: 'INV-2025-004', case_name: 'Williams v. St. Mary Hospital', status: 'draft', total: 1750, due_date: '2025-11-01', amount_paid: 0 },
]

// Placeholder time entries
const placeholderTimeEntries = [
  { id: '1', case_name: 'Smith v. General Hospital', date: '2025-10-01', activity_type: 'report_writing', description: 'Final report revisions', duration_hours: 2.5, amount: 1250 },
  { id: '2', case_name: 'Johnson v. Metro Clinic', date: '2025-10-02', activity_type: 'record_review', description: 'Review additional records', duration_hours: 3.0, amount: 1500 },
  { id: '3', case_name: 'Williams v. St. Mary Hospital', date: '2025-10-03', activity_type: 'conference', description: 'Attorney conference call', duration_hours: 0.75, amount: 375 },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('invoices')

  const totalOutstanding = placeholderInvoices
    .filter((i) => ['sent', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.total - i.amount_paid), 0)

  const totalInvoicedThisMonth = placeholderInvoices
    .reduce((sum, i) => sum + i.total, 0)

  const totalCollectedThisMonth = placeholderInvoices
    .reduce((sum, i) => sum + i.amount_paid, 0)

  const stats = [
    { title: 'Total Outstanding', value: formatCurrency(totalOutstanding), icon: DollarSign, color: 'text-amber-600' },
    { title: 'Invoiced This Month', value: formatCurrency(totalInvoicedThisMonth), icon: Receipt, color: 'text-primary' },
    { title: 'Collected This Month', value: formatCurrency(totalCollectedThisMonth), icon: CreditCard, color: 'text-emerald-600' },
  ]

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
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <StatusBadge
                          label={getLabelForValue(INVOICE_STATUSES, invoice.status)}
                          color={getColorForValue(INVOICE_STATUSES, invoice.status)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-sm">{invoice.case_name}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className={`text-sm ${invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                        {formatDate(invoice.due_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-entries" className="mt-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderTimeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{formatDate(entry.date)}</TableCell>
                      <TableCell className="text-sm">{entry.case_name}</TableCell>
                      <TableCell className="text-sm">{getLabelForValue(ACTIVITY_TYPES, entry.activity_type)}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-right text-sm">{formatDuration(entry.duration_hours)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(entry.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Type</TableHead>
                    <TableHead className="text-right">Current Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ACTIVITY_TYPES.map((at) => (
                    <TableRow key={at.value}>
                      <TableCell className="text-sm font-medium">{at.label}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(500)}/hr</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Jan 1, 2025</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
