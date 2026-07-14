import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { buildEmail } from '@/lib/email-templates'
import { emailSendDefaults, EMAIL_EVENT_TYPES, type EmailEventType } from '@/lib/email-config'

const resend = new Resend(process.env.RESEND_API_KEY)

// Case-centric notifications whose entire message is "there's an update about
// <case>". Sent with no case context they render "...regarding undefined" and
// link to /cases/undefined — the root cause of the bogus "Weekly Review" emails
// (2026-06-08, 2026-07-10). Require a real case (or an explicit body) for these.
const CASE_REQUIRED_EVENTS = ['case_update', 'follow_up']

export async function POST(request: NextRequest) {
  try {
    // Sends mail as Mark and writes communication_logs via the service role —
    // dashboard-authenticated callers only (no auth = open email relay).
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const {
      eventType,
      recipientEmail,
      recipientName,
      caseId,
      contactId,
      metadata = {},
      customSubject,
      customBody,
    } = body

    // Validate
    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
    }
    if (!eventType || !EMAIL_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${EMAIL_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Guard: a case-update / follow-up with no case context (and no custom body)
    // would render "...regarding undefined" and a dead /cases/undefined link.
    if (CASE_REQUIRED_EVENTS.includes(eventType)) {
      const hasCaseContext = Boolean(
        caseId || metadata?.caseId || metadata?.caseName || customBody || metadata?.message
      )
      if (!hasCaseContext) {
        return NextResponse.json(
          { error: `eventType "${eventType}" requires a case (caseId or caseName) or a message body` },
          { status: 400 }
        )
      }
    }

    // Build email from template
    const emailData = buildEmail(eventType as EmailEventType, {
      recipientName: recipientName || '',
      customSubject,
      customBody,
      ...metadata,
    })

    // Send via Resend
    const { data: resendData, error: resendError } = await resend.emails.send({
      ...emailSendDefaults,
      to: recipientEmail,
      subject: customSubject || emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      return NextResponse.json({ error: resendError.message }, { status: 500 })
    }

    // Log to communication_logs
    const supabase = getSupabaseAdmin()
    const { error: logError } = await supabase.from('communication_logs').insert({
      case_id: caseId || null,
      contact_id: contactId || null,
      communication_type: 'email_sent',
      direction: 'outbound',
      subject: customSubject || emailData.subject,
      summary: emailData.previewText,
      detailed_notes: customBody || metadata.message || null,
      from_name: 'Mark Ettinger, M.D.',
      from_email: emailSendDefaults.from,
      to_emails: [recipientEmail],
      communication_date: new Date().toISOString(),
      follow_up_required: false,
    })

    if (logError) {
      console.error('Communication log error:', logError)
      // Don't fail the request — email was sent successfully
    }

    return NextResponse.json({
      success: true,
      emailId: resendData?.id,
      subject: customSubject || emailData.subject,
    })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
