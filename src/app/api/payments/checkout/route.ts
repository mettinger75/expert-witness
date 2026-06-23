import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, token } = await request.json()

    if (!invoiceId || !token) {
      return NextResponse.json(
        { error: 'invoiceId and token are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Validate shared link
    const { data: link, error: linkErr } = await supabase
      .from('shared_links')
      .select('id, entity_id, entity_type, is_active, expires_at')
      .eq('token', token)
      .eq('entity_type', 'invoice')
      .eq('is_active', true)
      .single()

    if (linkErr || !link) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 403 }
      )
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 403 }
      )
    }

    // Get invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, case_id, balance_due, total_amount, status, bill_to_name, bill_to_organization')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.balance_due <= 0 || invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'This invoice has already been paid' },
        { status: 400 }
      )
    }

    // Get case name for the description
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name')
      .eq('id', invoice.case_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: caseData?.case_name
                ? `Expert witness services — ${caseData.case_name}`
                : 'Expert witness services — Mark Ettinger, M.D.',
            },
            unit_amount: Math.round(invoice.balance_due * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        case_id: invoice.case_id,
        invoice_number: invoice.invoice_number,
      },
      customer_email: undefined, // Let them enter their own
      success_url: `${appUrl}/shared/${token}?payment=success`,
      cancel_url: `${appUrl}/shared/${token}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
