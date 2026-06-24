import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendReportNotification, buildReportNotificationEmail } from '@/lib/report-notification-email'

// POST: Attorney accepts the final report via portal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { token } = await request.json()

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
      .select('id, report_name, status, case_id, collaboration_html, rendered_html, content')
      .eq('id', reportId)
      .eq('case_id', invite.case_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Verify report is in attorney_review status
    if (report.status !== 'attorney_review') {
      return NextResponse.json(
        { error: 'This report is not currently pending acceptance' },
        { status: 403 }
      )
    }

    const contact = invite.contacts as unknown as { first_name: string; last_name: string; email: string } | null
    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

    // Use collaboration_html as the final version
    const finalHtml = report.collaboration_html || report.rendered_html

    // Build update object
    const reportUpdate: Record<string, unknown> = {
      rendered_html: finalHtml,
      collaboration_html: finalHtml,
      status: 'final',
      approved_at: new Date().toISOString(),
    }

    // Update monolithic content if applicable
    if (report.content && typeof report.content === 'object') {
      reportUpdate.content = { import_mode: 'monolithic', html: finalHtml }
    }

    // Update report to final
    const { error: updateError } = await supabase
      .from('reports')
      .update(reportUpdate)
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw updateError
    }

    // Create portal message confirming acceptance
    await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: invite.id,
        case_id: invite.case_id,
        sender_type: 'attorney',
        sender_name: contactName,
        content: `I have reviewed and accepted ${report.report_name} as final.`,
        message_type: 'report_notification',
        metadata: {
          report_id: reportId,
          report_name: report.report_name,
          action: 'accepted_final',
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
      const emailHtml = buildReportNotificationEmail({
        recipientName: 'Dr. Ettinger',
        caseName: caseData.case_name || '',
        caseNumber: caseData.case_number || '',
        reportName: report.report_name,
        actionText: 'Report Accepted',
        bodyText: `<strong>${contactName}</strong> has reviewed and accepted <strong>${report.report_name}</strong> as final.`,
        ctaText: 'View Report',
        ctaUrl: `${appUrl}/cases/${report.case_id}/reports`,
      })

      await sendReportNotification({
        to: 'markettingermd@gmail.com',
        subject: `Report Accepted — ${caseData.case_name}`,
        html: emailHtml,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Accept final error:', error)
    return NextResponse.json(
      { error: 'Failed to accept report' },
      { status: 500 }
    )
  }
}
