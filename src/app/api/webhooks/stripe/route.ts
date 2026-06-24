import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { notifyMark, escapeHtml } from '@/lib/notify-mark'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const invoiceId = session.metadata?.invoice_id
    const caseId = session.metadata?.case_id
    const invoiceNumber = session.metadata?.invoice_number

    if (!invoiceId) {
      console.error('Stripe webhook: no invoice_id in session metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = getSupabaseAdmin()

    // Determine payment method
    let paymentMethod = 'credit_card'
    if (session.payment_method_types?.includes('us_bank_account')) {
      // Check if the actual method used was ACH
      try {
        const paymentIntent = await getStripe().paymentIntents.retrieve(
          session.payment_intent as string,
          { expand: ['payment_method'] }
        )
        const pm = paymentIntent.payment_method as Stripe.PaymentMethod
        if (pm?.type === 'us_bank_account') {
          paymentMethod = 'ach'
        }
      } catch {
        // Default to credit_card if we can't determine
      }
    }

    // Record payment
    const amountPaid = (session.amount_total ?? 0) / 100 // Convert from cents

    const { error: paymentErr } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        case_id: caseId,
        payment_date: new Date().toISOString().split('T')[0],
        amount: amountPaid,
        payment_method: paymentMethod,
        reference_number: session.payment_intent as string,
        status: 'received',
        notes: `Online payment via Stripe Checkout (${invoiceNumber}). Session: ${session.id}`,
        received_from: session.customer_details?.name || session.customer_details?.email || 'Stripe Checkout',
      })

    if (paymentErr) {
      console.error('Failed to record payment:', paymentErr)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    // Update invoice balance
    const { data: invoice } = await supabase
      .from('invoices')
      .select('amount_paid, total_amount')
      .eq('id', invoiceId)
      .single()

    if (invoice) {
      const newAmountPaid = (invoice.amount_paid || 0) + amountPaid
      const newBalance = (invoice.total_amount || 0) - newAmountPaid
      await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'paid' : 'partial',
        })
        .eq('id', invoiceId)
    }

    console.log(`Payment recorded: $${amountPaid} for invoice ${invoiceNumber} via ${paymentMethod}`)

    // Fire-and-forget: notify Dr. Ettinger that a payment came in.
    // Look up case + invoice labels for a useful email body.
    let caseLabel: string | null = null
    if (caseId) {
      const { data: caseRow } = await supabase
        .from('cases')
        .select('case_number, case_name, patient_name')
        .eq('id', caseId)
        .single()
      if (caseRow) {
        const r = caseRow as { case_number?: string | null; case_name?: string | null; patient_name?: string | null }
        caseLabel = r.case_name || r.patient_name || r.case_number || null
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const payerName = session.customer_details?.name || session.customer_details?.email || 'Unknown payer'
    const formattedAmount = amountPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    const methodLabel = paymentMethod === 'ach' ? 'ACH bank transfer' : 'Credit card'
    const balanceNote = (() => {
      if (!invoice) return ''
      const totalAmount = invoice.total_amount || 0
      const newPaid = (invoice.amount_paid || 0) + amountPaid
      const remaining = Math.max(0, totalAmount - newPaid)
      if (remaining <= 0) return '<strong style="color: #059669;">Invoice fully paid.</strong>'
      return `Remaining balance: <strong>${remaining.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong>`
    })()

    void notifyMark({
      subject: `Payment received: ${formattedAmount} — ${invoiceNumber || 'invoice'}`,
      heading: 'Payment Received',
      bodyHtml: `
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 110px;">Amount:</td>
              <td style="padding: 6px 0; font-size: 18px; font-weight: 700; color: #059669;">${escapeHtml(formattedAmount)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Invoice:</td>
              <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(invoiceNumber || invoiceId)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">From:</td>
              <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(payerName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Method:</td>
              <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(methodLabel)}</td></tr>
          ${caseLabel ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Case:</td><td style="padding: 6px 0; font-size: 14px;">${escapeHtml(caseLabel)}</td></tr>` : ''}
        </table>
        ${balanceNote ? `<p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">${balanceNote}</p>` : ''}
      `,
      cta: {
        label: 'View Invoice',
        url: `${appUrl}/billing/invoices/${invoiceId}`,
      },
    })
  }

  return NextResponse.json({ received: true })
}
