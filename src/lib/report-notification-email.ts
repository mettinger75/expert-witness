/**
 * Report notification email templates using the Meridian Design System.
 * Follows the same pattern as the contract signing notification emails.
 */

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

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: #C9A84C;">${actionText}</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Dear ${recipientName},
        </p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          ${bodyText}
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Report:</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${reportName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Case:</td>
            <td style="padding: 8px 0; font-size: 14px;">${caseName} (${caseNumber})</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${ctaUrl}" style="display: inline-block; background-color: #0E1F35; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
            ${ctaText}
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
          Mark Ettinger, M.D. &mdash; Expert Witness Practice
        </p>
      </div>
    </div>
  `
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
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
        from: 'Expert Witness <noreply@meridian-anesthesia.com>',
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    })
    return res.ok
  } catch (error) {
    console.error('Failed to send report notification email:', error)
    return false
  }
}
