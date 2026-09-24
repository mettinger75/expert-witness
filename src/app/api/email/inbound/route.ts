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

    // Fail closed until webhook signing is configured. Without it anyone can
    // post here, and a spoofed "inbound email" would be filed on a real case
    // and trigger a notification. The secret only authenticates anything once
    // the signature check that uses it is in place — set it together with that
    // check, never before.
    if (!process.env.RESEND_WEBHOOK_SECRET) {
      console.error('email/inbound: RESEND_WEBHOOK_SECRET is not set; refusing to store inbound email')
      return NextResponse.json({ error: 'Inbound email is not configured' }, { status: 503 })
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

    // Match the sender to a contact, and file the email on a case only when
    // that is unambiguous. contacts.email is neither unique nor normalized, so
    // match case-insensitively (escaping LIKE wildcards — '_' is legal in an
    // address) and consider every row that carries the address. A sender with
    // no open case, or with several, stays in the inbox for manual assignment:
    // filing on a guess can put mail on the wrong matter.
    let caseId: string | null = null
    let contactId: string | null = null
    let openCaseCount = 0

    if (fromEmail) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .ilike('email', likeLiteral(fromEmail))
        .order('created_at', { ascending: true })

      if (contacts && contacts.length > 0) {
        const contactIds: string[] = contacts.map((c) => c.id)
        contactId = contactIds[0]

        const { data: links } = await supabase
          .from('case_contacts')
          .select('contact_id, case_id')
          .in('contact_id', contactIds)

        const linkedCaseIds: string[] = Array.from(new Set((links ?? []).map((l) => l.case_id)))
        if (linkedCaseIds.length > 0) {
          // Same definition of "open" as the inbox's assign-to-case list.
          const { data: openCases } = await supabase
            .from('cases')
            .select('id')
            .in('id', linkedCaseIds)
            .not('status', 'in', '("closed","declined","withdrawn")')

          openCaseCount = openCases?.length ?? 0
          if (openCases && openCases.length === 1) {
            const matchedCaseId: string = openCases[0].id
            caseId = matchedCaseId
            // Attribute the email to the contact row that is on that case.
            contactId = links?.find((l) => l.case_id === matchedCaseId)?.contact_id ?? contactId
          }
        }
      }
    }

    // Always store the email — if no case match, it goes to the inbox (case_id = null).
    // Flags mirror the other inbound-email writer (MCP save_email_to_case):
    // follow_up_required keeps it in the case's Emails inbox until it is filed,
    // and a received email is not billable in itself.
    const { data: log, error: insertError } = await supabase
      .from('communication_logs')
      .insert({
        case_id: caseId,
        contact_id: contactId,
        from_email: clip(fromEmail, 255) || null,
        from_name: clip(fromName, 255) || null,
        communication_type: 'email_received',
        direction: 'inbound',
        status: 'completed',
        subject: clip(subject || '(no subject)', 500),
        summary: text?.substring(0, 1000) || '(no text content)',
        detailed_notes: text || html || null,
        communication_date: new Date().toISOString(),
        follow_up_required: true,
        is_billable: false,
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const senderDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail || 'Unknown sender'
    const snippet = (text || html || '').toString().slice(0, 500).trim()
    const ctaUrl = caseId ? `${appUrl}/cases/${caseId}/emails` : `${appUrl}/inbox`
    const ctaLabel = caseId ? 'Open Case' : 'Triage in Inbox'
    const subjectPrefix = caseId ? 'New email on case' : 'Unassigned email needs triage'
    const triageNote = caseId
      ? ''
      : !contactId
        ? 'Sender email does not match any contact — needs manual assignment to a case.'
        : openCaseCount > 1
          ? `Sender is linked to ${openCaseCount} open cases — needs manual assignment to the right one.`
          : 'Sender is a known contact with no open case — needs manual assignment to a case.'

    void notifyMark({
      subject: `${subjectPrefix}: ${subject || '(no subject)'}`,
      heading: caseId ? 'New Case Email' : 'Inbox — Needs Triage',
      bodyHtml: `
        <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px 0;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 80px;">From:</td>
              <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${escapeHtml(senderDisplay)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Subject:</td>
              <td style="padding: 6px 0; font-size: 14px;">${escapeHtml(subject || '(no subject)')}</td></tr>
          ${triageNote ? `<tr><td colspan="2" style="padding: 6px 0; color: #b45309; font-size: 13px;">⚠ ${escapeHtml(triageNote)}</td></tr>` : ''}
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

/** Escape LIKE metacharacters so an address matches literally ('_' is legal in email). */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Truncate to a varchar(n) limit, counting characters rather than UTF-16 code units. */
function clip(value: unknown, max: number): string {
  return Array.from(String(value ?? '')).slice(0, max).join('')
}
