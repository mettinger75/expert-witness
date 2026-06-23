# Client Portal Security and UX Handoff for Claude Code

Date: 2026-06-23

Owner context: expert witness practice-management app for Dr. Mark Ettinger, anesthesiology expert witness.

Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Supabase Postgres, Resend.

Design system: Meridian navy `#0E1F35` and gold `#DFC06A`.

Product constraint: preserve the token-based portal model. Portal visitors should not need accounts, passwords, or login. Internal dashboard users may require normal Supabase auth for admin-only API routes.

## Executive Summary

Do not ship the planned invite-colleague or self-serve recovery improvements until the P0/P1 security fixes below are complete.

The most important issue is not token entropy. The 64-char hex tokens are strong. The problem is that several service-role API routes are public route handlers and accept caller-supplied IDs. A portal token holder can learn `case_id`, contact IDs, report IDs, invoice IDs, and sometimes invite IDs from the portal payload or UI. Public dashboard APIs then let that caller cross the token boundary.

The desired end state:

1. Public portal APIs validate an active, unexpired token and enforce case ownership on every downstream row.
2. Dashboard/admin APIs require an authenticated internal user before using the Supabase service role.
3. Portal responses expose only portal-safe fields.
4. Invite-colleague and recovery flows have explicit throttling, audit trails, and least-privilege invite creation.
5. UX improvements are sequenced after access control, not before it.

## Non-Negotiable Implementation Rules

- Preserve token-only visitor access. Do not add visitor login/password requirements.
- Do not rely on client-side protected layouts for API security. Route handlers using `getSupabaseAdmin()` must enforce authorization server-side.
- Treat any cross-case data read or write as P0.
- Prefer small helpers and repeated explicit route checks over large framework rewrites.
- Preserve Meridian styling; avoid unrelated visual redesigns.
- Avoid broad refactors while fixing access control.

## Phase 0: Shared Security Helpers

Create small helper modules first so route changes stay mechanical.

### Add `src/lib/portal-auth.ts`

Purpose: centralize token validation for all `/api/portal/[token]/**` routes.

Recommended shape:

```ts
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type PortalInviteForAccess = {
  id: string
  case_id: string
  contact_id: string
  expires_at: string
  is_active: boolean
  can_view_summary?: boolean
  can_view_timeline?: boolean
  can_message?: boolean
  can_view_reports?: boolean
  can_edit_reports?: boolean
  can_upload_documents?: boolean
  can_view_fee_schedule?: boolean
  can_view_depositions?: boolean
  can_view_billing?: boolean
  can_book_scheduling?: boolean
  can_sign_contract?: boolean
  can_invite_contacts?: boolean
  contract_id?: string | null
  onboarding_mode?: boolean
  onboarding_steps?: unknown
}

export async function validatePortalInvite(
  token: string,
  opts: {
    select?: string
    permission?: keyof PortalInviteForAccess
  } = {},
) {
  const supabase = getSupabaseAdmin()
  const { data: invite, error } = await supabase
    .from('portal_invites')
    .select(opts.select || '*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !invite) {
    return { error: NextResponse.json({ error: 'Portal link not found' }, { status: 404 }) }
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: NextResponse.json({ error: 'Portal link expired' }, { status: 410 }) }
  }
  if (opts.permission && !invite[opts.permission]) {
    return { error: NextResponse.json({ error: 'Portal permission denied' }, { status: 403 }) }
  }

  return { invite, supabase }
}
```

Adjust the exact type to match generated DB types. The important part is that every token route uses one expiry and permission path.

### Add `src/lib/api-admin-auth.ts`

Purpose: internal dashboard route handlers must verify a real Supabase user before using `getSupabaseAdmin()`.

The current protected layout checks auth only in the browser. API routes do not inherit that protection. Because Supabase auth is stored client-side, the minimal approach is:

1. Add a route helper that reads `Authorization: Bearer <access_token>`.
2. Validate the token with the Supabase anon client via `auth.getUser(accessToken)`.
3. Return `401` if missing/invalid.
4. Update dashboard fetch calls to attach the current Supabase access token.

