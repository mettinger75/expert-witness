/**
 * Expert Witness — Branded Email Templates
 *
 * All customer-facing emails use the wrap() function for consistent
 * navy/gold Meridian branding. Each event builder returns {subject, html, previewText}.
 */

import {
  EMAIL_COLORS,
  EMAIL_LOGO_URL,
  SITE_URL,
  type EmailEventType,
} from './email-config'

// ── Types ──────────────────────────────────────────────────────────

export interface EmailOutput {
  subject: string
  html: string
  previewText: string
}

export interface EmailMetadata {
  recipientName: string
  caseName?: string
  caseNumber?: string
  caseId?: string
  reportName?: string
  invoiceNumber?: string
  invoiceAmount?: number
  depositionDate?: string
  depositionLocation?: string
  portalUrl?: string
  customSubject?: string
  customBody?: string
  message?: string
  [key: string]: unknown
}

// ── Helpers ─────────────────────────────────────────────────────────

function greeting(name: string): string {
  return name ? `Dear ${name},` : 'Hello,'
}

function detailRow(label: string, value: string | null | undefined): string {
  if (!value) return ''
  const c = EMAIL_COLORS
  return `
    <tr>
      <td style="padding: 8px 0; font-size: 13px; color: ${c.textSecondary}; width: 140px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; font-size: 13px; color: ${c.navy}; font-weight: 500;">${value}</td>
    </tr>`
}

function detailTable(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0;">${rows}</table>`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Master Wrapper ──────────────────────────────────────────────────

function wrap(opts: {
  subject: string
  previewText: string
  badge?: string
  badgeColor?: string
  heading?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  skipBadge?: boolean
  skipSignature?: boolean
}): string {
  const c = EMAIL_COLORS

  const cta = opts.ctaLabel && opts.ctaUrl
    ? `
    <div style="padding: 0 32px 32px; text-align: center;">
      <a href="${opts.ctaUrl}" style="display: inline-block; background: ${c.navy}; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
        ${opts.ctaLabel}
      </a>
    </div>`
    : ''

  const footerNote = opts.footerNote
    ? `<div style="background: #FFFDF5; border-left: 3px solid ${c.gold}; padding: 10px 14px; margin-top: 16px; border-radius: 0 6px 6px 0;">
        <p style="font-size: 12px; font-weight: 700; color: ${c.navy}; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.5px;">Note</p>
        <p style="font-size: 13px; color: ${c.navy}; margin: 0; line-height: 1.5;">${opts.footerNote}</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.subject}</title>
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${opts.previewText}</span>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${c.bgLight};">
<div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
<div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

  <!-- Logo header -->
  <div style="background: ${c.navyDark}; text-align: center; padding: 28px 32px;">
    <img src="${EMAIL_LOGO_URL}" alt="Mark Ettinger, M.D." width="300" height="75" style="display: inline-block; max-width: 100%; height: auto;" />
  </div>
  <div style="height: 3px; background: ${c.gold};"></div>

  ${opts.skipBadge ? '' : `<!-- Badge + Heading -->
  <div style="padding: 32px 32px 0;">
    <div style="background: ${c.navyDark}; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
      <p style="font-family: Georgia, serif; font-size: 12px; color: ${opts.badgeColor || c.gold}; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px;">${opts.badge || ''}</p>
      <h1 style="font-family: Georgia, serif; font-size: 20px; color: white; font-weight: 400; margin: 0;">${opts.heading || ''}</h1>
    </div>
  </div>`}

  <!-- Body content -->
  <div style="padding: 0 32px 24px; color: #333; font-size: 14px; line-height: 1.7;">
    ${opts.bodyHtml}
    ${footerNote}
  </div>

  ${cta}

  ${opts.skipSignature ? '' : `<!-- Signature -->
  <div style="padding: 0 32px 32px;">
    <p style="color: #333; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
      Sincerely,
    </p>
    <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-top: 1px solid ${c.border}; padding-top: 16px;">
      <tr>
        <td style="padding-top: 16px;">
          <p style="margin: 0; font-family: Georgia, serif; font-size: 16px; font-weight: 600; color: ${c.navy};">Mark Ettinger, M.D.</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: ${c.textSecondary};">Board Certified Anesthesiologist</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: ${c.textSecondary};">markettingermd@gmail.com &bull; (214) 930-4698</p>
        </td>
      </tr>
    </table>
  </div>`}

  <!-- Footer -->
  <div style="background: #F8F9FB; padding: 20px 32px; text-align: center; border-top: 1px solid ${c.border};">
    <p style="font-size: 11px; color: ${c.textMuted}; margin: 0;">
      <span style="font-weight: 600; color: ${c.navy};">Mark Ettinger, M.D.</span> &mdash; Expert Witness Practice
    </p>
    <p style="font-size: 11px; color: ${c.textMuted}; margin: 4px 0 0;">
      This email and any attachments are confidential and intended solely for the recipient.
    </p>
  </div>

</div>
</div>
</body>
</html>`
}

// ── Event Builders ──────────────────────────────────────────────────

function portalInviteEmail(m: EmailMetadata): EmailOutput {
  const subject = `Portal Access — ${m.caseName || 'Case Materials'}`
  return {
    subject,
    previewText: `You have been invited to access the case portal for ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Portal access for ${m.caseName}`,
      badge: 'Portal Access',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Case Portal',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>You have been granted access to the secure case portal for <strong>${m.caseName}</strong>. Through this portal, you can view case documents, reports, and communicate securely.</p>
        ${m.message ? `<p>${m.message}</p>` : ''}
        ${detailTable(
          detailRow('Case', m.caseName || '') +
          detailRow('Case Number', m.caseNumber || '')
        )}
        <p>Click below to access the portal:</p>
      `,
      ctaLabel: 'Access Portal',
      ctaUrl: m.portalUrl || `${SITE_URL}`,
      footerNote: 'This link is unique to you. Please do not share it with others.',
    }),
  }
}

function inquiryInviteEmail(m: EmailMetadata): EmailOutput {
  const subject = 'Expert Witness Inquiry — Dr. Mark Ettinger'
  return {
    subject,
    previewText: 'Submit case details for expert witness evaluation',
    html: wrap({
      subject,
      previewText: 'Expert witness inquiry portal',
      badge: 'New Inquiry',
      badgeColor: EMAIL_COLORS.gold,
      heading: 'Expert Witness Consultation',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>Thank you for your interest in retaining my services as an expert witness in anesthesiology.</p>
        <p>Please use the secure portal below to submit your case details, including relevant medical records and a brief case summary. I will review the materials and provide an initial assessment.</p>
        ${m.message ? `<p>${m.message}</p>` : ''}
      `,
      ctaLabel: 'Submit Case Details',
      ctaUrl: m.portalUrl || `${SITE_URL}`,
    }),
  }
}

