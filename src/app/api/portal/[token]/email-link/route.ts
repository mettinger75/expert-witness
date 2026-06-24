import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'
import { sendPortalInviteEmail } from '@/lib/portal-email'

/**
 * Token-scoped "email me my link" for the portal save-link prompt. Emails the
 * portal link to the contact ON FILE for this invite (never a client-supplied
 * address), so a visitor can resend their own link to themselves. Replaces the
 * portal's prior call to the now-admin-only /api/portal/invite-email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const v = await validatePortalInvite(token)
    if (v.error) return v.error
    const { invite, supabase } = v

    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('id', invite.contact_id as string)
      .single()

    if (!contact?.email) {
      return NextResponse.json({ error: 'No email on file for this portal' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const portalUrl = `${appUrl}/portal/${token}`

    const result = await sendPortalInviteEmail({
      recipientEmail: contact.email,
      recipientName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      portalUrl,
      caseId: invite.case_id as string,
      isInquiry: false,
    })

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal email-link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