Recommended helper:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function requireAdminUser(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { error: NextResponse.json({ error: 'Auth not configured' }, { status: 500 }) }
  }

  const supabase = createClient(url, anon)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: data.user }
}
```

Then create a tiny client helper for protected UI fetches, or update the relevant components directly:

```ts
import { supabase } from '@/lib/supabase'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}
```

## Phase 1: P0 Fixes

### P0.1 Lock down public dashboard portal APIs

Files:

- `src/app/api/portal/route.ts`
- `src/app/api/portal/messages/route.ts`
- `src/app/api/portal/messages/unread-count/route.ts`
- `src/app/api/portal/invites/[id]/activity/route.ts`
- `src/app/api/portal/attach-contract/route.ts`
- `src/app/api/portal/invite-email/route.ts`

Problem:

These routes use the Supabase service role but do not require a server-validated admin user. Public callers can list invite tokens, create invites, read case portal messages, mark messages read, send provider messages, read access logs, attach contracts, or send branded email.

Minimal fix:

1. Add `requireAdminUser(request)` at the top of each route handler.
2. Return its `error` before calling `getSupabaseAdmin()`.
3. Update callers in protected UI to include `Authorization`.
4. Keep public token routes public only where token validation is the auth model.

Known protected UI callers to update:

- `src/components/portal/CreatePortalInviteDialog.tsx`
- `src/components/portal/BulkPortalInviteDialog.tsx`
- `src/components/portal/PortalActivityDrawer.tsx`
- `src/components/portal/PortalMessagesPanel.tsx`
- `src/components/reports/SendToAttorneyDialog.tsx`
- `src/components/contracts/SendForSignatureDialog.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/app/(protected)/cases/[id]/messages/page.tsx`

Acceptance checks:

- Unauthenticated `GET /api/portal?caseId=<case>` returns 401.
- Authenticated dashboard still lists and creates invites.
- Unauthenticated `GET /api/portal/messages?caseId=<case>` returns 401.
- Token portal routes such as `GET /api/portal/[token]` still work with no login.

### P0.2 Fix document IDOR

Files:

- `src/app/api/documents/view/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/components/documents/DocumentViewer.tsx`
- `src/app/api/portal/[token]/documents/route.ts`

Problem:

`/api/documents/view?id=<documentId>` fetches a document by UUID and returns a signed storage URL using the service role. `/api/documents/[id]` patches metadata by UUID. Neither route checks admin auth or portal case scope.

Minimal fix:

1. Add admin auth to dashboard document APIs.
2. Add a portal-specific document view route:
   - `src/app/api/portal/[token]/documents/[documentId]/view/route.ts`
   - Validate token, expiry, and document permission.
   - Fetch document with `.eq('id', documentId).eq('case_id', invite.case_id).is('deleted_at', null)`.
   - Return signed URL only after the case match.
3. If portal document viewing is not intended, do not expose view links in `PortalDocuments`.

Acceptance checks:

- Unauthenticated `/api/documents/view?id=<uuid>` returns 401.
- Portal token cannot view a document from another case.
- Dashboard `DocumentViewer` still works after adding authenticated headers.

### P0.3 Fix report PDF export IDOR

Files:

- `src/app/portal/[token]/PortalReports.tsx`
- `src/app/api/reports/export-pdf/route.ts`
- New: `src/app/api/portal/[token]/reports/[reportId]/pdf/route.ts`

Problem:

The portal calls `/api/reports/export-pdf` with only `reportId`. That route fetches the report by UUID and exports PDF with no token or case check.

Minimal fix:

1. Add a token-scoped portal PDF route.
2. Validate token, expiry, and `can_view_reports`.
3. Fetch report by `.eq('id', reportId).eq('case_id', invite.case_id)`.
4. Reuse `generateReportPdf`.
5. Change `PortalReports.tsx` to call the new portal route.
6. Add admin auth to `/api/reports/export-pdf` for dashboard use.

Acceptance checks:

- Portal token can export only reports for its case.
- Same request with a report ID from another case returns 404.
- Unauthenticated dashboard export endpoint returns 401.

### P0.4 Prevent cross-case contract attachment and contract read

Files:

- `src/app/api/portal/attach-contract/route.ts`
- `src/app/api/portal/[token]/contract/route.ts`

Problem:

`attach-contract` is public and does not verify the invite and contract belong to the same case. The token contract route fetches `contracts` by `contract_id` only.

Minimal fix:

1. Add admin auth to `attach-contract`.
2. Select `case_id` from both `portal_invites` and `contracts`.
3. Reject if `invite.case_id !== contract.case_id`.
4. In token contract GET/POST, add `.eq('case_id', invite.case_id)` to contract lookups.

Acceptance checks:

- Unauthenticated attach-contract returns 401.
- Admin cannot attach a contract from Case A to an invite from Case B.
- Token cannot fetch/sign a contract outside `invite.case_id`.

## Phase 2: P1 Fixes

### P1.1 Apply expiry checks consistently to all token routes

Files:

- `src/app/api/portal/[token]/add-contact/route.ts`
- `src/app/api/portal/[token]/messages/route.ts`
- `src/app/api/portal/[token]/documents/route.ts`
- `src/app/api/portal/[token]/case-details/route.ts`
- `src/app/api/portal/[token]/onboarding/route.ts`
- `src/app/api/portal/[token]/tutorial/route.ts`
- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/[token]/contract/route.ts`
- `src/app/api/portal/[token]/billing/route.ts`
- `src/app/api/portal/[token]/invoices/[id]/checkout/route.ts`
- `src/app/api/portal/[token]/invoices/[id]/pdf/route.ts`
- `src/app/api/portal/[token]/reports/[reportId]/route.ts`

