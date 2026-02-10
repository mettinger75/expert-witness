import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { wrapReportHtml } from '@/lib/report-html-template'
import HTMLtoDOCX from 'html-to-docx'

const SECTION_ORDER = [
  'introduction',
  'qualifications',
  'narrative_summary',
  'clinical_analysis',
  'breach_analysis',
  'causation',
  'conclusion',
]

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json()

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    let fullHtml: string

    // Check if this is a monolithic imported report
    const content = report.content as Record<string, unknown> | null
    if (content && content.import_mode === 'monolithic') {
      // Use rendered_html directly for imported reports
      fullHtml = (report.rendered_html as string) || (content.html as string) || ''
    } else {
      // Section-based report: assemble from sections_data
      const sectionsData = (report.sections_data || {}) as Record<
        string,
        { title: string; content: string; is_ai_generated: boolean }
      >

      const header = content
        ? (content as { header?: string }).header || ''
        : ''
      const footer = content
        ? (content as { footer?: string }).footer || ''
        : ''

      const sections = SECTION_ORDER.filter((key) => sectionsData[key]).map((key) => ({
        title: sectionsData[key].title,
        content: sectionsData[key].content,
      }))

      fullHtml = wrapReportHtml({
        header,
        sections,
        footer,
        reportName: report.report_name,
      })
    }

    // Convert HTML to DOCX
    const docxBuffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    })

    // Return as DOCX file download
    const filename = `${report.report_name || 'Expert_Report'}.docx`
      .replace(/[^a-zA-Z0-9_\-. ]/g, '_')

    const buffer = Buffer.from(docxBuffer as Buffer)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('DOCX export error:', error)
    return NextResponse.json(
      { error: 'Failed to export DOCX' },
      { status: 500 }
    )
  }
}
