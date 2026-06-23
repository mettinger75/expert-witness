import { NextRequest, NextResponse } from 'next/server'

// POST: Send email notification to Dr. Ettinger on case events
export async function POST(request: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not set' })
    }

    const body = await request.json()
    const { event, caseId, caseName, caseNumber, changedFields } = body

    if (!event || !caseId) {
      return NextResponse.json({ error: 'Missing event or caseId' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const caseUrl = `${appUrl}/cases/${caseId}`

    let subject: string
    let bodyHtml: string

    if (event === 'created') {
      subject = `New Case Created: ${caseName || 'Unknown'}`
      bodyHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
            <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">New Case Created</h1>
          </div>
          <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              A new case has been created in the Expert Witness Practice Manager.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Case Name:</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${caseName || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Case Number:</td>
                <td style="padding: 8px 0; font-size: 14px;">${caseNumber || '-'}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${caseUrl}" style="display: inline-block; background-color: #0E1F35; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Case
              </a>
            </div>
          </div>
        </div>
      `
    } else if (event === 'updated') {
      const fields = changedFields || []
      const fieldsList = fields
        .map((f: string) => `<li style="padding: 2px 0; text-transform: capitalize;">${f.replace(/_/g, ' ')}</li>`)
        .join('')

      subject = `Case Updated: ${caseName || 'Unknown'}`
      bodyHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
            <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">Case Updated</h1>
          </div>
          <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              <strong>${caseName || 'A case'}</strong> (${caseNumber || ''}) has been updated.
            </p>
            ${fields.length > 0 ? `
              <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Fields changed:</p>
              <ul style="color: #374151; font-size: 14px; line-height: 1.8;">${fieldsList}</ul>
            ` : ''}
            <div style="text-align: center; margin: 28px 0;">
              <a href="${caseUrl}" style="display: inline-block; background-color: #0E1F35; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Case
              </a>
            </div>
          </div>
        </div>
      `
    } else {
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Expert Witness <noreply@meridian-anesthesia.com>',
        to: 'markettingermd@gmail.com',
        subject,
        html: bodyHtml,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Resend notification error:', errorText)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Case notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
