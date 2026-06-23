import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: Fetch invoices for a portal user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate portal invite
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('id, case_id, contact_id, can_view_billing, is_active, expires_at')
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

    // Fetch invoices for this case that are relevant to the attorney
    // Show invoices that are sent, partial, paid, or overdue (not drafts)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        bill_to_name,
        bill_to_organization,
        payment_terms,
        payment_instructions,
        notes,
        period_start,
        period_end,
        created_at,
        invoice_line_items (
          id,
          activity_type,
          description,
          quantity,
          unit_price,
          amount,
          line_number
        )
      `)
      .eq('case_id', invite.case_id)
      .in('status', ['sent', 'overdue', 'partial', 'paid', 'pending_review', 'approved'])
      .order('invoice_date', { ascending: false })

    if (invoicesError) {
      console.error('Portal billing fetch error:', invoicesError)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Fetch payments for these invoices
    const invoiceIds = (invoices ?? []).map((i) => i.id)
    let payments: Array<{
      id: string
      invoice_id: string
      amount: number
      payment_date: string
      payment_method: string
      reference_number: string | null
    }> = []

    if (invoiceIds.length > 0) {
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id, invoice_id, amount, payment_date, payment_method, reference_number')
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false })
      payments = paymentData ?? []
    }

    // Calculate summary
    const totalOutstanding = (invoices ?? [])
      .filter((i) => ['sent', 'overdue', 'partial', 'pending_review', 'approved'].includes(i.status))
      .reduce((sum, i) => sum + (i.balance_due || 0), 0)

    const totalPaid = (invoices ?? [])
      .reduce((sum, i) => sum + (i.amount_paid || 0), 0)

    return NextResponse.json({
      invoices: invoices ?? [],
      payments,
      summary: {
        totalOutstanding,
        totalPaid,
        invoiceCount: (invoices ?? []).length,
      },
    })
  } catch (error) {
    console.error('Portal billing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
