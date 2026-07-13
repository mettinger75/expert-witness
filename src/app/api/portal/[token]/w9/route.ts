import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'

// GET: Stream Dr. Ettinger's current W-9 to a valid portal recipient. The PDF
// lives in the private `firm-documents` bucket (not `public/`), so — unlike
// the old static /ettinger-w9.pdf link — it's never reachable without a
// valid, unexpired portal token.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const v = await validatePortalInvite(token)
    if (v.error) return v.error
    const { supabase } = v

    const { data, error } = await supabase.storage
      .from('firm-documents')
      .download('ettinger-w9.pdf')

    if (error || !data) {
      return NextResponse.json({ error: 'W-9 is not currently available' }, { status: 404 })
    }

    const pdfBuffer = Buffer.from(await data.arrayBuffer())

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Ettinger-W9.pdf"',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Portal W-9 fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch W-9' }, { status: 500 })
  }
}
