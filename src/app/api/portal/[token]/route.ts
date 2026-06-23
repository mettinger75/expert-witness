import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

// GET: Validate portal token and return case data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Preview mode: admin previewing what the recipient sees.
    // Skips view_count increments, session logging, and case-status side effects.
    const isPreview = request.nextUrl.searchParams.get('preview') === '1'

    // Look up the portal invite
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('*, contacts(*)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Portal link not found or expired' }, { status: 404 })
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This portal link has expired' }, { status: 410 })
    }

    let newViewCount = invite.view_count + 1
    if (!isPreview) {
      // Atomic increment + timestamps. A read-then-write would lose concurrent
      // increments; the RPC does it in one statement and returns the new count.
      const { data: vc } = await supabase.rpc('increment_portal_view', {
        p_invite_id: invite.id,
      })
      if (typeof vc === 'number') newViewCount = vc

      // Log this session. Dedup to a single row per (invite, session_id) via
      // client-provided session cookie. Fallback to a per-request id if absent.
      const sessionId =
        request.cookies.get('pi_sid')?.value ||
        request.headers.get('x-portal-session-id') ||
        crypto.randomUUID()
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        null
      const userAgent = request.headers.get('user-agent') || null
      const referrer = request.headers.get('referer') || null

      // Only log a new row if we haven't seen this session in the last 30 min
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('portal_access_log')
        .select('id')
        .eq('portal_invite_id', invite.id)
        .eq('session_id', sessionId)
        .gte('accessed_at', cutoff)
        .limit(1)
        .maybeSingle()

      if (!recent) {
        await supabase.from('portal_access_log').insert({
          portal_invite_id: invite.id,
          session_id: sessionId,
          ip_address: ipAddress,
          user_agent: userAgent,
          referrer,
          is_preview: false,
        })
      }

      // Auto-update case status: inquiry → conflict_check on first attorney view
      if (invite.view_count === 0 && invite.onboarding_mode) {
        const { data: currentCase } = await supabase
          .from('cases')
          .select('status')
          .eq('id', invite.case_id)
          .single()
        if (currentCase?.status === 'inquiry') {
          await supabase
            .from('cases')
            .update({ status: 'conflict_check', updated_at: new Date().toISOString() })
            .eq('id', invite.case_id)
        }
      }
    }

    // Fetch case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', invite.case_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch case contacts
    // Portal-safe fields only — don't over-fetch internal contact columns
    // (bar number, internal notes, addresses, fax, etc.) into the portal payload.
    const { data: caseContacts } = await supabase
      .from('case_contacts')
      .select('id, role, is_primary, contacts(id, first_name, last_name, email, phone_primary, organization_name, contact_type)')
      .eq('case_id', invite.case_id)

    // Fetch reports for this case (if reports enabled)
    let caseReports: unknown[] = []
    if (invite.can_view_reports) {
      const { data: reports } = await supabase
        .from('reports')
        .select('id, report_name, report_type, status, version, is_latest_version, created_at, updated_at')
        .eq('case_id', invite.case_id)
        .eq('is_latest_version', true)
        .order('updated_at', { ascending: false })
      caseReports = reports || []
    }

    // Fetch communication timeline (if enabled)
    let communications: unknown[] = []
    if (invite.can_view_timeline) {
      const { data: comms } = await supabase
        .from('communication_logs')
        .select('id, communication_type, subject, summary, communication_date, direction, participants, notes')
        .eq('case_id', invite.case_id)
        .order('communication_date', { ascending: false })
        .limit(50)
      communications = comms || []
    }

    // Fetch fee schedule if permitted
    let feeSchedule: unknown[] = []
    if (invite.can_view_fee_schedule) {
      const { data } = await supabase
        .from('billing_rates')
        .select('activity_type, description, rate_per_hour, flat_fee, daily_rate')
        .eq('is_active', true)
        .is('end_date', null)
        .order('activity_type')
      feeSchedule = data || []
    }

    // Fetch depositions if permitted
    let depositions: unknown[] = []
    if (invite.can_view_depositions) {
      const { data } = await supabase
        .from('depositions')
        .select('id, deponent_name, deponent_role, deposition_date, deposition_location, status, is_video_recorded, duration_hours, summary, ai_summary, key_admissions')
        .eq('case_id', invite.case_id)
        .order('deposition_date', { ascending: false })
      depositions = data || []
    }

    // Fetch contract status if contract is attached
    let contractStatus: { id: string; status: string; signedAt: string | null; title: string } | null = null
    if (invite.can_sign_contract && invite.contract_id) {
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, status, signed_at, title')
        .eq('id', invite.contract_id)
        .single()
      if (contract) {
        contractStatus = {
          id: contract.id,
          status: contract.status,
          signedAt: contract.signed_at,
          title: contract.title,
        }
      }
    }

    // Unread message count
    let unreadCount = 0
    if (invite.can_message) {
      const { count } = await supabase
        .from('portal_messages')
        .select('id', { count: 'exact', head: true })
        .eq('portal_invite_id', invite.id)
        .eq('sender_type', 'provider')
        .eq('is_read', false)
      unreadCount = count ?? 0
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        case_id: invite.case_id,
        contact_id: invite.contact_id,
        token: invite.token,
        can_view_summary: invite.can_view_summary,
        can_view_timeline: invite.can_view_timeline,
        can_message: invite.can_message,
        can_view_reports: invite.can_view_reports,
        can_edit_reports: invite.can_edit_reports,
        can_upload_documents: invite.can_upload_documents,
        can_view_fee_schedule: invite.can_view_fee_schedule,
        can_view_depositions: invite.can_view_depositions,
        can_view_billing: invite.can_view_billing,
        can_book_scheduling: invite.can_book_scheduling,
        can_sign_contract: invite.can_sign_contract,
        contract_id: invite.contract_id,
        onboarding_mode: invite.onboarding_mode,
        onboarding_steps: invite.onboarding_steps,
        expires_at: invite.expires_at,
        view_count: isPreview ? invite.view_count : newViewCount,
        tutorial_completed_at: invite.tutorial_completed_at ?? null,
        onboarding_completed_at: invite.onboarding_completed_at ?? null,
        contact: invite.contacts,
      },
      contractStatus,
      caseData: {
        id: caseData.id,
        case_name: caseData.case_name,
        case_number: caseData.case_number,
        status: caseData.status,
        priority: caseData.priority,
        side: caseData.side,
        case_type: caseData.case_type,
        specialty_area: caseData.specialty_area,
        brief_summary: caseData.brief_summary,
        key_issues: caseData.key_issues,
        patient_name: caseData.patient_name,
        patient_dob: caseData.patient_dob,
        patient_age_at_incident: caseData.patient_age_at_incident,
        date_of_incident: caseData.date_of_incident,
        date_of_referral: caseData.date_of_referral,
        jurisdiction_state: caseData.jurisdiction_state,
        jurisdiction_court: caseData.jurisdiction_court,
      },
      caseContacts: caseContacts || [],
      caseReports,
      communications,
      feeSchedule,
      depositions,
      unreadCount,
    })
  } catch (error) {
    console.error('Portal validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update portal invite (e.g. mark onboarding complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('id')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Portal link not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.onboardingCompleted) {
      updates.onboarding_completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('portal_invites')
      .update(updates)
      .eq('id', invite.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal invite update error:', error)
    return NextResponse.json({ error: 'Failed to update portal invite' }, { status: 500 })
  }
}

// DELETE: Revoke (deactivate) an invite by token. Admin-only — used by the
// dashboard when replacing an invite so the old link stops working. Previously
// there was no DELETE handler, so the dashboard's deactivation call silently
// no-op'd and stale links stayed live.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await requireAdminUser(request)
  if (auth.error) return auth.error

  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('portal_invites')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('token', token)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal invite revoke error:', error)
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
  }
}
