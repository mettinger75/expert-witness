import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { buildEmail } from '@/lib/email-templates'
import { emailSendDefaults } from '@/lib/email-config'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * GET /api/emails/outreach?firstName=X&lastName=Y&subject=Z&message=W
 * Returns a preview of the outreach email HTML without sending it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const firstName = searchParams.get('firstName') || ''
  const lastName = searchParams.get('lastName') || ''
  const subject = searchParams.get('subject') || undefined
  const message = searchParams.get('message') || undefined

  const recipientName = [firstName, lastName].filter(Boolean).join(' ') || 'Attorney'

  const emailData = buildEmail('outreach', {
    recipientName,
    customSubject: subject || undefined,
    message: message || undefined,
  })

  return NextResponse.json({ subject: emailData.subject, html: emailData.html })
}

/**
 * POST /api/emails/outreach
 * Send the branded outreach email to a prospective attorney.
 * Finds or creates the contact, sends the email, and logs it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, message, subject } = body

    if (!firstName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, email' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const recipientName = `${firstName} ${lastName}`

    // 1. Find or create contact
    let contactId: string | null = null
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (existingContact) {
      contactId = existingContact.id
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          contact_type: 'attorney',
          first_name: firstName,
          last_name: lastName,
          email,
        })
        .select('id')
        .single()

      if (contactError) {
        console.error('Contact creation error:', contactError)
      } else if (newContact) {
        contactId = newContact.id
      }
    }

    // 2. Build and send outreach email
    const emailData = buildEmail('outreach', {
      recipientName,
      customSubject: subject || undefined,
      message: message || undefined,
    })

    const { data: resendData, error: resendError } = await resend.emails.send({
      ...emailSendDefaults,
      to: email,
      subject: emailData.subject,
      html: emailData.html,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      return NextResponse.json({ error: resendError.message }, { status: 500 })
    }

    // 3. Log to communication_logs
    const { error: logError } = await supabase.from('communication_logs').insert({
      contact_id: contactId,
      communication_type: 'email_sent',
      direction: 'outbound',
      subject: emailData.subject,
      summary: `Outreach email sent to ${recipientName} (${email})`,
      from_name: 'Mark Ettinger, M.D.',
      from_email: emailSendDefaults.from,
      to_emails: [email],
      communication_date: new Date().toISOString(),
      follow_up_required: true,
    })

    if (logError) {
      console.error('Communication log error:', logError)
    }

    // 4. Update consultation_requests if one exists for this email
    await supabase
      .from('consultation_requests')
      .update({ status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('email', email)
      .eq('status', 'new')

    return NextResponse.json({
      success: true,
      emailId: resendData?.id,
      contactId,
      subject: emailData.subject,
    })
  } catch (error) {
    console.error('Outreach email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
