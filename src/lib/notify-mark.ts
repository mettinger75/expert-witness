/**
 * Centralized "notify Dr. Ettinger" helper.
 *
 * Any server event that Mark needs to know about (new portal note, inbound
 * email, payment received, opposing counsel redlines, etc.) flows through
 * here so the email template, recipient, and logging stay consistent and
 * we don't sprinkle Resend fetches across the codebase.
 *
 * Fire-and-forget: callers can `void notifyMark(...)` without awaiting.
 * Gracefully no-ops when RESEND_API_KEY is missing.
 */

const NOTIFY_EMAIL = 'markettingermd@gmail.com'
const SENDER = 'Mark Ettinger, M.D. <mark@markettingermd.com>'

export interface NotifyMarkOptions {
  /** Email subject line. Keep it scannable — shows in his inbox list. */
  subject: string
  /** Short headline shown in the navy header band (e.g. "Payment Received"). */
  heading: string
  /** Body HTML. Rendered inside the branded card below the heading. */
  bodyHtml: string
  /** Optional call-to-action button */
  cta?: {
    label: string
    url: string
  }
}

/**
 * Render the branded email HTML (navy header, gold accent, Georgia serif).
 * Matches the style of existing report-notification-email.ts so Mark's inbox
 * looks consistent.
 */
export function renderMarkEmail(opts: NotifyMarkOptions): string {
  const { heading, bodyHtml, cta } = opts
  const ctaBlock = cta
    ? `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${cta.url}" style="display: inline-block; background-color: #0E1F35; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
            ${escapeHtml(cta.label)}
          </a>
        </div>
      `
    : ''

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">${escapeHtml(heading)}</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
        ${bodyHtml}
        ${ctaBlock}
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
          Expert Witness Practice — automated notification
        </p>
      </div>
    </div>
  `
}

/**
 * Send a notification email to Dr. Ettinger. Returns true on success.
 * Swallows all errors — never throws, never blocks caller.
 */
export async function notifyMark(opts: NotifyMarkOptions): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[notify-mark] RESEND_API_KEY not set — skipping:', opts.subject)
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
        from: SENDER,
        replyTo: NOTIFY_EMAIL,
        to: NOTIFY_EMAIL,
        subject: opts.subject,
        html: renderMarkEmail(opts),
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[notify-mark] Resend non-OK:', res.status, text, '—', opts.subject)
      return false
    }

    return true
  } catch (err) {
    console.error('[notify-mark] Failed to send:', err, '—', opts.subject)
    return false
  }
}

/** Escape HTML special characters for safe inclusion in an email body. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