Problem:

Some token routes check `expires_at`; others only check `is_active`. Expired portal links can still perform actions through those routes.

Minimal fix:

Use `validatePortalInvite` everywhere. Do not duplicate ad hoc checks.

Acceptance checks:

- Force an invite `expires_at` into the past.
- Every token route returns 410 or equivalent expired response.
- Active unexpired tokens still work.

### P1.2 Put governance around invite-colleague

Files:

- `src/app/api/portal/[token]/add-contact/route.ts`
- `src/app/portal/[token]/PortalInviteColleague.tsx`
- `src/app/api/portal/route.ts`
- Supabase migration for `portal_invites`
- `src/types/database.types.ts`

Problem:

Any active portal token can create a contact, link it to the case, create a new invite, inherit report/billing/document permissions, and receive the raw new portal URL in JSON.

Recommended product decision:

Allow this only for a retaining attorney or explicitly approved invite. Do not make it available to every summary viewer.

Minimal fix:

1. Add `can_invite_contacts boolean NOT NULL DEFAULT false` to `portal_invites`.
2. Expose the UI only when `invite.can_invite_contacts === true`.
3. In `add-contact`, require `can_invite_contacts`.
4. New colleague invites should default to a safe subset:
   - `can_view_summary`: true
   - `can_message`: inherit only if inviter has it
   - `can_upload_documents`: inherit only if inviter has it
   - `can_view_reports`: false unless explicitly allowed
   - `can_view_billing`: false
   - `can_sign_contract`: false
   - `can_invite_contacts`: false
5. Do not return `portalUrl` in JSON to the inviter unless the product explicitly wants link sharing. Prefer `{ success: true, emailSent: true }`.
6. Add rate limits per token, IP, and recipient email.
7. Add audit rows for invite-colleague attempts and results.

Acceptance checks:

- Token without `can_invite_contacts` receives 403.
- Newly invited colleague cannot see billing unless explicitly granted.
- Repeated invite attempts hit a clear throttled response.
- UI does not render the card for non-inviter tokens.

### P1.3 Reduce PII and internal fields in portal payload

Files:

- `src/app/api/portal/[token]/route.ts`
- `src/app/portal/[token]/PortalSummary.tsx`
- `src/app/portal/[token]/PortalTimeline.tsx`

Problem:

The main portal data route returns `case_contacts` with `contacts(*)` and communication logs with `select('*')`. The UI displays names, emails, phone numbers, and the raw response can include internal notes, follow-up, billing, and attachment fields.

Minimal fix:

1. Replace `contacts(*)` with an explicit portal-safe contact select.
2. Consider only showing the current invite contact plus Dr. Ettinger, not all case contacts.
3. Replace communication `select('*')` with explicit safe fields.
4. Add an `is_portal_visible` flag to communication logs if attorneys should not see every internal log.
5. Remove invite identifiers from the payload unless required by UI.

Suggested portal-safe fields:

- Case: display name, number, general status, side, case type, specialty, safe summary fields.
- Contacts: name, role, organization only by default. Avoid phone/email unless intentionally client-visible.
- Timeline: type, subject, summary, date, direction, public participants only.

Acceptance checks:

