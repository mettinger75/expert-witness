import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { caseEmailHeaders, caseEmailSubject } from '@/lib/email-threading'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

const NOTIFY_EMAIL = 'markettingermd@gmail.com'

/**
 * Fire-and-forget: send Dr. Ettinger an email whenever an attorney posts a
 * portal message. Threads under the case's root Message-ID so the email
 * lands inside an existing Gmail conversation for the case. Silent no-op
 * if RESEND_API_KEY is missing; never blocks the HTTP response or rethrows.
 */
async function notifyPortalMessage(opts: {
  supabase: SupabaseAdmin
  caseId: string | null
  messageId: string
  senderName: string
  content: string
}): Promise<void> {
  const { supabase, caseId, messageId, senderName, content } = opts

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[portal-message-notify] RESEND_API_KEY not set — skipping')
    return
  }

  try {
    // Look up case context for subject + threading
    let caseNumber: string | null = null
    let caseName = 'a case'
    let isInquiry = false
    let caseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    if (caseId) {
      const { data: caseRow } = await supabase
        .from('cases')
        .select('case_number, case_name, status')
        .eq('id', caseId)
        .single()
      if (caseRow) {
        caseNumber = (caseRow as { case_number?: string | null }).case_number ?? null
        caseName = (caseRow as { case_name?: string | null }).case_name || caseName
        isInquiry = (caseRow as { status?: string | null }).status === 'inquiry'
      }
      caseUrl = `${caseUrl}/cases/${caseId}/messages`
    }

    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const snippet = escape(content).replace(/\n/g, '<br/>')

    const subject = caseId
      ? caseEmailSubject(caseNumber, caseName, isInquiry)
      : `New portal note from ${senderName}`

    const headers = caseId
      ? caseEmailHeaders(caseId, { selfLabel: messageId })
      : undefined

    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">New portal message</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            <strong>${escape(senderName)}</strong> sent a message on
            <strong>${escape(caseName)}</strong>:
          </p>
          <blockquote style="margin: 16px 0; padding: 12px 16px; background: #F0F2F5; border-left: 3px solid #DFC06A; color: #0E1F35; font-size: 14px; line-height: 1.6;">
            ${snippet}
          </blockquote>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${caseUrl}" style="display: inline-block; background-color: #0E1F35; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
              Reply in portal
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
            Expert Witness Practice — portal notification
          </p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Expert Witness <noreply@meridian-anesthesia.com>',
        to: NOTIFY_EMAIL,
        subject,
        ...(headers ? { headers } : {}),
        html,
      }),
    })
    if (!res.ok) {
      console.error(
        '[portal-message-notify] Resend returned non-OK:',
        res.status,
        await res.text().catch(() => ''),
      )
    }
  } catch (err) {
    console.error('[portal-message-notify] Failed to send:', err)
  }
}

// GET: List messages for a portal invite
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    const { data: invite } = await supabase
      .from('portal_invites')
      .select('id, can_message')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 })
    }
    if (!invite.can_message) {
      return NextResponse.json({ error: 'Messaging not enabled' }, { status: 403 })
    }

    // Mark provider messages as read (attorney is viewing)
    await supabase
      .from('portal_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('portal_invite_id', invite.id)
      .eq('sender_type', 'provider')
      .eq('is_read', false)

    const { data: messages, error } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('portal_invite_id', invite.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Portal messages fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Create a message from the attorney
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: invite } = await supabase
      .from('portal_invites')
      .select('id, case_id, contact_id, can_message, contacts(first_name, last_name)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 })
    }
    if (!invite.can_message) {
      return NextResponse.json({ error: 'Messaging not enabled' }, { status: 403 })
    }

    const contact = invite.contacts as unknown as { first_name: string; last_name: string } | null
    const senderName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'
    const trimmedContent = content.trim()

    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: invite.id,
        case_id: invite.case_id,
        sender_type: 'attorney',
        sender_name: senderName,
        content: trimmedContent,
      })
      .select()
      .single()

    if (error) throw error

    // Fire-and-forget: notify Dr. Ettinger of the new portal note
    void notifyPortalMessage({
      supabase,
      caseId: invite.case_id,
      messageId: message.id,
      senderName,
      content: trimmedContent,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Portal message creation error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
