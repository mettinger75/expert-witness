import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Dr. Mark Ettinger <onboarding@resend.dev>'
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

    const { recipientEmail, recipientName, shareUrl, entityType, entityName, permission, senderMessage } = await request.json()

    if (!recipientEmail || !shareUrl) {
      return NextResponse.json(
        { error: 'Missing recipientEmail or shareUrl' },
        { status: 400 }
      )
    }

    const isInvoice = entityType === 'invoice'
    const entityLabel = isInvoice ? 'Invoice' : entityType === 'report' ? 'Report' : 'Contract'
    const permissionLabel = permission === 'edit' ? 'review and edit' : permission === 'sign' ? 'review and sign' : 'review'
    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Counsel,'
    const logoUrl = `${APP_URL}/logo-expert-witness.svg?v=2`

    // Invoice-specific text
    const bodyText = isInvoice
      ? 'An invoice has been issued for your review:'
      : `You have been invited to ${permissionLabel} the following ${entityLabel.toLowerCase()}:`

    const actionText = isInvoice
      ? 'View Invoice'
      : permission === 'sign'
        ? 'Review &amp; Sign Document'
        : permission === 'edit'
          ? 'Review &amp; Edit Document'
          : 'View Document'

    const permissionBadgeText = isInvoice
      ? 'Invoice'
      : permission === 'edit'
        ? 'Edit Access'
        : permission === 'sign'
          ? 'Signature Required'
          : 'View Only'

    const permissionBadgeBg = isInvoice
      ? '#fef3c7'
      : permission === 'edit'
        ? '#dbeafe'
        : permission === 'sign'
          ? '#fef3c7'
          : '#f1f5f9'

    const permissionBadgeColor = isInvoice
      ? '#92400e'
      : permission === 'edit'
        ? '#1e40af'
        : permission === 'sign'
          ? '#92400e'
          : '#475569'

    const secureNote = isInvoice
      ? 'This secure link will give you access to the invoice without requiring a login. Please do not share this link with others.'
      : 'This secure link will give you access to the document without requiring a login. Please do not share this link with others.'

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
                ${bodyText}
              </p>

              <!-- Document card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f8fafc; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #0E1F35; font-size: 15px;">${entityName || entityLabel}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="display: inline-block; background-color: ${permissionBadgeBg}; color: ${permissionBadgeColor}; font-size: 12px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${permissionBadgeText}
                    </span>
                  </td>
                </tr>
              </table>

              ${senderMessage ? `
              <div style="background-color: #fafaf9; border-left: 3px solid #C9A84C; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <p style="color: #44403c; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
                  "${senderMessage}"
                </p>
                <p style="color: #78716c; font-size: 12px; margin: 8px 0 0 0;">
                  &mdash; Mark Ettinger, M.D.
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${shareUrl}" style="display: inline-block; background-color: #0E1F35; color: #C9A84C; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                      ${actionText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
                ${secureNote}
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

    let subject: string
    if (isInvoice) {
      subject = `Invoice ${entityName || ''} from Dr. Mark Ettinger`
    } else if (permission === 'sign') {
      subject = `Signature Requested: ${entityName || entityLabel}`
    } else {
      subject = `${entityLabel} Shared: ${entityName || 'Document'}`
    }

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
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
