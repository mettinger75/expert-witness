import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Resend inbound webhook handler
// Receives forwarded emails and stores them as communication logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Resend inbound webhook payload
    const {
      from,
      to,
      subject,
      text,
      html,
    } = body

    if (!from || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // For now, log the email. Since communication_logs requires a case_id,
    // we'll need to match the email to a case by searching contacts or
    // using a case-specific email address pattern.
    //
    // Future: When case_id is made nullable, store as unassigned.
    // For now, try to find a matching case by searching contacts with the sender email.
    const fromEmail = typeof from === 'string'
      ? from.match(/<(.+?)>/)?.[1] || from
      : from.address || from

    // Search for a contact with this email
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', fromEmail)
      .limit(1)

    let caseId: string | null = null
    let contactId: string | null = null

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id

      // Find the most recent case this contact is linked to
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

    // If we found a matching case, create the communication log
    if (caseId) {
      await supabase.from('communication_logs').insert({
        case_id: caseId,
        contact_id: contactId,
        communication_type: 'email_inbound',
        direction: 'inbound',
        subject: subject || '(no subject)',
        summary: text?.substring(0, 500) || html?.substring(0, 500) || 'Email received',
        details: text || null,
        communication_date: new Date().toISOString(),
      })

      return NextResponse.json({ status: 'logged', caseId })
    }

    // No matching case found - log for manual assignment later
    // Note: This will fail if case_id is NOT NULL in the schema.
    // In that case, consider creating a default "unassigned" case or
    // making case_id nullable in the schema.
    console.log('Inbound email received but no matching case found:', {
      from: fromEmail,
      subject,
    })

    return NextResponse.json({
      status: 'received',
      message: 'Email received but no matching case found. Manual assignment needed.',
    })
  } catch (error) {
    console.error('Inbound email webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
