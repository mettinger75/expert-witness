import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// GET /api/finance/summary
// Returns an ExpertWitnessFinancialSummary for the Ettinger Control Center
// or any authenticated consumer.
//
// Auth: x-api-key header must match FINANCE_SUMMARY_API_KEY env var.
// Revenue aggregations use YTD (Jan 1 of current year).
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // ---- Auth ----
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.FINANCE_SUMMARY_API_KEY

    if (!expectedKey) {
      console.error('FINANCE_SUMMARY_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ---- Setup ----
    const supabase = getSupabaseAdmin()
    const now = new Date()
    const ytdStart = `${now.getFullYear()}-01-01`
    const today = now.toISOString().split('T')[0]

    // ---- Parallel queries ----
    const [
      { data: timeEntries, error: teError },
      { data: cases, error: casesError },
      { data: invoices, error: invError },
      { data: payments, error: payError },
    ] = await Promise.all([
      // All billable time entries (no date filter -- total hours is lifetime)
      supabase
        .from('time_entries')
        .select('id, case_id, duration_hours, amount, is_billable, date')
        .eq('is_billable', true),

      // Active (non-archived) cases with financial fields
      supabase
        .from('cases')
        .select(
          'id, case_name, retainer_amount, retainer_received, total_billed, total_paid, outstanding_balance, is_archived'
        )
        .eq('is_archived', false),

      // All invoices (we'll bucket by status)
      supabase
        .from('invoices')
        .select(
          'id, case_id, invoice_date, due_date, status, total_amount, amount_paid, balance_due'
        ),

      // YTD payments (for revenue.total_collected)
      supabase
        .from('payments')
        .select('id, amount, payment_date')
        .gte('payment_date', ytdStart),
    ])

    // Throw on critical errors
    if (teError) throw teError
    if (casesError) throw casesError
    if (invError) throw invError
    if (payError) throw payError

    // ---- Billable hours ----
    const allEntries = timeEntries ?? []

    const totalBillableHours = allEntries.reduce(
      (sum, e) => sum + (e.duration_hours || 0),
      0
    )

    // Build case_id -> case_name lookup
    const caseMap = new Map<string, string>()
    for (const c of cases ?? []) {
      caseMap.set(c.id, c.case_name)
    }

    // Hours grouped by case
    const hoursByCase = new Map<string, number>()
    for (const e of allEntries) {
      hoursByCase.set(
        e.case_id,
        (hoursByCase.get(e.case_id) || 0) + (e.duration_hours || 0)
      )
    }

    const byCase = Array.from(hoursByCase.entries())
      .map(([caseId, hours]) => ({
        case_name: caseMap.get(caseId) || 'Unknown Case',
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)

    // ---- Revenue (YTD) ----
    const ytdEntries = allEntries.filter((e) => e.date >= ytdStart)
    const totalBilledYTD = ytdEntries.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    )

    const totalCollectedYTD = (payments ?? []).reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    )

    const outstandingRevenue = totalBilledYTD - totalCollectedYTD

    // ---- Invoices ----
    const allInvoices = invoices ?? []
    const openStatuses = ['sent', 'viewed', 'partial', 'overdue', 'pending_review', 'approved']
    const openInvoices = allInvoices.filter((i) =>
      openStatuses.includes(i.status)
    )
    const countOpen = openInvoices.length
    const totalOutstanding = openInvoices.reduce(
      (sum, i) => sum + (i.balance_due || 0),
      0
    )

    // Overdue: open invoices where due_date < today
    const overdueAmount = openInvoices
      .filter((i) => i.due_date < today)
      .reduce((sum, i) => sum + (i.balance_due || 0), 0)

    // ---- Retainers ----
    const casesWithRetainer = (cases ?? []).filter(
      (c) => c.retainer_received && c.retainer_amount && c.retainer_amount > 0
    )
    const totalRetainerHeld = casesWithRetainer.reduce(
      (sum, c) => sum + (c.retainer_amount || 0),
      0
    )

    // ---- Accounts receivable aging ----
    // Based on open invoices, bucketed by how old the invoice_date is
    let aging30 = 0
    let aging60 = 0
    let aging90Plus = 0
    const totalAR = totalOutstanding

    for (const inv of openInvoices) {
      const invoiceDate = new Date(inv.invoice_date)
      const ageDays = Math.floor(
        (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const balance = inv.balance_due || 0

      if (ageDays > 90) {
        aging90Plus += balance
      } else if (ageDays > 60) {
        aging60 += balance
      } else if (ageDays > 30) {
        aging30 += balance
      }
      // 0-30 days is current — not broken out separately
    }

    // ---- Response ----
    const summary = {
      billable_hours: {
        total: Math.round(totalBillableHours * 100) / 100,
        by_case: byCase,
      },
      revenue: {
        total_billed: Math.round(totalBilledYTD * 100) / 100,
        total_collected: Math.round(totalCollectedYTD * 100) / 100,
        outstanding: Math.round(outstandingRevenue * 100) / 100,
      },
      invoices: {
        count_open: countOpen,
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        overdue: Math.round(overdueAmount * 100) / 100,
      },
      retainers: {
        total_held: Math.round(totalRetainerHeld * 100) / 100,
        count: casesWithRetainer.length,
      },
      accounts_receivable: {
        total: Math.round(totalAR * 100) / 100,
        aging_30: Math.round(aging30 * 100) / 100,
        aging_60: Math.round(aging60 * 100) / 100,
        aging_90_plus: Math.round(aging90Plus * 100) / 100,
      },
      as_of: now.toISOString(),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Finance summary API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
