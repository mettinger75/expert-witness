import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { generateReportPdf } from '@/lib/report-pdf-generator'
import { requireAdminUser } from '@/lib/api-admin-auth'

export const maxDuration = 60 // Allow up to 60s for PDF generation

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { reportId, includeSignature = true } = body

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing required field: reportId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, report_name, rendered_html, collaboration_html, content, status')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Get the HTML to render
    let html = report.collaboration_html || report.rendered_html

    // Try monolithic content if no rendered_html
    if (!html && report.content && typeof report.content === 'object') {
      const content = report.content as Record<string, unknown>
      if (content.import_mode === 'monolithic' && content.html) {
        html = content.html as string
      }
    }

    if (!html) {
      return NextResponse.json(
        { error: 'Report has no renderable content' },
        { status: 400 }
      )
    }

    // Generate PDF
    const pdfBuffer = await generateReportPdf({
      reportHtml: html,
      reportName: report.report_name,
      includeSignature,
    })

    // Return PDF as download
    const sanitizedName = report.report_name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_')
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedName}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Report PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
