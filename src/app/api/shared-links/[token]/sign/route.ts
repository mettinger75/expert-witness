import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signContract } from '@/lib/contract-signing'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { signatureData, signerName, agreed } = await request.json()

    if (!signatureData || !signerName || !agreed) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Validate the token
    const { data: link, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !link) {
      return NextResponse.json(
        { error: 'Link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 410 }
      )
    }

    // Verify permission
    if (link.permission !== 'sign') {
      return NextResponse.json(
        { error: 'This link does not have signing permission' },
        { status: 403 }
      )
    }

    // Verify entity is a contract
    if (link.entity_type !== 'contract') {
      return NextResponse.json(
        { error: 'Only contracts can be signed' },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = request.headers.get('user-agent') || null

    // Sign the contract using shared utility
    const { signedAt } = await signContract(supabase, {
      contractId: link.entity_id,
      signatureData,
      signerName,
      ip,
      userAgent,
    })

    // Deactivate the share link (one-time use for signing)
    await supabase
      .from('shared_links')
      .update({
        is_active: false,
        updated_at: signedAt,
      })
      .eq('id', link.id)

    // Log signed event
    await supabase.from('shared_link_events').insert({
      shared_link_id: link.id,
      event_type: 'signed',
      ip_address: ip,
      user_agent: userAgent,
      metadata: { signer_name: signerName },
    })

    return NextResponse.json({
      success: true,
      signedAt,
    })
  } catch (error) {
    console.error('Contract signing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
