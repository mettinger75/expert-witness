/**
 * Centralized email configuration for Expert Witness practice.
 *
 * All outgoing emails use these settings so that:
 * 1. They appear from Mark's name/address
 * 2. Replies go to his inbox (Reply-To)
 * 3. A BCC copy lands in his inbox for logging
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'

/**
 * Public practice site shown in the email signature. Deliberately the marketing
 * domain and NOT `SITE_URL` — in production SITE_URL resolves to the app host
 * (platform.markettingermd.com), which is not what counsel should be sent to
 * from a signature line reading "markettingermd.com".
 */
export const PRACTICE_SITE_URL = 'https://markettingermd.com'

/**
 * Domain used inside Message-ID / In-Reply-To / References headers so that
 * Gmail and other clients group every email about a given case into a single
 * thread. Must be a domain we control (matches the live `from` addresses used
 * in /api/portal/messages and /api/portal/[token]/messages).
 */
export const EMAIL_THREAD_DOMAIN = 'markettingermd.com'

// ── Sender identity ──────────────────────────────────────────────
export const SENDER_EMAIL = 'mark@markettingermd.com'
export const SENDER_NAME = 'Mark Ettinger, M.D.'

/** Default Resend `from` field */
export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || `${SENDER_NAME} <${SENDER_EMAIL}>`

/** Reply-To so responses go to Mark's inbox */
export const EMAIL_REPLY_TO = 'markettingermd@gmail.com'

/** BCC so Mark gets a copy of every outgoing email */
export const EMAIL_BCC = 'markettingermd@gmail.com'

// ── Brand colors (single source of truth for ALL emails) ────────
export const EMAIL_COLORS = {
  /** Navy — primary text, headers, dark backgrounds */
  navy: '#0E1F35',
  /** Dark navy — email body background */
  navyDark: '#091525',
  /** Gold accent — buttons, highlights, accent lines */
  gold: '#DFC06A',
  /** Gold light — subtle gold backgrounds */
  goldLight: '#DFC06A',
  /** White — cards, content areas */
  white: '#FFFFFF',
  /** Light gray — section backgrounds */
  bgLight: '#F0F2F5',
  /** Border gray */
  border: '#E5E7EB',
  /** Border medium */
  borderMedium: '#D1D5DB',
  /** Secondary text */
  textSecondary: '#6B7280',
  /** Muted text */
  textMuted: '#8892A2',
} as const

// ── Logo & signature ─────────────────────────────────────────────
// Always use the production domain so images load in any email client.
// PNG (not SVG) — Gmail and Outlook do not render SVG in email. The logo
// is the light-background wordmark (navy text) generated from the brand SVG.
export const EMAIL_LOGO_URL =
  'https://markettingermd.com/logo-expert-witness-email.png'
export const EMAIL_SIGNATURE_URL =
  'https://markettingermd.com/ettinger-signature-email.png'

// ── Convenience: Resend send options ─────────────────────────────
/**
 * Spread into any Resend send call:
 * ```ts
 * await resend.emails.send({ ...emailSendDefaults, to, subject, html })
 * ```
 */
export const emailSendDefaults = {
  from: EMAIL_FROM,
  replyTo: EMAIL_REPLY_TO,
  bcc: EMAIL_BCC,
} as const

// ── Email event types ────────────────────────────────────────────
export const EMAIL_EVENT_TYPES = [
  'portal_invite',
  'inquiry_invite',
  'report_sent',
  'report_finalized',
  'edits_submitted',
  'changes_requested',
  'invoice_sent',
  'deposition_scheduled',
  'case_update',
  'follow_up',
  'retainer_request',
  'freeform',
] as const

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number]