function reportSentEmail(m: EmailMetadata): EmailOutput {
  const subject = `Expert Report — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Expert report is ready for review: ${m.reportName || m.caseName}`,
    html: wrap({
      subject,
      previewText: `Report ready for ${m.caseName}`,
      badge: 'Report Ready',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.reportName || 'Expert Report',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>The expert report for <strong>${m.caseName}</strong> is now available for your review.</p>
        ${detailTable(
          detailRow('Report', m.reportName || '') +
          detailRow('Case', m.caseName || '') +
          detailRow('Case Number', m.caseNumber || '')
        )}
        <p>Please review the report and let me know if you have any questions or require any revisions.</p>
      `,
      ctaLabel: 'View Report',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}/reports`,
    }),
  }
}

function reportFinalizedEmail(m: EmailMetadata): EmailOutput {
  const subject = `Final Report — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Final expert report for ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Final report for ${m.caseName}`,
      badge: 'Finalized',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.reportName || 'Final Expert Report',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>The final expert report for <strong>${m.caseName}</strong> has been completed and is ready for use.</p>
        ${detailTable(
          detailRow('Report', m.reportName || '') +
          detailRow('Case', m.caseName || '') +
          detailRow('Case Number', m.caseNumber || '')
        )}
      `,
      ctaLabel: 'View Final Report',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}/reports`,
    }),
  }
}

function editsSubmittedEmail(m: EmailMetadata): EmailOutput {
  const subject = `Edits Submitted — ${m.reportName || m.caseName}`
  return {
    subject,
    previewText: `Edits have been submitted for ${m.reportName || m.caseName}`,
    html: wrap({
      subject,
      previewText: `Edits submitted for ${m.caseName}`,
      badge: 'Edits Received',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.reportName || 'Report Edits',
      bodyHtml: `
        <p>Edits have been submitted for <strong>${m.reportName || m.caseName}</strong>.</p>
        ${detailTable(
          detailRow('Case', m.caseName || '') +
          detailRow('Submitted By', m.recipientName)
        )}
        ${m.message ? `<p><strong>Notes:</strong> ${m.message}</p>` : ''}
      `,
      ctaLabel: 'Review Edits',
      ctaUrl: `${SITE_URL}/cases/${m.caseId}/reports`,
    }),
  }
}

