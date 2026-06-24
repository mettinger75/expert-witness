'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  activity_type: string
  line_number: number
}

interface InvoiceViewProps {
  invoice: {
    id: string
    invoice_number: string
    invoice_date: string
    due_date: string
    payment_terms: number | null
    status: string
    subtotal: number
    tax_rate: number | null
    tax_amount: number
    discount_amount: number
    total_amount: number
    amount_paid: number
    balance_due: number
    bill_to_name: string | null
    bill_to_organization: string | null
    bill_to_address: string | null
    bill_to_email: string | null
    payment_instructions: string | null
    notes: string | null
  }
  lineItems: InvoiceLineItem[]
  token: string
}

function fmtCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function InvoiceView({ invoice, lineItems, token }: InvoiceViewProps) {
  const sortedItems = [...lineItems].sort((a, b) => a.line_number - b.line_number)
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')
  const [isProcessing, setIsProcessing] = useState(false)

  const canPay = invoice.balance_due > 0 && invoice.status !== 'paid' && !paymentStatus

  async function handlePayOnline() {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout')
      window.location.href = data.url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed')
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', maxWidth: '800px', margin: '0 auto' }}>
      {/* Invoice Header */}
      <div
        style={{
          backgroundColor: '#0E1F35',
          color: '#ffffff',
          padding: '32px 40px',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '2px' }}>
            INVOICE
          </h1>
          <p style={{ color: '#DFC06A', fontSize: '14px', marginTop: '8px', fontWeight: 600 }}>
            {invoice.invoice_number}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Mark Ettinger, M.D.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Anesthesiology Expert Witness
          </p>
        </div>
      </div>

      {/* Gold accent line */}
      <div style={{ backgroundColor: '#DFC06A', height: '3px' }} />

      {/* Invoice Body */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '32px 40px',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
        }}
      >
        {/* Invoice Details + Bill To */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          {/* Left: Bill To */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Bill To
            </p>
            {invoice.bill_to_name && (
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#0E1F35', margin: '0 0 4px 0' }}>
                {invoice.bill_to_name}
              </p>
            )}
            {invoice.bill_to_organization && (
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 4px 0' }}>
                {invoice.bill_to_organization}
              </p>
            )}
            {invoice.bill_to_address && (
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 4px 0', whiteSpace: 'pre-line' }}>
                {invoice.bill_to_address}
              </p>
            )}
            {invoice.bill_to_email && (
              <p style={{ fontSize: '14px', color: '#475569', margin: '0' }}>
                {invoice.bill_to_email}
              </p>
            )}
          </div>

          {/* Right: Invoice details */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                Invoice Date
              </p>
              <p style={{ fontSize: '14px', color: '#0E1F35', margin: 0 }}>
                {fmtDate(invoice.invoice_date)}
              </p>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                Due Date
              </p>
              <p style={{ fontSize: '14px', color: '#0E1F35', margin: 0, fontWeight: 600 }}>
                {fmtDate(invoice.due_date)}
              </p>
            </div>
            {invoice.payment_terms != null && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                  Payment Terms
                </p>
                <p style={{ fontSize: '14px', color: '#0E1F35', margin: 0 }}>
                  Net {invoice.payment_terms}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: '#0E1F35',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #DFC06A',
                }}
              >
                Description
              </th>
              <th
                style={{
                  backgroundColor: '#0E1F35',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #DFC06A',
                  width: '80px',
                }}
              >
                Qty
              </th>
              <th
                style={{
                  backgroundColor: '#0E1F35',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #DFC06A',
                  width: '120px',
                }}
              >
                Rate
              </th>
              <th
                style={{
                  backgroundColor: '#0E1F35',
                  color: '#ffffff',
                  padding: '10px 16px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #DFC06A',
                  width: '120px',
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => (
              <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
                  {item.description}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '14px', color: '#1e293b', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '14px', color: '#1e293b', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCurrency(item.unit_price)}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '14px', color: '#1e293b', textAlign: 'right', fontWeight: 500, borderBottom: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(invoice.subtotal)}</span>
            </div>

            {(invoice.tax_amount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>Tax ({invoice.tax_rate || 0}%)</span>
                <span style={{ color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(invoice.tax_amount)}</span>
              </div>
            )}

            {(invoice.discount_amount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>Discount</span>
                <span style={{ color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>-{fmtCurrency(invoice.discount_amount)}</span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '15px', fontWeight: 600 }}>
                <span style={{ color: '#0E1F35' }}>Total</span>
                <span style={{ color: '#0E1F35', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(invoice.total_amount)}</span>
              </div>
            </div>

            {(invoice.amount_paid || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ color: '#64748b' }}>Amount Paid</span>
                <span style={{ color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(invoice.amount_paid)}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '2px solid #DFC06A',
                marginTop: '4px',
                paddingTop: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
                <span style={{ color: '#0E1F35' }}>Balance Due</span>
                <span style={{ color: '#DFC06A', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Notes
            </p>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Payment Instructions */}
        {invoice.payment_instructions && (
          <div
            style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              borderLeft: '3px solid #DFC06A',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Payment Instructions
            </p>
            <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
              {invoice.payment_instructions}
            </p>
          </div>
        )}
      </div>

      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '20px 40px',
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#166534', margin: '0 0 4px 0' }}>
            ✓ Payment Successful
          </p>
          <p style={{ fontSize: '14px', color: '#15803d', margin: 0 }}>
            Thank you for your payment. A confirmation will be sent to your email.
          </p>
        </div>
      )}

      {paymentStatus === 'cancelled' && (
        <div
          style={{
            backgroundColor: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '16px 40px',
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
            Payment was cancelled. You can try again using the button below.
          </p>
        </div>
      )}

      {/* Pay Online Button */}
      {canPay && (
        <div style={{ padding: '24px 40px', textAlign: 'center' }}>
          <button
            onClick={handlePayOnline}
            disabled={isProcessing}
            style={{
              backgroundColor: '#0E1F35',
              color: '#DFC06A',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 48px',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: '1px',
              cursor: isProcessing ? 'wait' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              transition: 'opacity 0.2s',
              width: '100%',
              maxWidth: '400px',
            }}
          >
            {isProcessing ? 'Redirecting to Payment...' : `Pay Online — ${fmtCurrency(invoice.balance_due)}`}
          </button>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Secure payment powered by Stripe. Card and ACH bank transfer accepted.
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          padding: '20px 40px',
          borderRadius: '0 0 8px 8px',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>
          Mark Ettinger, M.D. &mdash; Anesthesiology Expert Witness
        </p>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          Expert Witness Practice Manager &bull; markettingermd.com
        </p>
      </div>
    </div>
  )
}
