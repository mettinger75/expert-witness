import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { notifyMark, escapeHtml } from '@/lib/notify-mark'

// Resend inbound webhook handler
// Receives forwarded emails and stores them as communication logs.
// Emails without a matching case go into the inbox for manual assignment.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { from, to, subject, text, html } = body

    if (!from && !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Extract email address and name from various formats
    let fromEmail = ''
    let fromName = ''
    if (typeof from === 'string') {
      const match = from.match(/^(.+?)\s*<(.+?)>$/)
      if (match) {
        fromName = match[1].trim().replace(/^["']|["']$/g, '')
        fromEmail = match[2].trim()
      } else {
        fromEmail = from.trim()
      }
    } else if (from?.address) {
      fromEmail = from.address
      fromName = from.name || ''
    }

    // Try to match sender to a known contact and case
    let caseId: string | null = null
    let contactId: string | null = null

    if (fromEmail) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', fromEmail)
        .limit(1)

      if (contacts && contacts.length > 0) {
        contactId = contacts[0].id

        // Find the most recent active case this contact is linked to
        const { data: caseContacts } = await supabase
          .from('case_contacts')
          .select('case_id')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (caseContacts && caseContacts.length > 0) {
          caseId = caseContacts[0].case_id
        }
      }
    }

    // Always store the email — if no case match, it goes to the inbox (case_id = null)
    const { data: log, error: insertError } = await supabase
      .from('communication_logs')
      .insert({
        case_id: caseId,
        contact_id: contactId,
        from_email: fromEmail || null,
        from_name: fromName || null,
        communication_type: 'email_inbound',
        direction: 'inbound',
        subject: subject || '(no subject)',
        summary: text?.substring(0, 1000) || '(no text content)',
        details: text || html || null,
        communication_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to store inbound email:', insertError)
      return NextResponse.json({ error: 'Failed to store email' }, { status: 500 })
    }

    // Fire-and-forget: notify Dr. Ettinger that a new email has landed.
    // Unassigned (inbox) emails get a more urgent subject since they need
    // manual triage. Matched emails still notify so he sees activity on
    // a case without having to open the dashboard.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const senderDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail || 'Unknown sender'
    const snippet = (text || html || '').toString().slice(0, 500).trim()
    const ctaUrl = caseId ? `${appUrl}/cases/${caseId}/emails` : `${appUrl}/inbox`
    const ctaLabel = caseId ? 'Open Case' : 'Triage in Inbox'
    const subjectPrefix = caseId ? 'New email on case' : 'Unassigned email needs triage'

    void notifyMark({
      subject: `${subjectPrefix}: ${subject || '(no subject)'}`,
      heading: caseId ? 'New Case Email' : 'Inbox — Needs Triage',
      bodyHtml: `
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 80px;">From:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${escapeHtml(senderDisplay)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Subject:</td>
              <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(subject || '(no subject)')}</td></tr>
          ${caseId ? '' : '<tr><td colspan="2" style="padding: 6px 0; color: #b45309; font-size: 13px;">⚠ Sender email does not match any contact — needs manual assignment to a case.</td></tr>'}
        </table>
        ${snippet ? `<blockquote style="margin: 16px 0; padding: 12px 16px; background: #F0F2F5; border-left: 3px solid #DFC06A; color: #0E1F35; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(snippet)}${snippet.length >= 500 ? '…' : ''}</blockquote>` : ''}
      `,
      cta: { label: ctaLabel, url: ctaUrl },
    })

    return NextResponse.json({
      status: caseId ? 'assigned' : 'inbox',
      emailId: log?.id,
      caseId,
      message: caseId
        ? `Email assigned to case ${caseId}`
        : 'Email stored in inbox for manual assignment',
    })
  } catch (error) {
    console.error('Inbound email webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
