import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { appendAnalysisToPage, extractPageId } from '@/lib/notion'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: 'NOTION_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { caseId } = await request.json()
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (!caseData.notion_page_url && !caseData.notion_page_id) {
      return NextResponse.json(
        { error: 'No Notion page linked to this case. Add a Notion URL in the case settings.' },
        { status: 400 }
      )
    }

    // Extract page ID if not already stored
    let pageId = caseData.notion_page_id
    if (!pageId && caseData.notion_page_url) {
      pageId = extractPageId(caseData.notion_page_url)
      await supabase
        .from('cases')
        .update({ notion_page_id: pageId })
        .eq('id', caseId)
    }

    // Check if there's any analysis to push
    const hasAnalysis = caseData.brief_summary ||
      caseData.standard_of_care_issues ||
      caseData.causation_notes ||
      caseData.damages_summary ||
      caseData.opinion_summary

    if (!hasAnalysis) {
      return NextResponse.json(
        { error: 'No AI analysis to push. Run "Analyze Case" first.' },
        { status: 400 }
      )
    }

    // Push analysis to Notion
    await appendAnalysisToPage(pageId!, {
      brief_summary: caseData.brief_summary,
      key_issues: caseData.key_issues,
      standard_of_care_issues: caseData.standard_of_care_issues,
      causation_notes: caseData.causation_notes,
      damages_summary: caseData.damages_summary,
      preliminary_opinion: caseData.preliminary_opinion,
      opinion_summary: caseData.opinion_summary,
    })

    // Update last synced timestamp
    await supabase
      .from('cases')
      .update({ notion_last_synced: new Date().toISOString() })
      .eq('id', caseId)

    return NextResponse.json({
      message: 'Analysis pushed to Notion successfully',
      pageId,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Notion push error:', error)
    const message = error instanceof Error ? error.message : 'Failed to push to Notion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
