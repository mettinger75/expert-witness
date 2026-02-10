import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: Validate portal token and return case data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

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

    // Increment view count
    await supabase
      .from('portal_invites')
      .update({
        view_count: invite.view_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

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
    const { data: caseContacts } = await supabase
      .from('case_contacts')
      .select('*, contacts(*)')
      .eq('case_id', invite.case_id)

    // Fetch shared reports for this contact (if reports enabled)
    let sharedReports: unknown[] = []
    if (invite.can_view_reports) {
      const { data: links } = await supabase
        .from('shared_links')
        .select('*, reports:entity_id(*)')
        .eq('contact_id', invite.contact_id)
        .eq('entity_type', 'report')
        .eq('is_active', true)
      sharedReports = links || []
    }

    // Fetch communication timeline (if enabled)
    let communications: unknown[] = []
    if (invite.can_view_timeline) {
      const { data: comms } = await supabase
        .from('communication_logs')
        .select('*')
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
        .select('activity_type, description, rate_per_hour')
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
        expires_at: invite.expires_at,
        view_count: invite.view_count + 1,
        contact: invite.contacts,
      },
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
      sharedReports,
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
