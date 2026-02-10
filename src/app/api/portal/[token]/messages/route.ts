import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        portal_invite_id: invite.id,
        case_id: invite.case_id,
        sender_type: 'attorney',
        sender_name: senderName,
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
