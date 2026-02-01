import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { fetchPageContent, extractPageId } from '@/lib/notion'

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
      .select('notion_page_url, notion_page_id')
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
      // Store the extracted page ID for future use
      await supabase
        .from('cases')
        .update({ notion_page_id: pageId })
        .eq('id', caseId)
    }

    // Fetch content from Notion
    const content = await fetchPageContent(pageId!)

    return NextResponse.json({
      content,
      pageId,
      characterCount: content.length,
      lineCount: content.split('\n').filter(Boolean).length,
    })
  } catch (error) {
    console.error('Notion pull error:', error)
    const message = error instanceof Error ? error.message : 'Failed to pull from Notion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
