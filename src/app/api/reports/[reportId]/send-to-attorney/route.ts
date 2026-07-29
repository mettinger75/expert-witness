import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { reportSentForReviewEmail, sendReportNotification } from '@/lib/report-notification-email'

// POST: Send report to attorney for review and editing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { reportId } = await params
    const { portalInviteId, notes, html } = await request.json()

    if (!portalInviteId) {
      return NextResponse.json(
        { error: 'portalInviteId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, rendered_html, collaboration_html, case_id, status')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Fetch portal invite with contact data
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('*, contacts(first_name, last_name, email)')
      .eq('id', portalInviteId)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Portal invite not found or inactive' },
        { status: 404 }
      )
    }

    // Fetch case data
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_number')
      .eq('id', report.case_id)
      .single()

    const contact = invite.contacts as unknown as { first_name: string; last_name: string; email: string } | null
    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'
    const contactEmail = contact?.email

    // Determine the HTML to send
    const collaborationHtml = html || report.rendered_html

    // Update report
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        collaboration_html: collaborationHtml,
        active_collaboration_invite_id: portalInviteId,
        status: 'attorney_review',
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw updateError
    }

    // Get max revision number for this report+invite
    const { data: maxRevision } = await supabase
      .from('report_revisions')
      .select('revision_number')
      .eq('report_id', reportId)
      .eq('portal_invite_id', portalInviteId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()

    const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1

    // Create revision record
    const { error: revisionError } = await supabase
      .from('report_revisions')
      .insert({
        report_id: reportId,
        portal_invite_id: portalInviteId,
        revision_number: nextRevisionNumber,
        submitted_by: 'provider',
        submitted_by_name: 'Mark Ettinger, M.D.',
        submitted_html: collaborationHtml,
        base_html: report.rendered_html || '',
        notes: notes || null,
        status: 'pending_review',
      })

    if (revisionError) {
      console.error('Failed to create revision:', revisionError)
      throw revisionError
    }

    // Create portal message
    const notesText = notes ? ` Note: ${notes}` : ''
    await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: invite.id,
        case_id: invite.case_id,
        sender_type: 'provider',
        sender_name: 'Mark Ettinger, M.D.',
        content: `I have shared ${report.report_name} for your review and editing.${notesText}`,
        message_type: 'report_notification',
        metadata: {
          report_id: reportId,
          report_name: report.report_name,
          action: 'sent_for_review',
        },
      })

    // Send email to attorney
    if (contactEmail && caseData) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
      const portalUrl = `${appUrl}/portal/${invite.token}`

      const email = reportSentForReviewEmail({
        attorneyName: contactName,
        caseName: caseData.case_name || '',
        caseNumber: caseData.case_number || '',
        reportName: report.report_name,
        portalUrl,
        notes: notes || undefined,
      })

      await sendReportNotification({
        to: contactEmail,
        subject: email.subject,
        html: email.html,
      })
    }

    return NextResponse.json({ success: true, revisionNumber: nextRevisionNumber })
  } catch (error) {
    console.error('Send to attorney error:', error)
    return NextResponse.json(
      { error: 'Failed to send report to attorney' },
      { status: 500 }
    )
  }
}
