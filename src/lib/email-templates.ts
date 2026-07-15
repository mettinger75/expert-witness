/**
 * Expert Witness — Branded Email Templates
 *
 * All customer-facing emails use the wrap() function for consistent
 * navy/gold Meridian branding. Each event builder returns {subject, html, previewText}.
 */

import {
  EMAIL_COLORS,
  EMAIL_LOGO_URL,
  EMAIL_SIGNATURE_URL,
  SITE_URL,
  type EmailEventType,
} from './email-config'

// ── Types ──────────────────────────────────────────────────────────

export interface EmailOutput {
  subject: string
  html: string
  previewText: string
  /** Plain-text alternative (auto-derived in buildEmail) */
  text?: string
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

  // Light-brand, inbox-first layout: a plain text wordmark instead of a logo
  // banner, an inline link instead of a marketing button, and a personal
  // signature — so Gmail files it under Primary, not Promotions. No images
  // (Gmail cannot render SVG and a hero banner reads as marketing).
  const headingBlock =
    opts.skipBadge || (!opts.heading && !opts.badge)
      ? ''
      : `
    <div style="padding-top: 20px;">
      ${opts.badge ? `<p style="margin: 0 0 3px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${c.textMuted};">${opts.badge}</p>` : ''}
      ${opts.heading ? `<p style="margin: 0; font-size: 17px; font-weight: 600; color: ${c.navy};">${opts.heading}</p>` : ''}
    </div>`

  const footerNote = opts.footerNote
    ? `<p style="margin: 18px 0 0; padding: 10px 14px; background: ${c.bgLight}; border-left: 3px solid ${c.gold}; font-size: 13px; color: ${c.navy}; line-height: 1.5;">${opts.footerNote}</p>`
    : ''

  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin: 18px 0;"><a href="${opts.ctaUrl}" style="color: ${c.navy}; font-weight: 600; text-decoration: underline;">${opts.ctaLabel} &rarr;</a></p>`
      : ''

  const signature = opts.skipSignature
    ? ''
    : `
      <p style="margin: 20px 0 2px;">Sincerely,</p>
      <img src="${EMAIL_SIGNATURE_URL}" width="200" alt="Mark Ettinger signature" style="display: block; width: 200px; max-width: 70%; height: auto; margin: 4px 0 2px; border: 0;" />
      <p style="margin: 0; font-weight: 600; color: ${c.navy};">Mark Ettinger, M.D.</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: ${c.textSecondary};">Board-Certified Anesthesiologist</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: ${c.textSecondary};">markettingermd@gmail.com &bull; (214) 930-4698</p>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2933;">
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${opts.previewText}</span>
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 20px;">

    <!-- Logo -->
    <div style="padding-bottom: 12px; border-bottom: 2px solid ${c.gold};">
      <img src="${EMAIL_LOGO_URL}" width="260" alt="Mark Ettinger, M.D. — Expert Witness, Anesthesiology" style="display: block; width: 260px; max-width: 80%; height: auto; border: 0;" />
    </div>

    ${headingBlock}

    <!-- Body -->
    <div style="padding-top: 18px; font-size: 15px; line-height: 1.7; color: #1f2933;">
      ${opts.bodyHtml}
      ${footerNote}
      ${cta}
      ${signature}
    </div>

    <!-- Footer -->
    <div style="padding-top: 18px; margin-top: 22px; border-top: 1px solid ${c.border};">
      <p style="margin: 0; font-size: 11px; color: ${c.textMuted}; line-height: 1.5;">
        This email and any attachments are confidential and intended solely for the named recipient. If you received it in error, please delete it and notify the sender.
      </p>
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
        ${m.message
          ? `<p>${m.message}</p>`
          : `<p>Thank you for your interest in retaining my services as an expert witness in anesthesiology.</p>
        <p>Please use the secure portal below to submit your case details, including relevant medical records and a brief case summary. I will review the materials and provide an initial assessment.</p>`}
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
  // Only link to a case when we actually have one — otherwise wrap() would emit
  // a button pointing at /cases/undefined (a dead page). wrap() drops the CTA
  // entirely when ctaUrl is undefined.
  const caseUrl = m.portalUrl || (m.caseId ? `${SITE_URL}/cases/${m.caseId}` : undefined)
  const defaultBody = m.caseName
    ? `<p>There is an update regarding <strong>${m.caseName}</strong>. Please review at your earliest convenience.</p>`
    : `<p>There is an update on your case. Please review at your earliest convenience.</p>`
  return {
    subject,
    previewText: `Update on ${m.caseName || 'your case'}`,
    html: wrap({
      subject,
      previewText: `Update on ${m.caseName || 'your case'}`,
      badge: 'Case Update',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Case Update',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        ${m.message || defaultBody}
      `,
      ctaLabel: caseUrl ? 'View Case' : undefined,
      ctaUrl: caseUrl,
    }),
  }
}

function followUpEmail(m: EmailMetadata): EmailOutput {
  const subject = `Follow Up — ${m.caseName || 'Case'}`
  const defaultBody = m.caseName
    ? `<p>I wanted to follow up regarding <strong>${m.caseName}</strong>. Please let me know if you have any questions or need any additional information.</p>`
    : `<p>I wanted to follow up on your case. Please let me know if you have any questions or need any additional information.</p>`
  return {
    subject,
    previewText: `Follow up on ${m.caseName || 'your case'}`,
    html: wrap({
      subject,
      previewText: `Follow up on ${m.caseName || 'your case'}`,
      badge: 'Follow Up',
      badgeColor: EMAIL_COLORS.gold,
      heading: m.caseName || 'Follow Up',
      bodyHtml: `
        <p>${greeting(m.recipientName)}</p>
        ${m.message || defaultBody}
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

/**
 * Derive a readable text/plain alternative from rendered HTML. Sending a
 * plain-text part alongside the HTML avoids the spam-score penalty Gmail and
 * other providers apply to HTML-only mail.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&mdash;/gi, '—')
    .replace(/&bull;/gi, '•')
    .replace(/&rarr;/gi, '→')
    .replace(/&#10003;/g, '✓')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function dispatchEmail(eventType: EmailEventType, metadata: EmailMetadata): EmailOutput {
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
    default:
      throw new Error(`Unknown email event type: ${eventType}`)
  }
}

export function buildEmail(eventType: EmailEventType, metadata: EmailMetadata): EmailOutput {
  const out = dispatchEmail(eventType, metadata)
  return { ...out, text: out.text ?? htmlToText(out.html) }
}

/** Re-export wrap for custom one-off templates */
export { wrap as wrapEmail }
