import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  reportFinalizedEmail,
  sendReportNotification,
} from '@/lib/report-notification-email'

// POST: Dr. Ettinger finalizes a report from the admin dashboard
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

    const supabase = getSupabaseAdmin()

    // Fetch report with case data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(
        'id, report_name, status, case_id, collaboration_html, rendered_html, content, active_collaboration_invite_id'
      )
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Allow finalization from various states
    const finalizableStatuses = [
      'draft',
      'in_progress',
      'review',
      'attorney_review',
      'revision',
    ]
    if (!finalizableStatuses.includes(report.status)) {
      return NextResponse.json(
        { error: `Report is already in '${report.status}' status` },
        { status: 400 }
      )
    }

    // Use collaboration_html as the final version if available
    const finalHtml = report.collaboration_html || report.rendered_html

    // Build update object
    const reportUpdate: Record<string, unknown> = {
      rendered_html: finalHtml,
      collaboration_html: finalHtml,
      status: 'final',
      approved_at: new Date().toISOString(),
      finalization_requested_at: null,
      finalization_requested_by: null,
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
      console.error('Failed to finalize report:', updateError)
      throw updateError
    }

    // Fetch case data for email
    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_number')
      .eq('id', report.case_id)
      .single()

    // Find the active portal invite to notify the attorney
    let notifiedAttorney = false
    if (report.active_collaboration_invite_id) {
      const { data: invite } = await supabase
        .from('portal_invites')
        .select('*, contacts(first_name, last_name, email)')
        .eq('id', report.active_collaboration_invite_id)
        .single()

      if (invite) {
        const contact = invite.contacts as unknown as {
          first_name: string
          last_name: string
          email: string
        } | null
        const contactName = contact
          ? `${contact.first_name} ${contact.last_name}`
          : 'Attorney'
        const contactEmail = contact?.email
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
        const portalUrl = `${appUrl}/portal/${invite.token}`

        // Create portal message
        await supabase.from('portal_messages').insert({
          portal_invite_id: invite.id,
          case_id: report.case_id,
          sender_type: 'provider',
          sender_name: 'Dr. Mark Ettinger',
          content: `${report.report_name} has been finalized. You can download the signed PDF from the Reports tab.`,
          message_type: 'report_notification',
          metadata: {
            report_id: reportId,
            report_name: report.report_name,
            action: 'finalized',
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
          notifiedAttorney = true
        }
      }
    }

    // If no active collaboration invite, check for any active invite on this case
    if (!notifiedAttorney) {
      const { data: invites } = await supabase
        .from('portal_invites')
        .select('*, contacts(first_name, last_name, email)')
        .eq('case_id', report.case_id)
        .eq('is_active', true)
        .eq('can_view_reports', true)

      if (invites && invites.length > 0) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'

        for (const invite of invites) {
          const contact = invite.contacts as unknown as {
            first_name: string
            last_name: string
            email: string
          } | null
          const contactName = contact
            ? `${contact.first_name} ${contact.last_name}`
            : 'Attorney'
          const contactEmail = contact?.email
          const portalUrl = `${appUrl}/portal/${invite.token}`

          // Create portal message
          await supabase.from('portal_messages').insert({
            portal_invite_id: invite.id,
            case_id: report.case_id,
            sender_type: 'provider',
            sender_name: 'Dr. Mark Ettinger',
            content: `${report.report_name} has been finalized. You can download the signed PDF from the Reports tab.`,
            message_type: 'report_notification',
            metadata: {
              report_id: reportId,
              report_name: report.report_name,
              action: 'finalized',
            },
          })

          // Send email
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
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Finalize report error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize report' },
      { status: 500 }
    )
  }
}
