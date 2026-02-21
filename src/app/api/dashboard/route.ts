import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all data in parallel
    const [
      { data: unbilledEntries },
      { data: milestones },
      { data: invoices },
      { data: unbilledCharges },
      { data: recentActivity },
    ] = await Promise.all([
      // Unbilled time entries across all cases
      supabase
        .from('time_entries')
        .select('id, case_id, duration_hours, amount, activity_type, is_billable, is_billed')
        .eq('is_billable', true)
        .eq('is_billed', false),

      // All non-completed milestones with target_date in the future or recently overdue
      supabase
        .from('case_milestones')
        .select('id, case_id, milestone_name, milestone_type, target_date, status, is_completed')
        .eq('is_completed', false)
        .order('target_date', { ascending: true }),

      // Outstanding invoices
      supabase
        .from('invoices')
        .select('id, case_id, balance_due, status, total_amount')
        .in('status', ['sent', 'overdue', 'partial', 'pending_review', 'approved']),

      // Unbilled standalone charges (not yet on an invoice)
      supabase
        .from('invoice_line_items')
        .select('id, case_id, amount, is_billed')
        .is('invoice_id', null)
        .eq('is_billed', false),

      // Recent activity across cases: time entries, notes, documents, milestones
      // We get the most recent items per case
      supabase
        .from('audit_log')
        .select('id, table_name, record_id, action, new_values, created_at')
        .in('table_name', ['time_entries', 'case_notes', 'documents', 'case_milestones', 'invoices', 'cases'])
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    // Calculate unbilled hours
    const unbilledHours = (unbilledEntries ?? []).reduce(
      (sum, e) => sum + (e.duration_hours || 0),
      0
    )
    const unbilledAmount = (unbilledEntries ?? []).reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    )

    // Outstanding balance: invoices balance_due + unbilled time entry amounts + unbilled charges
    const invoiceBalance = (invoices ?? []).reduce(
      (sum, i) => sum + (i.balance_due || 0),
      0
    )
    const chargesBalance = (unbilledCharges ?? []).reduce(
      (sum, c) => sum + (c.amount || 0),
      0
    )
    const outstandingBalance = invoiceBalance + unbilledAmount + chargesBalance

    // Process milestones into upcoming deadlines
    const now = new Date()
    const upcomingDeadlines = (milestones ?? [])
      .filter((m) => {
        if (!m.target_date) return false
        const target = new Date(m.target_date)
        const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 60 && diffDays >= -14 // Show deadlines within 60 days and up to 14 days overdue
      })
      .map((m) => {
        const target = new Date(m.target_date)
        const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: m.id,
          case_id: m.case_id,
          milestone_name: m.milestone_name,
          milestone_type: m.milestone_type,
          target_date: m.target_date,
          status: m.status,
          days_until: diffDays,
          is_overdue: diffDays < 0,
        }
      })

    // Build last activity per case from audit log
    const caseActivityMap: Record<string, { description: string; timestamp: string }> = {}
    for (const entry of recentActivity ?? []) {
      // Extract case_id from the entry
      let relatedCaseId: string | null = null
      const newVals = entry.new_values as Record<string, unknown> | null

      if (entry.table_name === 'cases') {
        relatedCaseId = entry.record_id
      } else if (newVals?.case_id) {
        relatedCaseId = newVals.case_id as string
      }

      if (!relatedCaseId || caseActivityMap[relatedCaseId]) continue

      // Build human-readable description
      let desc = ''
      switch (entry.table_name) {
        case 'time_entries':
          desc = `Time logged: ${newVals?.activity_type || 'entry'}`
          break
        case 'case_notes':
          desc = `Note added: ${(newVals?.title as string)?.slice(0, 40) || 'case note'}`
          break
        case 'documents':
          desc = `Document: ${(newVals?.file_name as string)?.slice(0, 40) || 'uploaded'}`
          break
        case 'case_milestones':
          desc = `Milestone: ${(newVals?.milestone_name as string)?.slice(0, 40) || 'updated'}`
          break
        case 'invoices':
          desc = `Invoice ${entry.action === 'create' ? 'created' : 'updated'}`
          break
        case 'cases':
          desc = entry.action === 'create' ? 'Case created' : 'Case updated'
          break
        default:
          desc = `${entry.table_name} ${entry.action}`
      }

      caseActivityMap[relatedCaseId] = {
        description: desc,
        timestamp: entry.created_at,
      }
    }

    return NextResponse.json({
      unbilledHours,
      unbilledAmount,
      outstandingBalance,
      invoiceBalance,
      chargesBalance,
      upcomingDeadlines,
      caseActivity: caseActivityMap,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
