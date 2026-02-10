import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

// GET: Validate token and return entity data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Look up the shared link
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

    // Check max views
    if (link.max_views && link.view_count >= link.max_views) {
      return NextResponse.json(
        { error: 'This link has reached its maximum number of views' },
        { status: 410 }
      )
    }

    // Check PIN if required
    const pinParam = request.nextUrl.searchParams.get('pin')
    if (link.pin_hash) {
      if (!pinParam) {
        return NextResponse.json(
          { error: 'PIN required', requiresPin: true },
          { status: 401 }
        )
      }
      const providedHash = crypto.createHash('sha256').update(pinParam).digest('hex')
      if (providedHash !== link.pin_hash) {
        // Log failed attempt
        await supabase.from('shared_link_events').insert({
          shared_link_id: link.id,
          event_type: 'pin_failed',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
          user_agent: request.headers.get('user-agent') || null,
        })
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        )
      }
    }

    // Increment view count and update access time
    await supabase
      .from('shared_links')
      .update({
        view_count: link.view_count + 1,
        last_accessed_at: new Date().toISOString(),
        last_accessed_ip: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      })
      .eq('id', link.id)

    // Log view event
    await supabase.from('shared_link_events').insert({
      shared_link_id: link.id,
      event_type: 'viewed',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: request.headers.get('user-agent') || null,
    })

    // Fetch the entity
    const table = link.entity_type === 'report' ? 'reports' : 'contracts'
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select('*')
      .eq('id', link.entity_id)
      .single()

    if (entityError || !entity) {
      return NextResponse.json(
        { error: `${link.entity_type} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      link: {
        id: link.id,
        entity_type: link.entity_type,
        permission: link.permission,
        recipient_name: link.recipient_name,
        expires_at: link.expires_at,
        original_html: link.original_html || null,
        edited_html: link.edited_html || null,
      },
      entity,
    })
  } catch (error) {
    console.error('Shared link validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Save edits (requires edit permission)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { content } = await request.json()
    const supabase = getSupabaseAdmin()

    // Validate token and permission
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

    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 410 }
      )
    }

    if (link.permission !== 'edit') {
      return NextResponse.json(
        { error: 'This link does not have edit permission' },
        { status: 403 }
      )
    }

    // Save edits to the shared_link record ONLY — do NOT overwrite the original report.
    // This preserves the original for redline comparison. Dr. Ettinger can accept/reject from his dashboard.
    const { error: updateError } = await supabase
      .from('shared_links')
      .update({
        edited_html: content,
        edited_at: new Date().toISOString(),
        edited_by_name: link.recipient_name || 'Unknown',
      })
      .eq('id', link.id)

    if (updateError) throw updateError

    // Log edit event
    await supabase.from('shared_link_events').insert({
      shared_link_id: link.id,
      event_type: 'edited',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent: request.headers.get('user-agent') || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Shared link edit error:', error)
    return NextResponse.json(
      { error: 'Failed to save changes' },
      { status: 500 }
    )
  }
}
