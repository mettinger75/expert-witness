/**
 * Report notification email templates using the Meridian Design System.
 * Follows the same pattern as the contract signing notification emails.
 */

import { wrapEmail, htmlToText } from './email-templates'
import { EMAIL_REPLY_TO } from './email-config'

interface ReportNotificationOptions {
  recipientName: string
  caseName: string
  caseNumber: string
  reportName: string
  actionText: string
  bodyText: string
  ctaText: string
  ctaUrl: string
}

export function buildReportNotificationEmail(options: ReportNotificationOptions): string {
  const { recipientName, caseName, caseNumber, reportName, actionText, bodyText, ctaText, ctaUrl } = options

  return wrapEmail({
    subject: actionText,
    previewText: `${actionText} — ${reportName}`,
    heading: actionText,
    skipSignature: true,
    bodyHtml: `
      <p>Dear ${recipientName},</p>
      <p>${bodyText}</p>
      <p style="margin: 12px 0 0;">
        <strong style="color: #0E1F35;">Report:</strong> ${reportName}<br>
        <strong style="color: #0E1F35;">Case:</strong> ${caseName} (${caseNumber})
      </p>
    `,
    ctaLabel: ctaText,
    ctaUrl,
  })
}

/** Attorney submitted edits → email to Dr. Ettinger */
export function editsSubmittedEmail(opts: {
  attorneyName: string
  caseName: string
  caseNumber: string
  reportName: string
  caseId: string
  notes?: string
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
  return {
    subject: `Report Edits Submitted — ${opts.caseName}`,
    html: buildReportNotificationEmail({
      recipientName: 'Dr. Ettinger',
      caseName: opts.caseName,
      caseNumber: opts.caseNumber,
      reportName: opts.reportName,
      actionText: 'Report Edits Submitted',
      bodyText: `<strong>${opts.attorneyName}</strong> has submitted edits to <strong>${opts.reportName}</strong>.${opts.notes ? ` Their note: "${opts.notes}"` : ''} Please review the changes in your dashboard.`,
      ctaText: 'Review Edits',
      ctaUrl: `${appUrl}/cases/${opts.caseId}/reports`,
    }),
  }
}

/** Dr. Ettinger sent report for review → email to attorney */
export function reportSentForReviewEmail(opts: {
  attorneyName: string
  caseName: string
  caseNumber: string
  reportName: string
  portalUrl: string
  notes?: string
}): { subject: string; html: string } {
  return {
    subject: `Report Ready for Review — ${opts.caseName}`,
    html: buildReportNotificationEmail({
      recipientName: opts.attorneyName,
      caseName: opts.caseName,
      caseNumber: opts.caseNumber,
      reportName: opts.reportName,
      actionText: 'Report Ready for Review',
      bodyText: `Dr. Ettinger has shared <strong>${opts.reportName}</strong> for your review and editing.${opts.notes ? ` Note: "${opts.notes}"` : ''} You can review the report and submit any edits through your case portal.`,
      ctaText: 'Review Report',
      ctaUrl: opts.portalUrl,
    }),
  }
}

/** Dr. Ettinger requests changes → email to attorney */
export function changesRequestedEmail(opts: {
  attorneyName: string
  caseName: string
  caseNumber: string
  reportName: string
  portalUrl: string
  notes?: string
}): { subject: string; html: string } {
  return {
    subject: `Report Updated — ${opts.caseName}`,
    html: buildReportNotificationEmail({
      recipientName: opts.attorneyName,
      caseName: opts.caseName,
      caseNumber: opts.caseNumber,
      reportName: opts.reportName,
      actionText: 'Report Updated',
      bodyText: `Dr. Ettinger has reviewed your edits to <strong>${opts.reportName}</strong> and made some modifications.${opts.notes ? ` Note: "${opts.notes}"` : ''} Please review the updated version in your case portal.`,
      ctaText: 'Review Changes',
      ctaUrl: opts.portalUrl,
    }),
  }
}

/** Attorney requests finalization → email to Dr. Ettinger */
export function finalizationRequestedEmail(opts: {
  attorneyName: string
  caseName: string
  caseNumber: string
  reportName: string
  caseId: string
  notes?: string
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
  return {
    subject: `Finalization Requested — ${opts.caseName}`,
    html: buildReportNotificationEmail({
      recipientName: 'Dr. Ettinger',
      caseName: opts.caseName,
      caseNumber: opts.caseNumber,
      reportName: opts.reportName,
      actionText: 'Finalization Requested',
      bodyText: `<strong>${opts.attorneyName}</strong> has completed their review of <strong>${opts.reportName}</strong> and is requesting finalization.${opts.notes ? ` Their note: "${opts.notes}"` : ''} Please review and finalize the report when ready.`,
      ctaText: 'Review & Finalize',
      ctaUrl: `${appUrl}/cases/${opts.caseId}/reports`,
    }),
  }
}

/** Report finalized → email to attorney */
export function reportFinalizedEmail(opts: {
  attorneyName: string
  caseName: string
  caseNumber: string
  reportName: string
  portalUrl: string
}): { subject: string; html: string } {
  return {
    subject: `Report Finalized — ${opts.caseName}`,
    html: buildReportNotificationEmail({
      recipientName: opts.attorneyName,
      caseName: opts.caseName,
      caseNumber: opts.caseNumber,
      reportName: opts.reportName,
      actionText: 'Report Finalized',
      bodyText: `<strong>${opts.reportName}</strong> has been finalized. You can download the signed PDF from the Reports tab in your case portal.`,
      ctaText: 'Download Report',
      ctaUrl: opts.portalUrl,
    }),
  }
}

/** Send email via Resend API */
export async function sendReportNotification(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — skipping email notification')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
        to: opts.to,
        reply_to: EMAIL_REPLY_TO,
        subject: opts.subject,
        html: opts.html,
        text: htmlToText(opts.html),
      }),
    })
    return res.ok
  } catch (error) {
    console.error('Failed to send report notification email:', error)
    return false
  }
}