function changesRequestedEmail(m: EmailMetadata): EmailOutput {
  const subject = `Changes Requested — ${m.reportName || m.caseName}`
  return {
    subject,
    previewText: `Changes have been requested for ${m.reportName || m.caseName}`,
    html: wrap({
      subject,
      previewText: `Changes requested for ${m.caseName}`,
      badge: 'Changes Requested',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.reportName || 'Report Changes',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>Changes have been requested for the report on <strong>${m.caseName}</strong>. Please review and submit your revisions.</p>
        ${m.message ? `<p><strong>Notes:</strong> ${m.message}</p>` : ''}
      `,
      ctaLabel: 'View Report',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}/reports`,
    }),
  }
}

function invoiceSentEmail(m: EmailMetadata): EmailOutput {
  const subject = `Invoice ${m.invoiceNumber || ''} — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Invoice for ${m.caseName}: ${m.invoiceAmount ? formatCurrency(m.invoiceAmount) : ''}`,
    html: wrap({
      subject,
      previewText: `Invoice for ${m.caseName}`,
      badge: 'Invoice',
      badgeColor: EMAIL_COLORS.gold,
      heading: `Invoice ${m.invoiceNumber || ''}`,
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>Please find the attached invoice for expert witness services rendered on <strong>${m.caseName}</strong>.</p>
        ${detailTable(
          detailRow('Invoice #', m.invoiceNumber || '') +
          detailRow('Case', m.caseName || '') +
          detailRow('Amount', m.invoiceAmount ? formatCurrency(m.invoiceAmount) : '')
        )}
        <p>Payment is due within 30 days of receipt. Please let me know if you have any questions.</p>
      `,
      ctaLabel: 'View Invoice',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}/billing`,
    }),
  }
}

function depositionScheduledEmail(m: EmailMetadata): EmailOutput {
  const subject = `Deposition Scheduled — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Deposition scheduled for ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Deposition for ${m.caseName}`,
      badge: 'Deposition',
      badgeColor: EMAIL_COLORS.gold,
      heading: 'Deposition Scheduled',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>A deposition has been scheduled for <strong>${m.caseName}</strong>.</p>
        ${detailTable(
          detailRow('Case', m.caseName || '') +
          detailRow('Date', m.depositionDate ? formatDate(m.depositionDate) : '') +
          detailRow('Location', m.depositionLocation || '')
        )}
        ${m.message ? `<p>${m.message}</p>` : ''}
      `,
    }),
  }
}

function caseUpdateEmail(m: EmailMetadata): EmailOutput {
  const subject = `Case Update — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Update on ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Update on ${m.caseName}`,
      badge: 'Case Update',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Case Update',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        ${m.message || `<p>There is an update regarding <strong>${m.caseName}</strong>. Please review at your earliest convenience.</p>`}
      `,
      ctaLabel: 'View Case',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}`,
    }),
  }
}

function followUpEmail(m: EmailMetadata): EmailOutput {
  const subject = `Follow Up — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Follow up on ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Follow up on ${m.caseName}`,
      badge: 'Follow Up',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Follow Up',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        ${m.message || `<p>I wanted to follow up regarding <strong>${m.caseName}</strong>. Please let me know if you have any questions or need any additional information.</p>`}
      `,
    }),
  }
}

