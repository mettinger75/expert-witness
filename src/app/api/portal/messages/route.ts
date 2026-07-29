import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { caseEmailHeaders, caseEmailSubject } from '@/lib/email-threading'
import { EMAIL_REPLY_TO } from '@/lib/email-config'
import { wrapEmail, htmlToText } from '@/lib/email-templates'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

const SELF_NOTIFY_EMAIL = 'markettingermd@gmail.com'

/**
 * Fire-and-forget: send threaded copies of a provider->attorney message to:
 *   1. The attorney (so they have it in their inbox + a "reply in portal" CTA)
 *   2. Mark himself (so his Gmail thread for the case shows his own outbound)
 * Silent no-op if RESEND_API_KEY is missing.
 */
async function notifyProviderMessage(opts: {
  supabase: SupabaseAdmin
  caseId: string
  messageId: string
  content: string
  portalInviteId: string
}): Promise<void> {
  const { supabase, caseId, messageId, content, portalInviteId } = opts

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  try {
    // Look up attorney + case context
    const { data: invite } = await supabase
      .from('portal_invites')
      .select('token, contacts(first_name, last_name, email)')
      .eq('id', portalInviteId)
      .single()

    const { data: caseRow } = await supabase
      .from('cases')
      .select('case_number, case_name, status')
      .eq('id', caseId)
      .single()

    if (!invite || !caseRow) return

    const contact = (invite as { contacts?: { first_name?: string; last_name?: string; email?: string } | null }).contacts
    const attorneyEmail = contact?.email
    const attorneyName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Counsel'
    const token = (invite as { token?: string }).token

    const caseNumber = (caseRow as { case_number?: string | null }).case_number ?? null
    const caseName = (caseRow as { case_name?: string | null }).case_name || 'a case'
    const isInquiry = (caseRow as { status?: string | null }).status === 'inquiry'

    const subject = caseEmailSubject(caseNumber, caseName, isInquiry)
    const headers = caseEmailHeaders(caseId, { selfLabel: messageId })

    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const snippet = escape(content).replace(/\n/g, '<br/>')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const portalUrl = token ? `${appUrl}/portal/${token}` : appUrl
    const adminUrl = `${appUrl}/cases/${caseId}/messages`

    // 1. Email to attorney
    if (attorneyEmail) {
      const html = wrapEmail({
        subject,
        previewText: `New message on ${escape(caseName)}`,
        heading: 'New message',
        skipSignature: true,
        bodyHtml: `
          <p>${escape(attorneyName)}, you have a new message on <strong>${escape(caseName)}</strong>:</p>
          <blockquote style="margin: 14px 0; padding: 12px 16px; background: #f7f8fa; border-left: 3px solid #DFC06A; color: #1f2933; font-size: 14px; line-height: 1.6;">${snippet}</blockquote>
        `,
        ctaLabel: 'Reply in portal',
        ctaUrl: portalUrl,
      })

      void fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
          to: attorneyEmail,
          reply_to: EMAIL_REPLY_TO,
          subject,
          headers,
          html,
          text: htmlToText(html),
        }),
      }).catch((err) => console.error('[provider-message-notify] attorney email error:', err))
    }

    // 2. Self-copy to Mark so his Gmail thread shows his own outbound
    const selfHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 24px 32px; border: 1px solid #e5e7eb;">
          <p style="color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">
            You sent → ${escape(attorneyName)}${attorneyEmail ? ` &lt;${escape(attorneyEmail)}&gt;` : ''}
          </p>
          <p style="color: #374151; font-size: 13px; margin: 0 0 12px;">
            on <strong>${escape(caseName)}</strong>${caseNumber ? ` (${escape(caseNumber)})` : ''}
          </p>
          <blockquote style="margin: 0; padding: 12px 16px; background: #F0F2F5; border-left: 3px solid #DFC06A; color: #0E1F35; font-size: 14px; line-height: 1.6;">
            ${snippet}
          </blockquote>
          <p style="text-align: center; margin: 20px 0 0;">
            <a href="${adminUrl}" style="color: #0E1F35; font-size: 13px; text-decoration: underline;">View thread</a>
          </p>
        </div>
      </div>`

    // Use a slightly different self-label so the self-copy gets its own
    // Message-ID; Gmail dedupes by In-Reply-To/References (both point to root)
    const selfHeaders = caseEmailHeaders(caseId, { selfLabel: `${messageId}-self` })

    void fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
        to: SELF_NOTIFY_EMAIL,
        subject,
        headers: selfHeaders,
        html: selfHtml,
      }),
    }).catch((err) => console.error('[provider-message-notify] self-copy error:', err))
  } catch (err) {
    console.error('[provider-message-notify] Failed:', err)
  }
}

// GET: List all portal messages for a case (dashboard view)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Mark attorney messages as read (provider is viewing)
    await supabase
      .from('portal_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('case_id', caseId)
      .eq('sender_type', 'attorney')
      .eq('is_read', false)

    const { data: messages, error } = await supabase
      .from('portal_messages')
      .select('*, portal_invites(*, contacts(*))')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Also surface the active invite for the case so the UI can compose
    // a message even when the thread is empty
    const { data: invite } = await supabase
      .from('portal_invites')
      .select('id, token, can_message, contacts(first_name, last_name, email)')
      .eq('case_id', caseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ messages: messages || [], invite: invite || null })
  } catch (error) {
    console.error('Portal messages fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Send a message from Dr. Ettinger (dashboard)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { portalInviteId, caseId, content } = await request.json()

    if (!portalInviteId || !caseId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const trimmedContent = content.trim()
    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: portalInviteId,
        case_id: caseId,
        sender_type: 'provider',
        sender_name: 'Mark Ettinger, M.D.',
        content: trimmedContent,
      })
      .select()
      .single()

    if (error) throw error

    // Fire-and-forget: email both the attorney and Mark, threaded under the case
    void notifyProviderMessage({
      supabase,
      caseId,
      messageId: message.id,
      content: trimmedContent,
      portalInviteId,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Portal message creation error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
