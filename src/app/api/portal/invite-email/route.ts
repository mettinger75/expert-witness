import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EMAIL_BCC, EMAIL_REPLY_TO } from '@/lib/email-config'

/**
 * Normalize a "From" email header so display names with special characters
 * (commas, periods in initials, etc.) are properly quoted per RFC 5322.
 *
 * Input  : `Mark Ettinger, M.D. <mark@example.com>`
 * Output : `"Mark Ettinger, M.D." <mark@example.com>`
 *
 * Without quoting, Resend/SMTP parsers treat the comma as an address
 * separator and the send fails with a cryptic error.
 */
function normalizeFromEmail(from: string): string {
  const match = from.match(/^(.+?)\s*<([^>]+)>\s*$/)
  if (!match) return from
  const [, rawName, email] = match
  const name = rawName.trim().replace(/^"|"$/g, '') // strip existing quotes
  // Quote if the name has special chars that would otherwise break parsing
  const needsQuoting = /[,;:@()<>\[\]\\"]/.test(name)
  const displayName = needsQuoting ? `"${name.replace(/"/g, '\\"')}"` : name
  return `${displayName} <${email.trim()}>`
}

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM_EMAIL = normalizeFromEmail(
      process.env.RESEND_FROM_EMAIL || 'Dr. Mark Ettinger <onboarding@resend.dev>'
    )
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

    if (!process.env.RESEND_API_KEY) {
      console.error('Portal invite email: RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'Email service is not configured (missing RESEND_API_KEY)' },
        { status: 500 }
      )
    }

    const body = await request.json()

    // Support both old param names and new ones from SendForSignatureDialog
    const portalUrl = body.portalUrl
    const recipientEmail = body.recipientEmail || body.contactEmail
    const recipientName = body.recipientName || body.contactName
    const caseName = body.caseName
    const invitationMessage = body.invitationMessage || body.message
    const features = body.features
    const contractTitle = body.contractTitle
    const isInquiry = body.isInquiry === true

    // If caseId is provided but caseName isn't, fetch it
    let resolvedCaseName = caseName
    if (!resolvedCaseName && body.caseId) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
        const supabase = getSupabaseAdmin()
        const { data: caseData } = await supabase
          .from('cases')
          .select('case_name')
          .eq('id', body.caseId)
          .single()
        resolvedCaseName = caseData?.case_name || 'your case'
      } catch {
        resolvedCaseName = 'your case'
      }
    }

    if (!portalUrl || !recipientEmail || (!resolvedCaseName && !isInquiry)) {
      return NextResponse.json(
        { error: 'Missing required fields: portalUrl, recipientEmail, caseName/caseId' },
        { status: 400 }
      )
    }

    // Auto-build features list if not provided
    const resolvedFeatures: string[] = features && Array.isArray(features) && features.length > 0
      ? features
      : isInquiry
        ? [
            'Review fee schedule and rates',
            'Review qualifications and curriculum vitae',
            'Provide case details for initial evaluation',
            'Schedule a consultation call',
          ]
        : [
            ...(contractTitle ? ['Review and sign the retention agreement'] : []),
            'View case summary and updates',
            'Send secure messages',
            'Upload documents and records',
            'View fee schedule',
          ]

    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Counsel,'
    const logoUrl = `${APP_URL}/logo-expert-witness.svg?v=2`

    const featureListHtml = resolvedFeatures
      .map(
        (feature: string) =>
          `<tr>
            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <span style="color: #DFC06A; font-size: 16px; margin-right: 8px;">&#10003;</span>
              ${feature}
            </td>
          </tr>`
      )
      .join('')

    // Contract-specific action required callout
    const contractCalloutHtml = contractTitle
      ? `
      <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0;">
              <strong style="color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">&#9888; Action Required</strong>
              <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 8px 0 0 0;">
                Please review and sign the <strong>${contractTitle}</strong> at your earliest convenience.
              </p>
            </td>
          </tr>
        </table>
      </div>`
      : ''

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
            <td style="background-color: #DFC06A; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                ${greeting}
              </p>
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                ${isInquiry
                  ? 'Mark Ettinger, M.D. would like to invite you to review his qualifications and fee schedule for a potential expert witness engagement in anesthesiology.'
                  : `You've been invited to access the case portal for <strong>${resolvedCaseName}</strong>.`}
              </p>

              ${contractCalloutHtml}

              ${invitationMessage ? `
              <div style="background-color: #fafaf9; border-left: 3px solid #DFC06A; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
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
                    <strong style="color: #0E1F35; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${isInquiry ? 'Getting Started' : 'Portal Features'}</strong>
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
                    <a href="${portalUrl}" style="display: inline-block; background-color: #DFC06A; color: #0E1F35; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                      ${contractTitle ? 'Review &amp; Sign Agreement' : isInquiry ? 'Review &amp; Get Started' : 'Access Case Portal'}
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

    const subject = contractTitle
      ? `Action Required: Sign Agreement \u2014 ${resolvedCaseName}`
      : isInquiry
        ? `Expert Witness Consultation \u2014 Dr. Mark Ettinger`
        : `Case Portal Invitation \u2014 ${resolvedCaseName}`

    let resendResult
    try {
      resendResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: [recipientEmail],
        bcc: EMAIL_BCC,
        replyTo: EMAIL_REPLY_TO,
        subject,
        html: htmlBody,
      })
    } catch (sendErr) {
      const message =
        sendErr instanceof Error ? sendErr.message : 'Unknown Resend exception'
      console.error('Resend threw:', sendErr, { from: FROM_EMAIL, to: recipientEmail })
      return NextResponse.json(
        { error: 'Failed to send email', details: message },
        { status: 500 }
      )
    }

    const { data, error } = resendResult
    if (error) {
      console.error('Resend error:', error, { from: FROM_EMAIL, to: recipientEmail })
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message || String(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Portal invite email error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}
