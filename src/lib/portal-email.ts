import { Resend } from 'resend'
import { EMAIL_BCC, EMAIL_REPLY_TO } from '@/lib/email-config'
import { wrapEmail, htmlToText, firstName } from '@/lib/email-templates'
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
  /** When set, the email is framed as "X has added you to this case" (used by the portal add-colleague flow). */
  addedByName?: string
  isInquiry?: boolean
  /**
   * Overrides the computed subject line. Callers that thread every email about
   * a case into one conversation pass `caseEmailSubject(...)` so the invite
   * carries the same `[EW-YYYY-NNNN] Case Name` subject as the rest of the
   * thread. Only reaches the sent envelope and the (client-stripped) HTML
   * `<title>`, so it never changes the visible body.
   */
  subject?: string
  /**
   * `Message-ID` / `In-Reply-To` / `References` headers from
   * `caseEmailHeaders(...)`. Without them the invite starts its own thread
   * instead of joining the case conversation seeded by the notification email.
   */
  headers?: Record<string, string>
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
    addedByName,
    isInquiry = false,
    subject: subjectOverride,
    headers,
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
    process.env.RESEND_FROM_EMAIL || 'Mark Ettinger, M.D. <onboarding@resend.dev>'
  )
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
  const safeAddedBy = addedByName ? escapeHtml(addedByName) : ''

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

  const recipientFirstName = firstName(recipientName)
  const greeting = recipientFirstName
    ? `Dear ${escapeHtml(recipientFirstName)},`
    : 'Dear Counsel,'

  const featureListHtml = resolvedFeatures
    .map((feature: string) => `<li style="margin: 3px 0;">${escapeHtml(feature)}</li>`)
    .join('')

  const contractCalloutHtml = contractTitle
    ? `<p style="margin: 16px 0;"><strong style="color: #0E1F35;">Action required:</strong> please review and sign the <strong>${safeContractTitle}</strong> at your earliest convenience.</p>`
    : ''

  // The invitation message is Mark writing in his own voice, so it reads as a
  // plain paragraph of the letter — never as a pull-quote attributed back to
  // him. He does not quote himself inside his own email.
  const personalMessageHtml = invitationMessage
    ? `<p style="margin: 16px 0;">${escapeHtml(invitationMessage)}</p>`
    : ''

  const subject =
    subjectOverride ||
    (contractTitle
      ? `Action Required: Sign Agreement — ${resolvedCaseName}`
      : isInquiry
        ? `Expert Witness Consultation — Mark Ettinger, M.D.`
        : addedByName
          ? `You've been added to a case — ${resolvedCaseName}`
          : `Case Portal Invitation — ${resolvedCaseName}`)

  const bodyHtml = `
    <p>${greeting}</p>
    <p>${
      isInquiry
        ? 'Thank you for your interest. I would like to invite you to review my qualifications and fee schedule for a potential expert witness engagement in anesthesiology.'
        : addedByName
          ? `${safeAddedBy} has added you to the case <strong>${safeCaseName}</strong>. You now have your own secure access to the case portal.`
          : `You have been granted secure access to the case portal for <strong>${safeCaseName}</strong>.`
    }</p>
    ${contractCalloutHtml}
    ${personalMessageHtml}
    <p style="margin: 16px 0 4px; font-weight: 600; color: #0E1F35;">${isInquiry ? 'Getting started:' : 'Through the portal you can:'}</p>
    <ul style="margin: 4px 0 0; padding-left: 20px; line-height: 1.7;">${featureListHtml}</ul>
  `

  const htmlBody = wrapEmail({
    subject,
    previewText: isInquiry
      ? 'Review qualifications and fee schedule for an anesthesiology expert engagement'
      : addedByName
        ? `You've been added to ${safeCaseName}`
        : `Secure portal access for ${safeCaseName}`,
    heading: contractTitle
      ? 'Review & Sign Agreement'
      : isInquiry
        ? 'Expert Witness Consultation'
        : addedByName
          ? "You've Been Added to a Case"
          : 'Case Portal Access',
    bodyHtml,
    ctaLabel: contractTitle ? 'Review & Sign Agreement' : isInquiry ? 'Get Started' : 'Access Case Portal',
    ctaUrl: portalUrl,
    footerNote: 'This link is private and unique to you. Please do not share it.',
  })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      bcc: EMAIL_BCC,
      replyTo: EMAIL_REPLY_TO,
      subject,
      headers,
      html: htmlBody,
      text: htmlToText(htmlBody),
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
