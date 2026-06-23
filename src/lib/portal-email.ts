import { Resend } from 'resend'
import { EMAIL_BCC, EMAIL_REPLY_TO } from '@/lib/email-config'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Shared portal invitation email sender.
 *
 * This is the single place that builds and sends the branded portal-invite
 * email. Both server routes (add-contact, recover) and the admin-only
 * `/api/portal/invite-email` route call this directly — there is no public
 * HTTP email sender. All interpolated fields are HTML-escaped.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Quote a display name with special characters per RFC 5322 so Resend/SMTP
 * does not treat a comma in "Mark Ettinger, M.D." as an address separator.
 */
function normalizeFromEmail(from: string): string {
  const match = from.match(/^(.+?)\s*<([^>]+)>\s*$/)
  if (!match) return from
  const [, rawName, email] = match
  const name = rawName.trim().replace(/^"|"$/g, '')
  const needsQuoting = /[,;:@()<>[\]\\"]/.test(name)
  const displayName = needsQuoting ? `"${name.replace(/"/g, '\\"')}"` : name
  return `${displayName} <${email.trim()}>`
}

export interface PortalInviteEmailOptions {
  recipientEmail: string
  portalUrl: string
  recipientName?: string
  caseName?: string
  caseId?: string
  invitationMessage?: string
  features?: string[]
  contractTitle?: string
  isInquiry?: boolean
}

export interface PortalInviteEmailResult {
  success: boolean
  emailId?: string
  error?: string
}

export async function sendPortalInviteEmail(
  opts: PortalInviteEmailOptions
): Promise<PortalInviteEmailResult> {
  const {
    recipientEmail,
    portalUrl,
    recipientName,
    invitationMessage,
    features,
    contractTitle,
    isInquiry = false,
  } = opts

  if (!process.env.RESEND_API_KEY) {
    console.error('sendPortalInviteEmail: RESEND_API_KEY is not set')
    return { success: false, error: 'Email service is not configured' }
  }
  if (!recipientEmail || !portalUrl) {
    return { success: false, error: 'Missing recipientEmail or portalUrl' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM_EMAIL = normalizeFromEmail(
    process.env.RESEND_FROM_EMAIL || 'Dr. Mark Ettinger <onboarding@resend.dev>'
  )
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

  // Resolve case name from caseId when not provided.
  let resolvedCaseName = opts.caseName
  if (!resolvedCaseName && opts.caseId) {
    try {
      const supabase = getSupabaseAdmin()
      const { data: caseData } = await supabase
        .from('cases')
        .select('case_name')
        .eq('id', opts.caseId)
        .single()
      resolvedCaseName = caseData?.case_name || 'your case'
    } catch {
      resolvedCaseName = 'your case'
    }
  }

  if (!resolvedCaseName && !isInquiry) {
    return { success: false, error: 'Missing caseName/caseId' }
  }

  const safeCaseName = escapeHtml(resolvedCaseName || 'your case')
  const safeContractTitle = contractTitle ? escapeHtml(contractTitle) : ''

  const resolvedFeatures: string[] =
    features && Array.isArray(features) && features.length > 0
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

  const greeting = recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear Counsel,'
  const logoUrl = `${APP_URL}/logo-expert-witness.svg?v=2`

  const featureListHtml = resolvedFeatures
    .map(
      (feature: string) =>
        `<tr>
          <td style="padding: 6px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <span style="color: #DFC06A; font-size: 16px; margin-right: 8px;">&#10003;</span>
            ${escapeHtml(feature)}
          </td>
        </tr>`
    )
    .join('')

  const contractCalloutHtml = contractTitle
    ? `
    <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 0;">
            <strong style="color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">&#9888; Action Required</strong>
            <p style="color: #78350f; font-size: 14px; line-height: 1.6; margin: 8px 0 0 0;">
              Please review and sign the <strong>${safeContractTitle}</strong> at your earliest convenience.
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
          <tr>
            <td style="background-color: #0E1F35; padding: 28px 32px; text-align: center;">
              <img src="${logoUrl}" alt="Mark Ettinger, M.D. - Expert Witness" width="380" height="95" style="display: block; margin: 0 auto; max-width: 380px; height: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color: #DFC06A; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                ${greeting}
              </p>
              <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                ${isInquiry
                  ? 'Mark Ettinger, M.D. would like to invite you to review his qualifications and fee schedule for a potential expert witness engagement in anesthesiology.'
                  : `You've been invited to access the case portal for <strong>${safeCaseName}</strong>.`}
              </p>

              ${contractCalloutHtml}

              ${invitationMessage ? `
              <div style="background-color: #fafaf9; border-left: 3px solid #DFC06A; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <p style="color: #44403c; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
                  "${escapeHtml(invitationMessage)}"
                </p>
                <p style="color: #78716c; font-size: 12px; margin: 8px 0 0 0;">
                  &mdash; Mark Ettinger, M.D.
                </p>
              </div>
              ` : ''}

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
    ? `Action Required: Sign Agreement — ${resolvedCaseName}`
    : isInquiry
      ? `Expert Witness Consultation — Dr. Mark Ettinger`
      : `Case Portal Invitation — ${resolvedCaseName}`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      bcc: EMAIL_BCC,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html: htmlBody,
    })
    if (error) {
      console.error('sendPortalInviteEmail Resend error:', error)
      return { success: false, error: error.message || String(error) }
    }
    return { success: true, emailId: data?.id }
  } catch (sendErr) {
    const message = sendErr instanceof Error ? sendErr.message : 'Unknown Resend exception'
    console.error('sendPortalInviteEmail threw:', sendErr)
    return { success: false, error: message }
  }
}
