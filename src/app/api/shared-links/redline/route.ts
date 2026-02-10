import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const entityId = request.nextUrl.searchParams.get('entityId')
    const entityType = request.nextUrl.searchParams.get('entityType') || 'report'

    if (!entityId) {
      return NextResponse.json(
        { error: 'Missing entityId' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all shared links for this entity that have edits
    const { data: links, error } = await supabase
      .from('shared_links')
      .select('id, permission, recipient_name, recipient_email, original_html, edited_html, editor_notes, edited_at, edited_by_name, created_at')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('permission', 'edit')
      .not('edited_html', 'is', null)
      .order('edited_at', { ascending: false })

    if (error) {
      console.error('Redline fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch redline data' },
        { status: 500 }
      )
    }

    return NextResponse.json({ links: links || [] })
  } catch (error) {
    console.error('Redline API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
