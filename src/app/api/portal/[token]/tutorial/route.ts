import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'

// POST: Mark the portal tutorial as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate the token (active + unexpired)
    const v = await validatePortalInvite(token, { select: 'id' })
    if (v.error) return v.error
    const { invite, supabase } = v
    const inv = invite as { id: string }

    // Mark tutorial as completed
    const { error: updateError } = await supabase
      .from('portal_invites')
      .update({ tutorial_completed_at: new Date().toISOString() })
      .eq('id', inv.id)

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
