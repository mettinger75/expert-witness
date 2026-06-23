import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: List leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const side = searchParams.get('side')
    const search = searchParams.get('search')

    let query = supabase
      .from('leads')
      .select('*')
      .order('priority', { ascending: true }) // 'high' sorts before 'normal'
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (side) query = query.eq('side', side)
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,firm_name.ilike.%${search}%,location.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('Leads fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new lead
// Accepts requests from the UI or from the scheduled task (x-api-key header)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey && apiKey !== process.env.LEADS_API_KEY?.trim()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const body = await request.json()

    if (!body.firm_name && !body.last_name && !body.first_name) {
      return NextResponse.json(
        { error: 'At least one of firm_name, first_name, or last_name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        firm_name: body.firm_name || null,
        location: body.location || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
        side: body.side || 'unknown',
        priority: body.priority || 'normal',
        status: 'new',
        context: body.context || null,
        source_url: body.source_url || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Lead creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Leads POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
