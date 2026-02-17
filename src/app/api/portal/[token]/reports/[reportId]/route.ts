import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { editsSubmittedEmail, sendReportNotification } from '@/lib/report-notification-email'

// GET: Fetch report content for portal viewing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reportId: string }> }
) {
  try {
    const { token, reportId } = await params
    const supabase = getSupabaseAdmin()

    // Validate the portal invite
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
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

    // Check permission
    if (!invite.can_view_reports) {
      return NextResponse.json(
        { error: 'This portal does not have report viewing permission' },
        { status: 403 }
      )
    }

    // Fetch the report — must belong to the same case
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, report_type, status, version, is_latest_version, rendered_html, rendered_text, collaboration_html, active_collaboration_invite_id, created_at, updated_at')
      .eq('id', reportId)
      .eq('case_id', invite.case_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Check for redlined versions via shared_links
    const { data: redlines } = await supabase
      .from('shared_links')
      .select('id, original_html, edited_html, edited_at, edited_by_name, editor_notes, recipient_name')
      .eq('entity_id', reportId)
      .eq('entity_type', 'report')
      .eq('permission', 'edit')
      .not('edited_html', 'is', null)
      .order('edited_at', { ascending: false })

    // Fetch report revisions for this report + portal invite
    const { data: revisions } = await supabase
      .from('report_revisions')
      .select('*')
      .eq('report_id', reportId)
      .eq('portal_invite_id', invite.id)
      .order('revision_number', { ascending: false })

    // Determine if this attorney can edit
    const canEdit = !!(
      invite.can_edit_reports &&
      report.status === 'attorney_review' &&
      report.active_collaboration_invite_id === invite.id
    )

    return NextResponse.json({
      report: {
        id: report.id,
        reportName: report.report_name,
        reportType: report.report_type,
        status: report.status,
        version: report.version,
        isLatestVersion: report.is_latest_version,
        renderedHtml: report.rendered_html,
        renderedText: report.rendered_text,
        collaborationHtml: report.collaboration_html,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      },
      canEdit,
      redlines: (redlines || []).map((r) => ({
        id: r.id,
        originalHtml: r.original_html,
        editedHtml: r.edited_html,
        editedAt: r.edited_at,
        editedByName: r.edited_by_name,
        editorNotes: r.editor_notes,
        recipientName: r.recipient_name,
      })),
      revisions: (revisions || []).map((rev) => ({
        id: rev.id,
        revisionNumber: rev.revision_number,
        submittedBy: rev.submitted_by,
        submittedByName: rev.submitted_by_name,
        submittedHtml: rev.submitted_html,
        baseHtml: rev.base_html,
        notes: rev.notes,
        status: rev.status,
        reviewerNotes: rev.reviewer_notes,
        reviewedAt: rev.reviewed_at,
        createdAt: rev.created_at,
      })),
    })
  } catch (error) {
    console.error('Portal report fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Attorney submits edits to a report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reportId: string }> }
) {
  try {
    const { token, reportId } = await params
    const { editedHtml, notes } = await request.json()

    if (!editedHtml) {
      return NextResponse.json(
        { error: 'editedHtml is required' },
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

    // Check edit permission
    if (!invite.can_edit_reports) {
      return NextResponse.json(
        { error: 'This portal does not have report editing permission' },
        { status: 403 }
      )
    }

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, collaboration_html, status, active_collaboration_invite_id, case_id')
      .eq('id', reportId)
      .eq('case_id', invite.case_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Verify report is in editable state for this attorney
    if (report.status !== 'attorney_review' || report.active_collaboration_invite_id !== invite.id) {
      return NextResponse.json(
        { error: 'This report is not currently editable by you' },
        { status: 403 }
      )
    }

    const contact = invite.contacts as unknown as { first_name: string; last_name: string; email: string } | null
    const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

    // Get current max revision_number for this report+invite
    const { data: maxRevision } = await supabase
      .from('report_revisions')
      .select('revision_number')
      .eq('report_id', reportId)
      .eq('portal_invite_id', invite.id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()

    const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1

    // Create report revision
    const { error: revisionError } = await supabase
      .from('report_revisions')
      .insert({
        report_id: reportId,
        portal_invite_id: invite.id,
        revision_number: nextRevisionNumber,
        submitted_by: 'attorney',
        submitted_by_name: contactName,
        submitted_html: editedHtml,
        base_html: report.collaboration_html || '',
        notes: notes || null,
        status: 'pending_review',
      })

    if (revisionError) {
      console.error('Failed to create revision:', revisionError)
      throw revisionError
    }

    // Update report
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        collaboration_html: editedHtml,
        status: 'review',
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw updateError
    }

    // Create portal message
    await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: invite.id,
        case_id: invite.case_id,
        sender_type: 'attorney',
        sender_name: contactName,
        content: `I have submitted my edits to ${report.report_name}.${notes ? ' Note: ' + notes : ''}`,
        message_type: 'report_notification',
        metadata: {
          report_id: reportId,
          report_name: report.report_name,
          action: 'submitted_edits',
        },
      })

    // Send email notification to Dr. Ettinger
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_number')
      .eq('id', report.case_id)
      .single()

    if (caseData) {
      const email = editsSubmittedEmail({
        attorneyName: contactName,
        caseName: caseData.case_name || '',
        caseNumber: caseData.case_number || '',
        reportName: report.report_name,
        caseId: report.case_id,
        notes: notes || undefined,
      })

      await sendReportNotification({
        to: 'dr.ettinger@gmail.com',
        subject: email.subject,
        html: email.html,
      })
    }

    return NextResponse.json({ success: true, revisionNumber: nextRevisionNumber })
  } catch (error) {
    console.error('Portal report edit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit edits' },
      { status: 500 }
    )
  }
}
