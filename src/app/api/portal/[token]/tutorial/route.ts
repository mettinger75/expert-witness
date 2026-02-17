import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// POST: Mark the portal tutorial as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate the token
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('id')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Portal invite not found' },
        { status: 404 }
      )
    }

    // Mark tutorial as completed
    const { error: updateError } = await supabase
      .from('portal_invites')
      .update({ tutorial_completed_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Tutorial completion update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update tutorial status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tutorial completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
