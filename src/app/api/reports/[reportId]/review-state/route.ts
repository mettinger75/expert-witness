import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// PUT: Auto-save review state (per-change accept/reject/modify decisions)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { revisionId, reviewState } = await request.json()

    if (!revisionId || !reviewState) {
      return NextResponse.json(
        { error: 'revisionId and reviewState are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Verify the revision belongs to this report
    const { data: revision, error: revisionError } = await supabase
      .from('report_revisions')
      .select('id, report_id')
      .eq('id', revisionId)
      .eq('report_id', reportId)
      .single()

    if (revisionError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found for this report' },
        { status: 404 }
      )
    }

    // Save the review state
    const { error: updateError } = await supabase
      .from('report_revisions')
      .update({ review_state: reviewState })
      .eq('id', revisionId)

    if (updateError) {
      console.error('Failed to save review state:', updateError)
      return NextResponse.json(
        { error: 'Failed to save review state' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review state save error:', error)
    return NextResponse.json(
      { error: 'Failed to save review state' },
      { status: 500 }
    )
  }
}
