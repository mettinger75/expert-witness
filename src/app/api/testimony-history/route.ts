import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: List testimony history (published only, public-safe)
// Query params:
//   years - number of years back (default 4)
//   type  - filter by testimony_type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearsBack = parseInt(searchParams.get('years') ?? '4', 10)
    const type = searchParams.get('type')

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('testimony_history')
      .select(
        'id, testimony_date, testimony_type, side_retained_by, case_caption, case_number, court_venue, jurisdiction, retaining_attorney, retaining_firm, notes'
      )
      .eq('is_published', true)
      .order('testimony_date', { ascending: false })

    if (yearsBack > 0) {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - yearsBack)
      query = query.gte('testimony_date', cutoff.toISOString().slice(0, 10))
    }

    if (type) {
      query = query.eq('testimony_type', type)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries: data ?? [], yearsBack })
  } catch (err) {
    console.error('Testimony history list error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
