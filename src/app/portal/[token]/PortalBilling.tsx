'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  Receipt,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  CreditCard,
  FileText,
  Download,
} from 'lucide-react'

interface InvoiceLineItem {
  id: string
  activity_type: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

interface PortalInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: string
  bill_to_name: string | null
  bill_to_organization: string | null
  payment_terms: number | null
  payment_instructions: string | null
  notes: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
  invoice_line_items: InvoiceLineItem[]
}

interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string | null
}

interface BillingSummary {
  totalOutstanding: number
  totalPaid: number
  invoiceCount: number
}

interface PortalBillingProps {
  token: string
}

function getStatusConfig(status: string): { label: string; color: string; bg: string; icon: React.ReactNode } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
    case 'partial':
      return { label: 'Partial', color: '#D97706', bg: '#FFFBEB', icon: <Clock className="h-3.5 w-3.5" /> }
    case 'overdue':
      return { label: 'Overdue', color: '#DC2626', bg: '#FEF2F2', icon: <AlertCircle className="h-3.5 w-3.5" /> }
    case 'sent':
      return { label: 'Outstanding', color: '#0E1F35', bg: '#F0F4F8', icon: <Receipt className="h-3.5 w-3.5" /> }
    case 'pending_review':
      return { label: 'Pending Review', color: '#7C3AED', bg: '#F5F3FF', icon: <Clock className="h-3.5 w-3.5" /> }
    case 'approved':
      return { label: 'Approved', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
    default:
      return { label: status, color: '#6B7280', bg: '#F9FAFB', icon: <Receipt className="h-3.5 w-3.5" /> }
  }
}

function fmtQty(qty: number): string {
  if (qty === Math.floor(qty)) return String(qty)
  return qty.toFixed(2)
}

export function PortalBilling({ token }: PortalBillingProps) {
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)

  async function handlePayInvoice(invoiceId: string) {
    setPayingInvoiceId(invoiceId)
    try {
      const res = await fetch(`/api/portal/${token}/invoices/${invoiceId}/checkout`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed')
      setPayingInvoiceId(null)
    }
  }

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch(`/api/portal/${token}/billing`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load billing information')
          return
        }
        const data = await res.json()
        setInvoices(data.invoices)
        setPayments(data.payments)
        setSummary(data.summary)
      } catch {
        setError('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }
    loadBilling()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1F35]" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No invoices available yet.</p>
          <p className="text-xs text-gray-400 mt-1">Invoices will appear here once they are generated and sent.</p>
        </CardContent>
      </Card>
    )
  }

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoice((prev) => (prev === invoiceId ? null : invoiceId))
  }

  const handleDownload = (invoiceId: string, invoiceNumber: string) => {
    const url = `/api/portal/${token}/invoices/${invoiceId}/pdf`
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoiceNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Payment received</p>
            <p className="text-sm text-green-700 mt-0.5">
              Thank you. A confirmation will be emailed to you and the invoice balance will update shortly.
            </p>
          </div>
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Payment cancelled</p>
            <p className="text-sm text-amber-700 mt-0.5">
              No charge was made. You can try again using the Pay Online button below.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-[#0E1F35] mt-1">
                    {formatCurrency(summary.totalOutstanding)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[#DFC06A]/10">
                  <DollarSign className="h-5 w-5 text-[#DFC06A]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {formatCurrency(summary.totalPaid)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Invoices</p>
                  <p className="text-2xl font-bold text-[#0E1F35] mt-1">
                    {summary.invoiceCount}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoices List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-[#0E1F35] flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#DFC06A]" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.map((invoice) => {
            const statusConfig = getStatusConfig(invoice.status)
            const isExpanded = expandedInvoice === invoice.id
            const invoicePayments = payments.filter((p) => p.invoice_id === invoice.id)
            const isOverdue =
              invoice.status !== 'paid' &&
              invoice.due_date &&
              new Date(invoice.due_date) < new Date()

            return (
              <div
                key={invoice.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Invoice Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0E1F35]">
                          {invoice.invoice_number}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                        {isOverdue && invoice.status !== 'overdue' && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Past Due
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Issued: {formatDate(invoice.invoice_date)}</span>
                        <span>Due: {formatDate(invoice.due_date)}</span>
                        {invoice.period_start && (
                          <span>
                            Period: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-[#0E1F35]">{formatCurrency(invoice.total_amount)}</p>
                      {invoice.balance_due > 0 && invoice.balance_due !== invoice.total_amount && (
                        <p className="text-xs text-amber-600 font-medium">
                          {formatCurrency(invoice.balance_due)} due
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#0E1F35]/20 text-[#0E1F35] hover:bg-[#0E1F35]/5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(invoice.id, invoice.invoice_number)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      PDF
                    </Button>
                    {invoice.balance_due > 0 && invoice.status !== 'paid' && (
                      <Button
                        size="sm"
                        className="bg-[#0E1F35] text-[#DFC06A] hover:bg-[#0E1F35]/90"
                        disabled={payingInvoiceId === invoice.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePayInvoice(invoice.id)
                        }}
                      >
                        {payingInvoiceId === invoice.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-1.5" />
                            Pay Online
                          </>
                        )}
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50/50">
                    {/* Line Items */}
                    <div className="px-5 py-4">
                      <h4 className="text-sm font-semibold text-[#0E1F35] mb-3">Line Items</h4>
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#0E1F35]/5">
                              <TableHead className="text-[#0E1F35] font-semibold">Description</TableHead>
                              <TableHead className="text-[#0E1F35] font-semibold text-right">Qty</TableHead>
                              <TableHead className="text-[#0E1F35] font-semibold text-right">Rate</TableHead>
                              <TableHead className="text-[#0E1F35] font-semibold text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.invoice_line_items
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">{item.description}</TableCell>
                                  <TableCell className="text-sm text-right">{fmtQty(item.quantity)}</TableCell>
                                  <TableCell className="text-sm text-right">{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell className="text-sm text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Totals */}
                      <div className="flex justify-end mt-3">
                        <div className="w-64 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                          </div>
                          {(invoice.tax_rate ?? 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                              <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm border-t pt-1.5">
                            <span className="font-semibold text-[#0E1F35]">Total</span>
                            <span className="font-bold text-[#0E1F35]">{formatCurrency(invoice.total_amount)}</span>
                          </div>
                          {invoice.amount_paid > 0 && (
                            <>
                              <div className="flex justify-between text-sm text-green-700">
                                <span>Paid</span>
                                <span className="font-medium">-{formatCurrency(invoice.amount_paid)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t pt-1.5">
                                <span className="font-semibold text-amber-700">Balance Due</span>
                                <span className="font-bold text-amber-700">{formatCurrency(invoice.balance_due)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment History */}
                    {invoicePayments.length > 0 && (
                      <div className="px-5 py-4 border-t">
                        <h4 className="text-sm font-semibold text-[#0E1F35] mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-green-600" />
                          Payment History
                        </h4>
                        <div className="space-y-2">
                          {invoicePayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {payment.payment_method}
                                    {payment.reference_number && ` - Ref: ${payment.reference_number}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(payment.payment_date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Instructions */}
                    {invoice.payment_instructions && invoice.balance_due > 0 && (
                      <div className="px-5 py-4 border-t">
                        <h4 className="text-sm font-semibold text-[#0E1F35] mb-2">Payment Instructions</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.payment_instructions}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {invoice.notes && (
                      <div className="px-5 py-4 border-t">
                        <h4 className="text-sm font-semibold text-[#0E1F35] mb-2">Notes</h4>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
