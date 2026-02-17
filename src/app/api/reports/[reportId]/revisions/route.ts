import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: Fetch all revisions for a report (admin use)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const supabase = getSupabaseAdmin()

    const { data: revisions, error } = await supabase
      .from('report_revisions')
      .select('*')
      .eq('report_id', reportId)
      .order('revision_number', { ascending: false })

    if (error) throw error

    return NextResponse.json({ revisions: revisions || [] })
  } catch (error) {
    console.error('Fetch revisions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revisions' },
      { status: 500 }
    )
  }
}
