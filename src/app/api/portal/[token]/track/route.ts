import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/portal/[token]/track
 *
 * Lightweight beacon fired by the portal UI to record granular activity.
 * Body: { event_type: string, event_data?: Record<string, unknown>, session_id?: string }
 *
 * No-ops when ?preview=1 is present so admin previewing doesn't pollute logs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const isPreview = request.nextUrl.searchParams.get('preview') === '1'
    if (isPreview) {
      return NextResponse.json({ success: true, skipped: 'preview' })
    }

    const body = await request.json().catch(() => ({}))
    const eventType: string | undefined = body.event_type
    if (!eventType) {
      return NextResponse.json({ error: 'Missing event_type' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (error || !invite || !invite.is_active) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 })
    }

    const sessionId: string | null =
      body.session_id ||
      request.cookies.get('pi_sid')?.value ||
      request.headers.get('x-portal-session-id') ||
      null

    await supabase.from('portal_activity_log').insert({
      portal_invite_id: invite.id,
      event_type: eventType,
      event_data: body.event_data ?? null,
      session_id: sessionId,
      is_preview: false,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('portal track error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
