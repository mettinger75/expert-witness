import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

/**
 * GET /api/portal/messages/unread-count
 *
 * Returns the total number of attorney-authored portal messages that
 * Dr. Ettinger has not yet read. Used to render the unread badge in
 * the sidebar so missed portal notes stay visible until triaged.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const supabase = getSupabaseAdmin()

    const { count, error } = await supabase
      .from('portal_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_type', 'attorney')
      .eq('is_read', false)

    if (error) throw error

    // Also break it down per case so the UI can show where the unread
    // notes live without a second round-trip.
    const { data: rows, error: rowsError } = await supabase
      .from('portal_messages')
      .select('case_id')
      .eq('sender_type', 'attorney')
      .eq('is_read', false)

    if (rowsError) throw rowsError

    const byCase: Record<string, number> = {}
    for (const r of rows || []) {
      const cid = (r as { case_id: string | null }).case_id
      if (!cid) continue
      byCase[cid] = (byCase[cid] || 0) + 1
    }

    return NextResponse.json({
      total: count || 0,
      byCase,
    })
  } catch (error) {
    console.error('Unread portal count error:', error)
    return NextResponse.json(
      { total: 0, byCase: {}, error: 'Failed to fetch unread count' },
      { status: 500 },
    )
  }
}
