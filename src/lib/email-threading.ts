/**
 * Email threading helpers.
 *
 * Every email about a given case carries Message-ID / In-Reply-To / References
 * headers anchored on `caseRootMessageId(caseId)`, plus a consistent Subject
 * line. Gmail and other mail clients use this combination to group all emails
 * about a case into a single conversation — Mark's inbox shows one thread per
 * case rather than one email per portal message.
 *
 * Pure functions, no I/O. The headers object is shaped for both the Resend
 * SDK (`emails.send({ headers })`) and the raw `/v1/emails` POST body.
 */

import { EMAIL_THREAD_DOMAIN } from './email-config'

/** The synthetic root Message-ID for a case. Same value across every send. */
export function caseRootMessageId(caseId: string): string {
  return `<case-${caseId}.root@${EMAIL_THREAD_DOMAIN}>`
}

/**
 * Per-message Message-ID. Pass the actual `portal_messages.id` (UUID) for
 * real messages, or a stable string like `'invite'` / `'consult'` for the
 * non-message emails that seed the thread.
 */
export function caseChildMessageId(caseId: string, label: string): string {
  return `<case-${caseId}.msg-${label}@${EMAIL_THREAD_DOMAIN}>`
}

/**
 * Subject line used on every email about a case. Gmail threads on Subject
 * + Message-ID/References, so keeping the subject identical (modulo the
 * client-prepended `Re:`) is half the work.
 */
export function caseEmailSubject(
  caseNumber: string | null | undefined,
  caseName: string,
  isInquiry: boolean,
): string {
  const tag = caseNumber || (isInquiry ? 'Inquiry' : 'Case')
  return `[${tag}] ${caseName}`
}

export interface CaseEmailHeaderOpts {
  /**
   * When true, this email IS the root of the thread. Sets only `Message-ID`
   * to `caseRootMessageId(caseId)`. Use for the very first email about a
   * case (the inquiry/consult notification).
   */
  isRoot?: boolean
  /**
   * The portal_messages id (or stable label like `'invite'`) for the email
   * being sent. Used to construct this email's own `Message-ID` so future
   * replies can reference it directly. Ignored when `isRoot` is true.
   */
  selfLabel?: string
}

/**
 * Build the Message-ID / In-Reply-To / References headers for an email
 * about a case. Pass to `resend.emails.send({ headers: ... })` or include
 * verbatim in the raw Resend POST body.
 */
export function caseEmailHeaders(
  caseId: string,
  opts: CaseEmailHeaderOpts = {},
): Record<string, string> {
  const root = caseRootMessageId(caseId)

  if (opts.isRoot) {
    return { 'Message-ID': root }
  }

  const selfLabel = opts.selfLabel || 'msg'
  return {
    'Message-ID': caseChildMessageId(caseId, selfLabel),
    'In-Reply-To': root,
    References: root,
  }
}
