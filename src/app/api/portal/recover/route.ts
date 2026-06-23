import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPortalInviteEmail } from '@/lib/portal-email'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Self-serve portal-link recovery.
 *
 * A visitor whose link expired or who lost the email can enter the address
 * they were contacted at; we resend their secure link to that address. To
 * avoid email enumeration, the response is ALWAYS the same generic message
 * regardless of whether a match was found — and the link is only ever sent to
 * the address stored on the contact (which equals the entered address), never
 * to an arbitrary string.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GENERIC_MESSAGE =
  "If that email is associated with a case portal, we've sent the secure link to it. Please check your inbox — and your spam folder."

const MAX_EMAILS = 5

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json()
    const email = (rawEmail || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Throttle by IP and email so recovery can't be used to spam an inbox or
    // repeatedly rotate someone's token. Blocked requests still return the
    // generic message (no enumeration signal).
    const ip = clientIp(request)
    const [ipOk, emailOk] = await Promise.all([
      checkRateLimit(`recover:ip:${ip}`, 8, 600),
      checkRateLimit(`recover:email:${email.toLowerCase()}`, 3, 600),
    ])
    if (!ipOk || !emailOk) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const supabase = getSupabaseAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

    // Case-insensitive exact match (ilike with no wildcards). Stored emails are
    // inconsistently cased across older contacts.
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email')
      .ilike('email', email)

    if (contacts && contacts.length > 0) {
      const contactIds = contacts.map((c) => c.id)

      const { data: invites } = await supabase
        .from('portal_invites')
        .select('id, token, case_id, expires_at, contact_id')
        .in('contact_id', contactIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const now = Date.now()
      let sent = 0

      for (const invite of invites || []) {
        if (sent >= MAX_EMAILS) break

        // Revive an expired invite by ROTATING its token — issue a fresh link
        // and invalidate the old (possibly leaked) one, rather than extending
        // the same token in place.
        let token = invite.token
        if (new Date(invite.expires_at).getTime() < now) {
          token = randomBytes(32).toString('hex')
          const newExpiry = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString()
          await supabase
            .from('portal_invites')
            .update({ token, expires_at: newExpiry })
            .eq('id', invite.id)
        }

        const contact = contacts.find((c) => c.id === invite.contact_id)
        const recipientEmail = contact?.email || email
        const portalUrl = `${appUrl}/portal/${token}`

        try {
          await sendPortalInviteEmail({
            recipientEmail,
            portalUrl,
            caseId: invite.case_id,
            isInquiry: false,
          })
          sent++
        } catch (emailErr) {
          console.error('recover: invite email failed', emailErr)
        }
      }
    }

    // Always generic — never reveal whether the email matched a portal.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('Portal recover error:', error)
    // Stay generic even on error so we never leak match information.
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}