- Portal JSON no longer includes `contact_id`, invite `id`, raw `token`, phone numbers, internal notes, follow-up fields, or billing linkage unless explicitly needed.
- Summary UI still renders.

### P1.4 Sanitize report HTML on write

Files:

- `src/app/api/portal/[token]/reports/[reportId]/route.ts`
- `src/app/portal/[token]/PortalReports.tsx`
- `src/app/portal/[token]/PortalReportEditor.tsx`

Problem:

Portal report edits accept arbitrary HTML and later render it with `dangerouslySetInnerHTML`. This creates stored XSS risk for portal and admin viewers.

Minimal fix:

1. Add server-side HTML sanitization before storing `editedHtml` or `collaboration_html`.
2. Use a strict allowlist compatible with Tiptap output.
3. Strip scripts, event handler attributes, `javascript:` URLs, unsafe iframes, and unsafe inline styles.
4. Consider adding `isomorphic-dompurify` or a similar library. If adding a dependency, keep the wrapper small and covered by fixtures.

Acceptance checks:

- `<script>`, `onerror`, `onclick`, and `javascript:` payloads are stripped before persistence.
- Normal Tiptap formatting, tables, lists, bold/italic, headings, and links still work.

### P1.5 Make invite-email and recovery abuse-resistant

Files:

- `src/app/api/portal/invite-email/route.ts`
- `src/app/api/portal/recover/route.ts`
- `src/app/api/portal/[token]/add-contact/route.ts`
- `src/app/portal/[token]/PortalView.tsx`

Problem:

`invite-email` is currently a public branded mail sender. Recovery revives expired links in place and has no rate limiting.

Minimal fix:

1. Move Resend sending into `src/lib/portal-email.ts`.
2. Make `/api/portal/invite-email` admin-only.
3. Let public server routes call the email helper directly, not via public HTTP.
4. Add rate limits to recovery by IP and email.
5. Recovery should rotate/reissue tokens or create a new invite when reviving access, rather than extending the old token.
6. Keep recovery responses generic to avoid enumeration.
7. Escape all interpolated email HTML fields.

Acceptance checks:

- Unauthenticated POST to `/api/portal/invite-email` returns 401.
- Recovery response remains generic.
- Repeated recovery attempts throttle.
- Recovered link works only for the matching contact email.

## Phase 3: P2 Stability and Correctness

### P2.1 Make counters and report collaboration updates atomic

Files:

- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/[token]/reports/[reportId]/route.ts`

Problems:

- `view_count: invite.view_count + 1` can lose increments under concurrent loads.
- Report auto-linking can race when two invitees open the same editable report.
- Revision numbering can duplicate under concurrent submissions.

Minimal fix:

1. Add a Postgres RPC for invite view increments or use an atomic SQL update.
2. When auto-linking a report, update only where `active_collaboration_invite_id IS NULL`.
3. Add a uniqueness constraint on `(report_id, portal_invite_id, revision_number)` or compute revision number inside a transaction/RPC.

Acceptance checks:

- Two concurrent report opens do not both claim edit ownership.
- Two concurrent edits do not create duplicate revision numbers.

### P2.2 Stop silent stale invite deactivation failure

Files:

- `src/components/portal/CreatePortalInviteDialog.tsx`
- `src/app/api/portal/[token]/route.ts` or a new admin revoke endpoint

Problem:

The UI calls `DELETE /api/portal/${existingInvite.token}`, but that route has no DELETE handler. Old links silently remain active.

Minimal fix:

Add an authenticated admin revoke route. Prefer revoking by invite ID rather than token:

- `PATCH /api/portal/invites/[id]` with `{ is_active: false }`, or
- `DELETE /api/portal/invites/[id]`.

Acceptance checks:

- Creating a replacement invite actually deactivates the old invite.
- Old token returns 404/410.

### P2.3 Make email outcomes visible

Files:

- `src/app/api/portal/[token]/add-contact/route.ts`
- `src/app/api/portal/[token]/messages/route.ts`
- `src/app/api/portal/[token]/documents/route.ts`
- `src/app/api/portal/[token]/case-details/route.ts`
- `src/app/api/portal/[token]/contract/route.ts`

Problem:

Some flows log email errors but still return success. This is acceptable for non-critical notifications but bad for invite delivery.

Minimal fix:

- For invite delivery, return `emailSent: false` if sending failed and do not show "Invitation sent".
- For provider notifications, persist a notification status or create a retryable outbox table later.
- At minimum, check `res.ok` after all Resend fetches.

## Phase 4: UX, Mobile, and Accessibility

### P2.4 Fix mobile tab overflow

File:

- `src/app/portal/[token]/PortalView.tsx`

Problem:

The tab navigation is a single non-wrapping flex row. With many permissions enabled, it will overflow on mobile.

Minimal fix:

Use either:

- Horizontal scrolling with `overflow-x-auto`, stable min-width buttons, and visible scroll affordance, or
- A mobile `<Select>` for tabs below `sm`.

Acceptance checks:

- iPhone-width viewport can access every enabled tab.
- No tab labels overlap the header or content.

### P2.5 Make tutorial overlay accessible

File:

- `src/app/portal/[token]/PortalTutorial.tsx`

Problems:

- The custom overlay lacks `role="dialog"`, `aria-modal`, focus management, Escape handling, and keyboard navigation.
- It animates even when `prefers-reduced-motion` is set.

Minimal fix:

1. Add dialog semantics to the tooltip container.
2. Focus the first actionable button on open and restore focus on close.
3. Support Escape to close, Left/Right for Back/Next.
4. Add reduced-motion CSS for `portalTutorialFadeIn`, spotlight transition, and spinner alternatives.

### P2.6 Make document upload keyboard accessible

File:

- `src/app/portal/[token]/PortalDocuments.tsx`

Problem:

The drag/drop area is a clickable `div` with hidden file input. It is not keyboard reachable by default.

Minimal fix:

Use a visible-focus `<label htmlFor="portal-document-file">` or a real `<button>` that triggers the file input. Add `id` to the file input and preserve drag/drop behavior.

### P3.1 First-run dialog sequencing

File:

- `src/app/portal/[token]/PortalView.tsx`

Current state:

This appears fixed in the current branch. The welcome cover starts with `showCover = invite.view_count === 1`, `showSaveLink` starts false, and `enterFromCover` opens the save-link prompt after closing the cover.

Recommendation:

Keep that sequencing. Do not add a second `view_count === 1` effect that opens save-link independently.

### P3.2 Remove or feature-flag password portal code

Files:

- `src/app/portal/login/page.tsx`
- `src/app/api/portal/auth/login/route.ts`
- `src/app/api/portal/auth/register/route.ts`

Problem:

This conflicts with the token-only portal model and adds auth surface that is not part of the product plan.

Minimal fix:

Delete it if unused. If there is a future product reason to keep it, hide behind a disabled feature flag and rate-limit login/register.

## Planned Improvements Critique

### 1. Cinematic animated welcome screen

Recommendation: keep, but only after P0/P1 security is complete.

Current status:

- `PortalWelcomeCover` already honors reduced motion for the canvas and CSS animations.
- It uses a custom full-screen dialog. Add initial focus and focus restoration if it remains custom.

Minimal UX guidance:

- Keep it brief and skippable.
- Do not block urgent tasks like signing, messaging, or payment.
- Avoid showing sensitive patient details on the cinematic screen.

### 2. Let portal visitors add other people

Recommendation: ship only with explicit `can_invite_contacts`, throttling, safe default permissions, and no raw returned portal URL.

Recommended copy:

- "Invite someone from your team" is clearer than "Add someone to this case".
- Add a small confirmation: "They will receive their own secure link. Dr. Ettinger's office is copied."

Server-side must own the permission set. Do not let the client choose booleans.

### 3. Bookmark prompt and self-serve recovery

Recommendation: good feature, but recovery should rotate/reissue links and rate-limit.

Current status:

- Save-link prompt is sequenced after the welcome cover.
- Recovery response avoids enumeration, which is good.

Needed before launch:

- Per-IP/email throttling.
- Audit log for recovery attempts.
- Token rotation or new invite on recovery.
- Do not expose whether an email matched.

## Suggested Implementation Order for Claude Code

1. Add `requireAdminUser` and authenticated headers for portal dashboard APIs.
2. Lock down `/api/portal`, `/api/portal/messages`, `/api/portal/invites/[id]/activity`, `/api/portal/attach-contract`, and `/api/portal/invite-email`.
3. Add `validatePortalInvite` and migrate all token routes to it.
4. Fix document view/update IDOR.
5. Fix report PDF export IDOR.
6. Fix contract case matching.
7. Add `can_invite_contacts` migration and safe invite-colleague behavior.
8. Reduce PII in main portal payload.
9. Add HTML sanitization for report edits.
10. Add throttling and audit for recovery/add-contact/message spam.
11. Fix mobile tabs and accessibility issues.
12. Remove or feature-flag password portal code.

## Verification Checklist

Run after implementation:

```bash
npm run lint
npm run build
```

Manual API checks:

```bash
# Dashboard-only routes should reject unauthenticated callers
curl -i 'http://localhost:3000/api/portal?caseId=CASE_ID'
curl -i 'http://localhost:3000/api/portal/messages?caseId=CASE_ID'
curl -i 'http://localhost:3000/api/portal/invites/INVITE_ID/activity'
curl -i -X POST 'http://localhost:3000/api/portal/invite-email' \
  -H 'Content-Type: application/json' \
  -d '{"recipientEmail":"x@example.com","portalUrl":"https://example.com","caseName":"Test"}'

