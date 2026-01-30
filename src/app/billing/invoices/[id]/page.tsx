'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ArrowLeft, Download, CreditCard, FileText } from 'lucide-react'

// Placeholder invoice data
const placeholderInvoice = {
  id: '1',
  invoice_number: 'INV-2025-002',
  status: 'sent',
  issue_date: '2025-10-01',
  due_date: '2025-10-15',
  case_name: 'Smith v. General Hospital',
  case_number: 'EW-2025-0042',
  bill_to: {
    name: 'John Mitchell, Esq.',
    organization: 'Mitchell & Associates Law Firm',
    address: '123 Legal Ave, Suite 400',
    city_state: 'Chicago, IL 60601',
    email: 'jmitchell@mitchelllaw.com',
  },
  line_items: [
    { id: '1', description: 'Record Review - Anesthesia records and operative notes (8/15)', quantity: 3.5, unit_price: 500, amount: 1750 },
    { id: '2', description: 'Research - Monitoring standards literature review (8/18)', quantity: 2.0, unit_price: 500, amount: 1000 },
    { id: '3', description: 'Conference call with retaining attorney (8/22)', quantity: 1.0, unit_price: 500, amount: 500 },
  ],
  subtotal: 3250,
  tax_rate: null,
  tax_amount: 0,
  total: 3250,
  amount_paid: 0,
  balance_due: 3250,
  terms: 'Net 30',
  notes: 'Payment due within 30 days of receipt. Thank you for your business.',
  payments: [] as { id: string; date: string; amount: number; method: string; reference: string }[],
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const invoiceId = params.id as string

  const invoice = placeholderInvoice

  return (
    <div>
      <Link href="/billing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Billing
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
            <StatusBadge
              label={getLabelForValue(INVOICE_STATUSES, invoice.status)}
              color={getColorForValue(INVOICE_STATUSES, invoice.status)}
            />
          </div>
          <p className="text-sm text-muted-foreground">{invoice.case_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bill To</label>
                  <div className="mt-2 space-y-0.5 text-sm">
                    <p className="font-medium">{invoice.bill_to.name}</p>
                    <p>{invoice.bill_to.organization}</p>
                    <p>{invoice.bill_to.address}</p>
                    <p>{invoice.bill_to.city_state}</p>
                    <p className="text-muted-foreground">{invoice.bill_to.email}</p>
                  </div>
                </div>
                <div className="text-right space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.issue_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                    <p className="mt-1 text-sm">{formatDate(invoice.due_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terms</label>
                    <p className="mt-1 text-sm">{invoice.terms}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.line_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-emerald-600">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Balance Due</span>
                  <span className="text-amber-600">{formatCurrency(invoice.balance_due)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">{payment.method} - {payment.reference}</p>
                      </div>
                      <span className="text-muted-foreground">{formatDate(payment.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-sm">{invoice.case_name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{invoice.case_number}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
