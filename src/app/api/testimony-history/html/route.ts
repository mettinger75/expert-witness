import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { generateTestimonyHistoryHtml } from '@/lib/testimony-history-html'
import type { TestimonyHistoryRow } from '@/services/testimonyHistory.service'

// GET: Render testimony history as a print-ready HTML page.
// Public — only published entries are returned.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearsBack = parseInt(searchParams.get('years') ?? '4', 10)

    const supabase = getSupabaseAdmin()
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - yearsBack)

    const { data, error } = await supabase
      .from('testimony_history')
      .select('*')
      .eq('is_published', true)
      .gte('testimony_date', cutoff.toISOString().slice(0, 10))
      .order('testimony_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const html = generateTestimonyHistoryHtml(
      (data ?? []) as TestimonyHistoryRow[],
      { yearsBack }
    )

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('Testimony history HTML error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
