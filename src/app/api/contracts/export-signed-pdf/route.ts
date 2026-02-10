import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { contractId } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    let html = contract.rendered_html || ''

    // If signed, embed the signature into the HTML
    if (contract.signature_data && contract.signed_at) {
      const signatureBlock = `
        <div style="margin-top: 2rem; border-top: 1px solid #d1d5db; padding-top: 1rem;">
          <div style="margin-bottom: 1rem;">
            <img src="${contract.signature_data}" alt="Signature" style="max-height: 80px; margin-bottom: 0.5rem;" />
            <div style="font-family: Georgia, serif; font-size: 11pt; color: #1a1a1a;">
              <strong>${contract.signed_by || 'Signed'}</strong><br>
              Signed electronically on ${new Date(contract.signed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      `

      // Try to insert before closing body tag, or append
      if (html.includes('</body>')) {
        html = html.replace('</body>', signatureBlock + '</body>')
      } else {
        html += signatureBlock
      }
    }

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Signed PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to export signed contract' },
      { status: 500 }
    )
  }
}
