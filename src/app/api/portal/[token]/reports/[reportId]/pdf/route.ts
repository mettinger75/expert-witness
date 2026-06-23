import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'
import { generateReportPdf } from '@/lib/report-pdf-generator'

export const maxDuration = 60 // Allow up to 60s for PDF generation

/**
 * Token-scoped report PDF export for the portal. Replaces the portal's prior
 * use of the public `/api/reports/export-pdf` route (which accepted any
 * reportId with no token or case check — an IDOR). The report is fetched
 * scoped to the invite's case, so a token can only export reports for its own
 * case.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; reportId: string }> }
) {
  try {
    const { token, reportId } = await params

    const v = await validatePortalInvite(token, { permission: 'can_view_reports' })
    if (v.error) return v.error
    const { invite, supabase } = v

    const body = await request.json().catch(() => ({}))
    const includeSignature = body?.includeSignature !== false

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, report_name, rendered_html, collaboration_html, content, status, case_id')
      .eq('id', reportId)
      .eq('case_id', invite.case_id)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    let html = report.collaboration_html || report.rendered_html
    if (!html && report.content && typeof report.content === 'object') {
      const content = report.content as Record<string, unknown>
      if (content.import_mode === 'monolithic' && content.html) {
        html = content.html as string
      }
    }

    if (!html) {
      return NextResponse.json({ error: 'Report has no renderable content' }, { status: 400 })
    }

    const pdfBuffer = await generateReportPdf({
      reportHtml: html,
      reportName: report.report_name,
      includeSignature,
    })

    const sanitizedName = report.report_name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedName}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Portal report PDF error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
