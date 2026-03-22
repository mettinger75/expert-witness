import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// GET /api/finance/detail
// Returns detailed billing data for the Ettinger Finance app:
// - All invoices with line items and case names
// - All payments with case names and references
// - Unbilled time entries grouped by case
//
// Auth: x-api-key header must match FINANCE_SUMMARY_API_KEY env var.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // ---- Auth ----
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.FINANCE_SUMMARY_API_KEY

    if (!expectedKey) {
      console.error('FINANCE_SUMMARY_API_KEY is not configured')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ---- Setup ----
    const supabase = getSupabaseAdmin()

    // ---- Parallel queries ----
    const [
      { data: invoices, error: invError },
      { data: lineItems, error: liError },
      { data: payments, error: payError },
      { data: unbilledTime, error: utError },
      { data: cases, error: casesError },
    ] = await Promise.all([
      // All invoices
      supabase
        .from('invoices')
        .select('id, case_id, invoice_number, invoice_date, due_date, status, subtotal, total_amount, amount_paid, balance_due, bill_to_name, bill_to_organization, bill_to_email, sent_at, created_at')
        .order('invoice_date', { ascending: false }),

      // All invoice line items
      supabase
        .from('invoice_line_items')
        .select('id, invoice_id, case_id, description, activity_type, date, quantity, unit_price, amount, is_billed'),

      // All payments
      supabase
        .from('payments')
        .select('id, invoice_id, case_id, payment_date, amount, payment_method, reference_number, check_number, status, received_from')
        .order('payment_date', { ascending: false }),

      // Unbilled time entries
      supabase
        .from('time_entries')
        .select('id, case_id, activity_type, description, date, duration_hours, rate_per_hour, amount, status')
        .eq('is_billable', true)
        .eq('is_billed', false)
        .order('date', { ascending: false }),

      // Cases for name lookup
      supabase
        .from('cases')
        .select('id, case_name, case_type, side, status'),
    ])

    if (invError) throw invError
    if (liError) throw liError
    if (payError) throw payError
    if (utError) throw utError
    if (casesError) throw casesError

    // ---- Build case lookup ----
    const caseMap = new Map<string, { case_name: string; case_type: string; side: string; status: string }>()
    for (const c of cases ?? []) {
      caseMap.set(c.id, { case_name: c.case_name, case_type: c.case_type, side: c.side, status: c.status })
    }

    // ---- Build line items by invoice ----
    const lineItemsByInvoice = new Map<string, typeof lineItems>()
    for (const li of lineItems ?? []) {
      if (!li.invoice_id) continue
      const existing = lineItemsByInvoice.get(li.invoice_id) || []
      existing.push(li)
      lineItemsByInvoice.set(li.invoice_id, existing)
    }

    // ---- Format invoices ----
    const formattedInvoices = (invoices ?? []).map((inv) => {
      const caseInfo = caseMap.get(inv.case_id) || { case_name: 'Unknown', case_type: null, side: null, status: null }
      const items = lineItemsByInvoice.get(inv.id) || []
      return {
        id: inv.id,
        case_id: inv.case_id,
        case_name: caseInfo.case_name,
        case_type: caseInfo.case_type,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        subtotal: inv.subtotal,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        balance_due: inv.balance_due,
        bill_to_name: inv.bill_to_name,
        bill_to_organization: inv.bill_to_organization,
        line_items: items.map((li) => ({
          description: li.description,
          activity_type: li.activity_type,
          date: li.date,
          quantity: li.quantity,
          unit_price: li.unit_price,
          amount: li.amount,
        })),
      }
    })

    // ---- Format payments ----
    const formattedPayments = (payments ?? []).map((p) => {
      const caseInfo = caseMap.get(p.case_id) || { case_name: 'Unknown', case_type: null, side: null, status: null }
      return {
        id: p.id,
        invoice_id: p.invoice_id,
        case_id: p.case_id,
        case_name: caseInfo.case_name,
        payment_date: p.payment_date,
        amount: p.amount,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
        check_number: p.check_number,
        status: p.status,
        received_from: p.received_from,
      }
    })

    // ---- Group unbilled time by case ----
    const unbilledByCase = new Map<string, {
      entries: Array<{
        id: string; date: string; activity_type: string; description: string
        duration_hours: number; rate_per_hour: number; amount: number
      }>
      total_hours: number
      total_amount: number
      oldest_entry_date: string | null
    }>()

    for (const te of unbilledTime ?? []) {
      const existing = unbilledByCase.get(te.case_id) || {
        entries: [], total_hours: 0, total_amount: 0, oldest_entry_date: null,
      }
      existing.entries.push({
        id: te.id,
        date: te.date,
        activity_type: te.activity_type,
        description: te.description,
        duration_hours: te.duration_hours,
        rate_per_hour: te.rate_per_hour,
        amount: te.amount,
      })
      existing.total_hours += te.duration_hours || 0
      existing.total_amount += te.amount || 0
      if (!existing.oldest_entry_date || te.date < existing.oldest_entry_date) {
        existing.oldest_entry_date = te.date
      }
      unbilledByCase.set(te.case_id, existing)
    }

    const formattedUnbilled = Array.from(unbilledByCase.entries()).map(([caseId, data]) => {
      const caseInfo = caseMap.get(caseId) || { case_name: 'Unknown', case_type: null, side: null, status: null }
      return {
        case_id: caseId,
        case_name: caseInfo.case_name,
        entries: data.entries,
        total_hours: Math.round(data.total_hours * 100) / 100,
        total_amount: Math.round(data.total_amount * 100) / 100,
        oldest_entry_date: data.oldest_entry_date,
      }
    })

    // ---- Response ----
    return NextResponse.json({
      invoices: formattedInvoices,
      payments: formattedPayments,
      unbilled_time: formattedUnbilled,
      as_of: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Finance detail API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
