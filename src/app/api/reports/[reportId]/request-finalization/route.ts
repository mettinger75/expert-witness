import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  finalizationRequestedEmail,
  sendReportNotification,
} from '@/lib/report-notification-email'

// POST: Attorney requests finalization via portal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { token, notes } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Portal token is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Validate the portal invite
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('*, contacts(first_name, last_name, email)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Portal link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This portal link has expired' },
        { status: 410 }
      )
    }

    // Fetch report — must belong to the same case
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, status, case_id')
      .eq('id', reportId)
      .eq('case_id', invite.case_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Allow request from attorney_review state (attorney is reviewing and wants to finalize)
    if (report.status !== 'attorney_review') {
      return NextResponse.json(
        { error: 'This report is not currently in a state where finalization can be requested' },
        { status: 403 }
      )
    }

    const contact = invite.contacts as unknown as {
      first_name: string
      last_name: string
      email: string
    } | null
    const contactName = contact
      ? `${contact.first_name} ${contact.last_name}`
      : 'Attorney'

    // Update report with finalization request metadata
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        finalization_requested_at: new Date().toISOString(),
        finalization_requested_by: contactName,
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw updateError
    }

    // Create portal message
    await supabase.from('portal_messages').insert({
      portal_invite_id: invite.id,
      case_id: invite.case_id,
      sender_type: 'attorney',
      sender_name: contactName,
      content: `I have completed my review of ${report.report_name} and am requesting finalization.${notes ? ' Note: ' + notes : ''}`,
      message_type: 'report_notification',
      metadata: {
        report_id: reportId,
        report_name: report.report_name,
        action: 'requested_finalization',
      },
    })

    // Fetch case data for email
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_number')
      .eq('id', report.case_id)
      .single()

    // Send email to Dr. Ettinger
    if (caseData) {
      const email = finalizationRequestedEmail({
        attorneyName: contactName,
        caseName: caseData.case_name || '',
        caseNumber: caseData.case_number || '',
        reportName: report.report_name,
        caseId: report.case_id,
        notes: notes || undefined,
      })

      await sendReportNotification({
        to: 'markettingermd@gmail.com',
        subject: email.subject,
        html: email.html,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request finalization error:', error)
    return NextResponse.json(
      { error: 'Failed to request finalization' },
      { status: 500 }
    )
  }
}
