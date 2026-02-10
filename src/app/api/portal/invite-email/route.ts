import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Dr. Mark Ettinger <onboarding@resend.dev>'
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

    const { portalUrl, recipientEmail, recipientName, caseName, invitationMessage, features } = await request.json()

    if (!portalUrl || !recipientEmail || !caseName) {
      return NextResponse.json(
        { error: 'Missing required fields: portalUrl, recipientEmail, caseName' },
        { status: 400 }
      )
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      return NextResponse.json(
        { error: 'At least one feature must be specified' },
        { status: 400 }
      )
    }

    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Counsel,'
    const logoUrl = `${APP_URL}/logo-expert-witness.svg?v=2`

    const featureListHtml = features
      .map(
        (feature: string) =>
          `<tr>
            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <span style="color: #C9A84C; font-size: 16px; margin-right: 8px;">&#10003;</span>
              ${feature}
            </td>
          </tr>`
      )
      .join('')

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header with compass logo -->
          <tr>
            <td style="background-color: #0E1F35; padding: 28px 32px; text-align: center;">
              <img src="${logoUrl}" alt="Mark Ettinger, M.D. - Expert Witness" width="380" height="95" style="display: block; margin: 0 auto; max-width: 380px; height: auto;" />
            </td>
          </tr>

          <!-- Gold accent line -->
          <tr>
            <td style="background-color: #C9A84C; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                ${greeting}
              </p>
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                You've been invited to access the case portal for <strong>${caseName}</strong>.
              </p>

              ${invitationMessage ? `
              <div style="background-color: #fafaf9; border-left: 3px solid #C9A84C; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <p style="color: #44403c; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
                  "${invitationMessage}"
                </p>
                <p style="color: #78716c; font-size: 12px; margin: 8px 0 0 0;">
                  &mdash; Mark Ettinger, M.D.
                </p>
              </div>
              ` : ''}

              <!-- Features list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #0E1F35; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Portal Features</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${featureListHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display: inline-block; background-color: #C9A84C; color: #0E1F35; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                      Access Case Portal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
                This link is private and unique to you. Do not share it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center; line-height: 1.6;">
                This email was sent from the Expert Witness Practice Manager.<br>
                If you did not expect this email, please disregard it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const subject = `Case Portal Invitation \u2014 ${caseName}`

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject,
      html: htmlBody,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    console.error('Portal invite email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