# Token routes should reject expired links
curl -i 'http://localhost:3000/api/portal/EXPIRED_TOKEN'
curl -i 'http://localhost:3000/api/portal/EXPIRED_TOKEN/documents'
curl -i 'http://localhost:3000/api/portal/EXPIRED_TOKEN/messages'
```

Cross-case checks:

- Token for Case A cannot fetch report PDF for Case B.
- Token for Case A cannot fetch document signed URL for Case B.
- Token for Case A cannot fetch or sign contract for Case B.
- Token for Case A cannot create colleague invite unless `can_invite_contacts` is true.

Browser checks:

- Portal still opens from `/portal/[token]` with no login.
- First visit shows welcome cover, then save-link prompt, not both at once.
- iPhone viewport can reach every enabled tab.
- Keyboard users can open upload file picker, close tutorial, and navigate tutorial steps.
- Reduced-motion setting disables decorative movement.

## Files Most Likely To Change

New:

- `src/lib/portal-auth.ts`
- `src/lib/api-admin-auth.ts`
- `src/lib/portal-email.ts`
- `src/app/api/portal/[token]/reports/[reportId]/pdf/route.ts`
- `src/app/api/portal/[token]/documents/[documentId]/view/route.ts`
- Supabase migration for `can_invite_contacts`

Existing:

- `src/app/api/portal/route.ts`
- `src/app/api/portal/messages/route.ts`
- `src/app/api/portal/messages/unread-count/route.ts`
- `src/app/api/portal/invites/[id]/activity/route.ts`
- `src/app/api/portal/invite-email/route.ts`
- `src/app/api/portal/recover/route.ts`
- `src/app/api/portal/attach-contract/route.ts`
- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/[token]/add-contact/route.ts`
- `src/app/api/portal/[token]/messages/route.ts`
- `src/app/api/portal/[token]/documents/route.ts`
- `src/app/api/portal/[token]/case-details/route.ts`
- `src/app/api/portal/[token]/onboarding/route.ts`
- `src/app/api/portal/[token]/tutorial/route.ts`
- `src/app/api/portal/[token]/contract/route.ts`
- `src/app/api/portal/[token]/reports/[reportId]/route.ts`
- `src/app/api/documents/view/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/reports/export-pdf/route.ts`
- `src/app/portal/[token]/PortalView.tsx`
- `src/app/portal/[token]/PortalReports.tsx`
- `src/app/portal/[token]/PortalInviteColleague.tsx`
- `src/app/portal/[token]/PortalDocuments.tsx`
- `src/app/portal/[token]/PortalTutorial.tsx`
- `src/components/portal/CreatePortalInviteDialog.tsx`
- `src/components/portal/BulkPortalInviteDialog.tsx`
- `src/components/portal/PortalMessagesPanel.tsx`
- `src/components/portal/PortalActivityDrawer.tsx`
- `src/components/reports/SendToAttorneyDialog.tsx`
- `src/components/contracts/SendForSignatureDialog.tsx`
- `src/types/database.types.ts`

## Stop Conditions

Pause and ask before continuing if any of these are true:

- The project already has a different server-side auth mechanism not visible in this repo.
- The product owner wants portal visitors to be able to share raw portal links directly.
- Billing visibility is intended for every colleague invite by default.
- There are legal/workflow reasons all case contacts must be visible to every portal visitor.