function retainerRequestEmail(m: EmailMetadata): EmailOutput {
  const subject = `Retainer Agreement — ${m.caseName || 'Case'}`
  return {
    subject,
    previewText: `Retainer agreement for ${m.caseName}`,
    html: wrap({
      subject,
      previewText: `Retainer for ${m.caseName}`,
      badge: 'Retainer',
      badgeColor: EMAIL_COLORS.gold,
      heading: 'Retainer Agreement',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>Please find the retainer agreement for expert witness services on <strong>${m.caseName}</strong>. Please review, sign, and return at your earliest convenience.</p>
        ${m.message ? `<p>${m.message}</p>` : ''}
      `,
      ctaLabel: 'View Agreement',
      ctaUrl: m.portalUrl || `${SITE_URL}/cases/${m.caseId}/contracts`,
    }),
  }
}

function outreachEmail(m: EmailMetadata): EmailOutput {
  const subject = m.customSubject || 'Expert Witness Services — Anesthesiology'
  return {
    subject,
    previewText: 'Board-certified anesthesiologist with 200+ expert witness cases.',
    html: wrap({
      subject,
      previewText: 'Board-certified anesthesiologist — 200+ expert witness cases',
      badge: 'Introduction',
      badgeColor: EMAIL_COLORS.gold,
      heading: 'Expert Witness Services',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        <p>I am writing to make myself available for any expert witness needs you have in the field of anesthesiology. I am currently in full-time clinical practice and the President of a large anesthesia group in Dallas-Fort Worth. My practice covers nearly every subspecialty in anesthesiology, and I perform approximately 1,200 anesthetics per year at facilities ranging from community surgery centers to a Level 1 trauma hospital. There is essentially no type of anesthesia case I am not comfortable reviewing.</p>
        <p>I have reviewed over 200 cases as an expert witness, many of which have proceeded to deposition and trial. I also serve as Chair of the Medical Ethics Committee and sit on the peer review committee at a Level 2 trauma center, where I review an additional 50+ cases per year. Prior to my anesthesia residency, I trained in neurosurgery and neurocritical care, which gives me the ability to evaluate a case not just from the perspective of the anesthesiologist, but from the surgical side as well.</p>
        ${m.message ? `<p>${m.message}</p>` : ''}
        <p>I do not accept a case unless I can defend it with integrity, and I would never compromise that integrity to win a case. If I review a case and cannot support it, I do not charge for that initial review. I am available for both plaintiff and defense retention.</p>
        <p>When I am retained, you will also have access to a <strong>secure attorney portal</strong> where you can track case progress, review and redline report drafts, schedule calls and depositions, and communicate with me directly throughout the engagement.</p>
        <p>I would welcome the opportunity to discuss any current or upcoming cases. Please feel free to reach out, or use the link below to submit case details for review.</p>
      `,
      ctaLabel: 'Request a Consultation',
      ctaUrl: m.portalUrl || `${SITE_URL}/portal/consult`,
    }),
  }
}

function freeformEmail(m: EmailMetadata): EmailOutput {
  const subject = m.customSubject || `Re: ${m.caseName || 'Case'}`
  const bodyContent = m.customBody || m.message || ''

  // If customBody contains HTML tags, use it directly; otherwise convert newlines to paragraphs
  const isHtml = /<[a-z][\s\S]*>/i.test(bodyContent)
  const formattedBody = isHtml
    ? bodyContent
    : bodyContent
        .split('\n\n')
        .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('')

  // When customBody is provided (pre-formatted HTML with its own greeting/signature),
  // skip the template greeting, badge, heading, and signature
  if (m.customBody && isHtml) {
    return {
      subject,
      previewText: subject,
      html: wrap({
        subject,
        previewText: subject,
        bodyHtml: formattedBody,
        skipBadge: true,
        skipSignature: true,
      }),
    }
  }

  return {
    subject,
    previewText: subject,
    html: wrap({
      subject,
      previewText: subject,
      badge: m.caseName ? 'Case Correspondence' : 'Correspondence',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Correspondence',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        ${formattedBody}
      `,
    }),
  }
}

// ── Dispatcher ──────────────────────────────────────────────────────

export function buildEmail(eventType: EmailEventType, metadata: EmailMetadata): EmailOutput {
  switch (eventType) {
    case 'portal_invite':
      return portalInviteEmail(metadata)
    case 'inquiry_invite':
      return inquiryInviteEmail(metadata)
    case 'report_sent':
      return reportSentEmail(metadata)
    case 'report_finalized':
      return reportFinalizedEmail(metadata)
    case 'edits_submitted':
      return editsSubmittedEmail(metadata)
    case 'changes_requested':
      return changesRequestedEmail(metadata)
    case 'invoice_sent':
      return invoiceSentEmail(metadata)
    case 'deposition_scheduled':
      return depositionScheduledEmail(metadata)
    case 'case_update':
      return caseUpdateEmail(metadata)
    case 'follow_up':
      return followUpEmail(metadata)
    case 'retainer_request':
      return retainerRequestEmail(metadata)
    case 'freeform':
      return freeformEmail(metadata)
    case 'outreach':
      return outreachEmail(metadata)
    default:
      throw new Error(`Unknown email event type: ${eventType}`)
  }
}

/** Re-export wrap for custom one-off templates */
export { wrap as wrapEmail }
