import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const supabase = getSupabaseAdmin()
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`

    // Fetch all data in parallel
    const [
      { data: unbilledEntries },
      { data: milestones },
      { data: outstandingInvoices },
      { data: unbilledCharges },
      { data: recentActivity },
      { data: portalInvites },
      { data: paidInvoices },
      { data: calendarMilestones },
    ] = await Promise.all([
      // Unbilled time entries
      supabase
        .from('time_entries')
        .select('id, case_id, duration_hours, amount, activity_type')
        .eq('is_billable', true)
        .eq('is_billed', false),

      // All non-completed milestones
      supabase
        .from('case_milestones')
        .select('id, case_id, milestone_name, milestone_type, target_date, status, is_completed, cases!inner(case_name)')
        .eq('is_completed', false)
        .order('target_date', { ascending: true }),

      // Outstanding invoices
      supabase
        .from('invoices')
        .select('id, case_id, invoice_number, balance_due, status, total_amount, due_date, bill_to_name, cases(case_name)')
        .in('status', ['sent', 'overdue', 'partial', 'pending_review', 'approved']),

      // Unbilled standalone charges
      supabase
        .from('invoice_line_items')
        .select('id, case_id, amount')
        .is('invoice_id', null)
        .eq('is_billed', false),

      // Recent activity
      supabase
        .from('audit_log')
        .select('id, table_name, record_id, action, new_values, created_at')
        .in('table_name', ['time_entries', 'case_notes', 'documents', 'case_milestones', 'invoices', 'cases'])
        .order('created_at', { ascending: false })
        .limit(100),

      // Active portal invites with contact and case info
      supabase
        .from('portal_invites')
        .select('id, case_id, contact_id, token, is_active, last_accessed_at, view_count, expires_at, created_at, onboarding_steps, contacts(first_name, last_name, email, organization_name), cases(case_name, case_number)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20),

      // YTD collected (paid invoices)
      supabase
        .from('invoices')
        .select('amount_paid')
        .gte('invoice_date', yearStart)
        .gt('amount_paid', 0),

      // Calendar milestones for next 7 days
      supabase
        .from('case_milestones')
        .select('id, case_id, milestone_name, milestone_type, target_date, status, is_completed, cases!inner(case_name)')
        .gte('target_date', now.toISOString().split('T')[0])
        .lte('target_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('target_date', { ascending: true }),
    ])

    // Calculate unbilled hours/amount
    const unbilledHours = (unbilledEntries ?? []).reduce((sum, e) => sum + (e.duration_hours || 0), 0)
    const unbilledAmount = (unbilledEntries ?? []).reduce((sum, e) => sum + (e.amount || 0), 0)

    // Outstanding balance
    const invoiceBalance = (outstandingInvoices ?? []).reduce((sum, i) => sum + (i.balance_due || 0), 0)
    const chargesBalance = (unbilledCharges ?? []).reduce((sum, c) => sum + (c.amount || 0), 0)
    const outstandingBalance = invoiceBalance + unbilledAmount + chargesBalance

    // YTD collected
    const collectedYTD = (paidInvoices ?? []).reduce((sum, i) => sum + (i.amount_paid || 0), 0)

    // Outstanding invoices detail (for financial widget)
    const outstandingInvoicesList = (outstandingInvoices ?? []).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      balanceDue: inv.balance_due,
      totalAmount: inv.total_amount,
      status: inv.status,
      dueDate: inv.due_date,
      billToName: inv.bill_to_name,
      caseName: (inv.cases as unknown as { case_name: string } | null)?.case_name,
    }))

    // Process milestones into upcoming deadlines
    const upcomingDeadlines = (milestones ?? [])
      .filter((m) => {
        if (!m.target_date) return false
        const target = new Date(m.target_date)
        const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 60 && diffDays >= -14
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
          case_name: (m.cases as unknown as { case_name: string } | null)?.case_name,
        }
      })

    // Portal invites
    const portalInvitesList = (portalInvites ?? []).map(inv => {
      const contact = inv.contacts as unknown as { first_name: string; last_name: string; email: string; organization_name: string | null } | null
      const caseInfo = inv.cases as unknown as { case_name: string; case_number: string } | null
      const steps = inv.onboarding_steps as Record<string, { completed: boolean }> | null
      const completedSteps = steps ? Object.values(steps).filter(s => s.completed).length : 0
      const totalSteps = steps ? Object.keys(steps).length : 0

      return {
        id: inv.id,
        caseId: inv.case_id,
        contactId: inv.contact_id,
        token: inv.token,
        contactName: contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown',
        contactEmail: contact?.email,
        organization: contact?.organization_name,
        caseName: caseInfo?.case_name,
        caseNumber: caseInfo?.case_number,
        viewCount: inv.view_count,
        lastAccessed: inv.last_accessed_at,
        createdAt: inv.created_at,
        onboardingProgress: totalSteps > 0 ? `${completedSteps}/${totalSteps}` : null,
        status: inv.view_count > 0 ? (completedSteps === totalSteps && totalSteps > 0 ? 'completed' : 'in_progress') : 'sent',
      }
    })

    // Build last activity per case
    const caseActivityMap: Record<string, { description: string; timestamp: string }> = {}
    for (const entry of recentActivity ?? []) {
      let relatedCaseId: string | null = null
      const newVals = entry.new_values as Record<string, unknown> | null
      if (entry.table_name === 'cases') {
        relatedCaseId = entry.record_id
      } else if (newVals?.case_id) {
        relatedCaseId = newVals.case_id as string
      }
      if (!relatedCaseId || caseActivityMap[relatedCaseId]) continue
      let desc = ''
      switch (entry.table_name) {
        case 'time_entries': desc = `Time logged: ${newVals?.activity_type || 'entry'}`; break
        case 'case_notes': desc = `Note added: ${(newVals?.title as string)?.slice(0, 40) || 'case note'}`; break
        case 'documents': desc = `Document: ${(newVals?.file_name as string)?.slice(0, 40) || 'uploaded'}`; break
        case 'case_milestones': desc = `Milestone: ${(newVals?.milestone_name as string)?.slice(0, 40) || 'updated'}`; break
        case 'invoices': desc = `Invoice ${entry.action === 'create' ? 'created' : 'updated'}`; break
        case 'cases': desc = entry.action === 'create' ? 'Case created' : 'Case updated'; break
        default: desc = `${entry.table_name} ${entry.action}`
      }
      caseActivityMap[relatedCaseId] = { description: desc, timestamp: entry.created_at }
    }

    // Upcoming schedule (next 7 days milestones)
    const upcomingSchedule = (calendarMilestones ?? []).map(m => ({
      id: m.id,
      title: m.milestone_name,
      date: m.target_date,
      type: 'milestone' as const,
      caseId: m.case_id,
      caseName: (m.cases as unknown as { case_name: string } | null)?.case_name,
      isCompleted: m.is_completed,
    }))

    return NextResponse.json({
      unbilledHours,
      unbilledAmount,
      outstandingBalance,
      invoiceBalance,
      chargesBalance,
      collectedYTD,
      pendingInvites: portalInvitesList.length,
      upcomingDeadlines,
      upcomingSchedule,
      outstandingInvoices: outstandingInvoicesList,
      portalInvites: portalInvitesList,
      caseActivity: caseActivityMap,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
