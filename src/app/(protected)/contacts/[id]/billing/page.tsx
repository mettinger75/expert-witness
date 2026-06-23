'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INVOICE_STATUSES, getLabelForValue, getColorForValue } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import { DollarSign, Receipt, ExternalLink } from 'lucide-react'

export default function ContactBillingPage() {
  const params = useParams()
  const contactId = params.id as string

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', 'contact', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('bill_to_contact_id', contactId)
        .order('invoice_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!contactId,
  })

  if (isLoading) {
    return <LoadingSpinner className="py-12" />
  }

  if (!invoices?.length) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No Invoices"
        description="No invoices have been billed to this contact yet. Create invoices from the case billing page."
      />
    )
  }

  // Calculate summary stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0)
  const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0E1F35' }}>
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#091525' }}>
                  {formatCurrency(totalInvoiced)}
                </p>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#DFC06A' }}>
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: outstandingBalance > 0 ? '#DFC06A' : '#091525' }}>
                  {formatCurrency(outstandingBalance)}
                </p>
                <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices
            <Badge variant="secondary" className="ml-2">{invoices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-10"></TableHead>
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
                    <span className="font-mono text-sm font-medium" style={{ color: '#091525' }}>
                      {invoice.invoice_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-medium ${(invoice.balance_due ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatCurrency(invoice.balance_due)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {invoice.case_id && (
                      <Link
                        href={`/cases/${invoice.case_id}/billing`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
