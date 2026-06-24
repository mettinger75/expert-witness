import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  reportFinalizedEmail,
  changesRequestedEmail,
  sendReportNotification,
} from '@/lib/report-notification-email'

// POST: Dr. Ettinger makes a review decision on attorney edits
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { action, modifiedHtml, notes, revisionId } = await request.json()

    if (!action || !revisionId) {
      return NextResponse.json(
        { error: 'action and revisionId are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'request_changes', 'approve_with_modifications'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, request_changes, or approve_with_modifications' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch report with case data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, rendered_html, collaboration_html, content, case_id, status, active_collaboration_invite_id')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Fetch case data
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_number')
      .eq('id', report.case_id)
      .single()

    // Fetch the revision
    const { data: revision, error: revisionError } = await supabase
      .from('report_revisions')
      .select('*')
      .eq('id', revisionId)
      .single()

    if (revisionError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    // Fetch the portal invite + contact for the revision
    const { data: invite } = await supabase
      .from('portal_invites')
      .select('*, contacts(first_name, last_name, email)')
      .eq('id', revision.portal_invite_id)
      .single()

    const contact = invite?.contacts as unknown as { first_name: string; last_name: string; email: string } | null
    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'
    const contactEmail = contact?.email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const portalUrl = invite ? `${appUrl}/portal/${invite.token}` : appUrl

    if (action === 'approve') {
      // Update revision status
      await supabase
        .from('report_revisions')
        .update({
          status: 'approved',
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', revisionId)

      // Update report: use the submitted HTML as final
      const finalHtml = revision.submitted_html
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

      await supabase
        .from('reports')
        .update(reportUpdate)
        .eq('id', reportId)

      // Create portal message
      await supabase
        .from('portal_messages')
        .insert({
          portal_invite_id: revision.portal_invite_id,
          case_id: report.case_id,
          sender_type: 'provider',
          sender_name: 'Dr. Mark Ettinger',
          content: `${report.report_name} has been approved and finalized.${notes ? ' Note: ' + notes : ''}`,
          message_type: 'report_notification',
          metadata: {
            report_id: reportId,
            report_name: report.report_name,
            action: 'approved',
          },
        })

      // Send email to attorney
      if (contactEmail && caseData) {
        const email = reportFinalizedEmail({
          attorneyName: contactName,
          caseName: caseData.case_name || '',
          caseNumber: caseData.case_number || '',
          reportName: report.report_name,
          portalUrl,
        })

        await sendReportNotification({
          to: contactEmail,
          subject: email.subject,
          html: email.html,
        })
      }

      return NextResponse.json({ success: true, action: 'approved' })
    }

    if (action === 'request_changes') {
      // Update revision status
      await supabase
        .from('report_revisions')
        .update({
          status: 'changes_requested',
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', revisionId)

      // Determine the HTML to send back
      const htmlToSend = modifiedHtml || revision.submitted_html

      // Update report: send back for attorney review
      await supabase
        .from('reports')
        .update({
          collaboration_html: htmlToSend,
          status: 'attorney_review',
        })
        .eq('id', reportId)

      // Get max revision number for new revision
      const { data: maxRevision } = await supabase
        .from('report_revisions')
        .select('revision_number')
        .eq('report_id', reportId)
        .eq('portal_invite_id', revision.portal_invite_id)
        .order('revision_number', { ascending: false })
        .limit(1)
        .single()

      const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1

      // Create new revision from provider
      await supabase
        .from('report_revisions')
        .insert({
          report_id: reportId,
          portal_invite_id: revision.portal_invite_id,
          revision_number: nextRevisionNumber,
          submitted_by: 'provider',
          submitted_by_name: 'Dr. Mark Ettinger',
          submitted_html: htmlToSend,
          base_html: revision.submitted_html,
          notes: notes || null,
          status: 'pending_review',
        })

      // Create portal message
      await supabase
        .from('portal_messages')
        .insert({
          portal_invite_id: revision.portal_invite_id,
          case_id: report.case_id,
          sender_type: 'provider',
          sender_name: 'Dr. Mark Ettinger',
          content: `I have reviewed your edits to ${report.report_name} and sent it back with modifications.${notes ? ' Note: ' + notes : ''}`,
          message_type: 'report_notification',
          metadata: {
            report_id: reportId,
            report_name: report.report_name,
            action: 'changes_requested',
          },
        })

      // Send email to attorney
      if (contactEmail && caseData) {
        const email = changesRequestedEmail({
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

      return NextResponse.json({ success: true, action: 'changes_requested' })
    }

    if (action === 'approve_with_modifications') {
      if (!modifiedHtml) {
        return NextResponse.json(
          { error: 'modifiedHtml is required for approve_with_modifications' },
          { status: 400 }
        )
      }

      // Update revision status
      await supabase
        .from('report_revisions')
        .update({
          status: 'approved',
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', revisionId)

      // Update report: use the modified HTML as final
      const reportUpdate: Record<string, unknown> = {
        rendered_html: modifiedHtml,
        collaboration_html: modifiedHtml,
        status: 'final',
        approved_at: new Date().toISOString(),
      }

      // Update monolithic content if applicable
      if (report.content && typeof report.content === 'object') {
        reportUpdate.content = { import_mode: 'monolithic', html: modifiedHtml }
      }

      await supabase
        .from('reports')
        .update(reportUpdate)
        .eq('id', reportId)

      // Create portal message
      await supabase
        .from('portal_messages')
        .insert({
          portal_invite_id: revision.portal_invite_id,
          case_id: report.case_id,
          sender_type: 'provider',
          sender_name: 'Dr. Mark Ettinger',
          content: `${report.report_name} has been approved with modifications and finalized.${notes ? ' Note: ' + notes : ''}`,
          message_type: 'report_notification',
          metadata: {
            report_id: reportId,
            report_name: report.report_name,
            action: 'approved_with_modifications',
          },
        })

      // Send email to attorney
      if (contactEmail && caseData) {
        const email = reportFinalizedEmail({
          attorneyName: contactName,
          caseName: caseData.case_name || '',
          caseNumber: caseData.case_number || '',
          reportName: report.report_name,
          portalUrl,
        })

        await sendReportNotification({
          to: contactEmail,
          subject: email.subject,
          html: email.html,
        })
      }

      return NextResponse.json({ success: true, action: 'approved_with_modifications' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Review decision error:', error)
    return NextResponse.json(
      { error: 'Failed to process review decision' },
      { status: 500 }
    )
  }
}
