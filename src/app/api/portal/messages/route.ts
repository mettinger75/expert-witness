import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: List all portal messages for a case (dashboard view)
export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Portal messages fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Send a message from Dr. Ettinger (dashboard)
export async function POST(request: NextRequest) {
  try {
    const { portalInviteId, caseId, content } = await request.json()

    if (!portalInviteId || !caseId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: portalInviteId,
        case_id: caseId,
        sender_type: 'provider',
        sender_name: 'Dr. Mark Ettinger',
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Portal message creation error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
