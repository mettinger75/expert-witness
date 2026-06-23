import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

/**
 * GET /api/portal/invites/[id]/activity
 *
 * Returns the full access history and granular activity log for a portal invite.
 * Used by the "View All Activity" drawer in the CreatePortalInviteDialog.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const [inviteRes, logsRes, activityRes, messagesRes] = await Promise.all([
      supabase
        .from('portal_invites')
        .select(
          'id, token, view_count, first_accessed_at, last_accessed_at, created_at, expires_at, onboarding_steps, onboarding_completed_at, contacts(first_name, last_name, email)'
        )
        .eq('id', id)
        .single(),
      supabase
        .from('portal_access_log')
        .select('id, accessed_at, session_id, ip_address, user_agent, referrer')
        .eq('portal_invite_id', id)
        .order('accessed_at', { ascending: false })
        .limit(200),
      supabase
        .from('portal_activity_log')
        .select('id, event_type, event_data, session_id, occurred_at')
        .eq('portal_invite_id', id)
        .order('occurred_at', { ascending: false })
        .limit(500),
      supabase
        .from('portal_messages')
        .select('id, sender_type, sender_name, created_at, is_read, read_at')
        .eq('portal_invite_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (inviteRes.error || !inviteRes.data) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Derive helpful summary stats
    const sessions = logsRes.data || []
    const uniqueSessionIds = new Set(sessions.map((s) => s.session_id)).size
    const uniqueDays = new Set(
      sessions.map((s) => new Date(s.accessed_at).toISOString().slice(0, 10))
    ).size

    return NextResponse.json({
      invite: inviteRes.data,
      summary: {
        totalSessions: uniqueSessionIds,
        totalAccessLogEntries: sessions.length,
        uniqueDaysAccessed: uniqueDays,
        firstAccessedAt: inviteRes.data.first_accessed_at,
        lastAccessedAt: inviteRes.data.last_accessed_at,
      },
      accessLog: sessions,
      activityLog: activityRes.data || [],
      messages: messagesRes.data || [],
    })
  } catch (err) {
    console.error('activity fetch error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
