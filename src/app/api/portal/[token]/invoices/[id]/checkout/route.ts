import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  try {
    const { token, id } = await params
    const supabase = getSupabaseAdmin()

    // Validate portal invite
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('id, case_id, can_view_billing, is_active, expires_at')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Portal link not found' }, { status: 404 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Portal link expired' }, { status: 410 })
    }

    if (!invite.can_view_billing) {
      return NextResponse.json({ error: 'Billing access not permitted' }, { status: 403 })
    }

    // Fetch invoice — must belong to the invite's case
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, case_id, balance_due, total_amount, status')
      .eq('id', id)
      .eq('case_id', invite.case_id)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'

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
        portal_token: token,
      },
      customer_email: undefined,
      success_url: `${appUrl}/portal/${token}?tab=billing&payment=success`,
      cancel_url: `${appUrl}/portal/${token}?tab=billing&payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal Stripe checkout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
