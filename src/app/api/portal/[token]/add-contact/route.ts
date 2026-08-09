import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { validatePortalInvite } from '@/lib/portal-auth'
import { sendPortalInviteEmail } from '@/lib/portal-email'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Maps the role chosen in the portal "Invite a colleague" UI to a contact_type
 * (for the contacts row) and a case_contacts role. Keys must match the values
 * in PortalInviteColleague.tsx.
 */
const ROLE_MAP: Record<string, { contactType: string; caseRole: string }> = {
  co_counsel: { contactType: 'attorney', caseRole: 'co_counsel' },
  paralegal: { contactType: 'paralegal', caseRole: 'paralegal' },
  co_expert: { contactType: 'expert', caseRole: 'co_expert' },
  other: { contactType: 'other', caseRole: 'other' },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CONTACT_FIELDS = 'id, first_name, last_name, email, contact_type, organization_name'

type ContactRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  contact_type: string | null
  organization_name: string | null
}

/**
 * Escapes LIKE metacharacters so an address is matched literally. Without this
 * an underscore — legal and common in email addresses — is a single-character
 * wildcard, so `a_b@x.com` would match `a.b@x.com` and silently adopt the wrong
 * person's contact record.
 */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

const norm = (value: string | null | undefined) => (value || '').trim().toLowerCase()

/** Treats both NULL and '' as "no email on file" — the database holds both. */
const hasNoEmail = (c: ContactRow) => !c.email || !c.email.trim()

/**
 * Consumer mailbox providers. Two people on gmail.com share a domain but not an
 * employer, so a shared domain only implies a shared firm off this list.
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'mail.com', 'zoho.com', 'fastmail.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'bellsouth.net',
  'cox.net', 'charter.net', 'earthlink.net', 'juno.com',
])

const emailDomain = (value: string | null | undefined) => {
  const at = (value || '').lastIndexOf('@')
  return at === -1 ? '' : norm(value).slice(at + 1)
}

/** True only when both addresses sit on the same private (non-consumer) domain. */
function sameFirmDomain(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = emailDomain(a)
  return !!da && da === emailDomain(b) && !PUBLIC_EMAIL_DOMAINS.has(da)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token (active + unexpired) and require the invite-colleague
    // permission, which is off by default and granted per invite.
    const v = await validatePortalInvite(token, { permission: 'can_invite_contacts' })
    if (v.error) return v.error
    const { invite, supabase } = v

    // The new collaborator inherits a SAFE SUBSET of the inviter's access —
    // never reports, billing, depositions, or contract signing. They DO get
    // invite rights so the team can keep adding people (chaining).
    const inviterPerms = invite as unknown as {
      can_view_timeline?: boolean
      can_message?: boolean
      can_upload_documents?: boolean
      can_view_fee_schedule?: boolean
    }

    // Throttle invite-colleague per token and per IP to prevent spam.
    const ip = clientIp(request)
    const [tokenOk, ipOk] = await Promise.all([
      checkRateLimit(`add-contact:token:${token}`, 10, 3600),
      checkRateLimit(`add-contact:ip:${ip}`, 20, 3600),
    ])
    if (!tokenOk || !ipOk) {
      return NextResponse.json(
        { error: 'Too many invitations from this portal. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const firstName = (body.firstName || '').trim()
    const lastName = (body.lastName || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const { contactType, caseRole } = ROLE_MAP[body.role] || ROLE_MAP.other

    if (!firstName || !email) {
      return NextResponse.json({ error: 'First name and email are required' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const { data: invitingContact } = await supabase
      .from('contacts')
      .select('organization_name, first_name, last_name, email')
      .eq('id', invite.contact_id)
      .single()

    // Organization to stamp on a NEWLY created contact — only when the two
    // addresses share a private email domain, which is real evidence they work
    // at the same firm. Inheriting unconditionally is what put a nurse-attorney
    // consultancy on opposing-firm counsel's record: the field then flows
    // straight into firm_name on a generated engagement contract, where a wrong
    // firm is both invisible and consequential. Blank is recoverable; wrong is
    // not, so when the domains disagree we leave it for Dr. Ettinger to fill in.
    const inheritedOrg = sameFirmDomain(invitingContact?.email, email)
      ? invitingContact?.organization_name || null
      : null

    // Name of the person doing the adding, so the invite email can read
    // "X has added you to this case" instead of a generic invitation.
    const addedByName = invitingContact
      ? `${invitingContact.first_name || ''} ${invitingContact.last_name || ''}`.trim()
      : ''

    // Find an existing contact, or create one. Re-using the existing record
    // (instead of erroring on a duplicate) means a colleague who is already in
    // the system simply gets linked to this case.
    //
    // Matching runs in two passes. An email-only lookup is not enough: most
    // contacts here start life as name-only stubs created by the inquiry flow
    // (attorney of record known, email not yet provided), and those can never
    // match on email. That is how one attorney ends up with two records — a
    // stub holding the case role and a portal-created row holding the email.
    let contact: ContactRow | null = null
    let matchedStub = false

    // Pass 1 — email, case-insensitively, anywhere in the practice.
    // `contacts.email` has no unique index and already holds duplicate
    // addresses, so order and take one rather than using .maybeSingle(), which
    // errors outright when more than one row matches.
    const { data: byEmail } = await supabase
      .from('contacts')
      .select(CONTACT_FIELDS)
      .ilike('email', likeLiteral(email))
      .order('created_at', { ascending: true })
      .limit(1)

    if (byEmail?.length) {
      contact = byEmail[0] as ContactRow
    } else if (lastName) {
      // Pass 2 — a name-only stub ALREADY ON THIS CASE. Scoping to the case is
      // what makes name matching safe: two unrelated "John Smith"s elsewhere in
      // the practice never merge, but the stub counsel created for this matter
      // gets adopted instead of duplicated. Requires a surname — the portal
      // form allows a blank one, and a first name alone is far too weak to
      // merge two records on.
      const { data: caseLinks } = await supabase
        .from('case_contacts')
        .select(`contact_id, contacts!inner(${CONTACT_FIELDS})`)
        .eq('case_id', invite.case_id)

      const stub = (caseLinks || [])
        .map((l) => (l as unknown as { contacts: ContactRow }).contacts)
        .find(
          (c) =>
            c &&
            hasNoEmail(c) &&
            norm(c.first_name) === norm(firstName) &&
            norm(c.last_name) === norm(lastName)
        )

      if (stub) {
        // Adopt the stub and backfill ONLY what it is missing. Never overwrite
        // a value already on the record — the organization and contact type
        // were set deliberately when the case was opened and are more reliable
        // than anything inferred from who happens to be sending this invite.
        const patch: Record<string, string> = { email }
        if (!stub.contact_type) patch.contact_type = contactType
        if (!stub.organization_name && inheritedOrg) patch.organization_name = inheritedOrg

        const { data: updated, error: updateErr } = await supabase
          .from('contacts')
          .update(patch)
          .eq('id', stub.id)
          .select(CONTACT_FIELDS)
          .single()

        if (!updateErr && updated) {
          contact = updated as ContactRow
          matchedStub = true
        } else {
          // Falling through to the insert below still serves the inviter, but it
          // recreates the duplicate this pass exists to prevent — so say so.
          console.error(
            `add-contact: could not adopt stub ${stub.id} on case ${invite.case_id}; ` +
              'creating a separate contact instead',
            updateErr
          )
        }
      }
    }

    if (!contact) {
      const { data: created, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          contact_type: contactType,
          organization_name: inheritedOrg,
        })
        .select(CONTACT_FIELDS)
        .single()

      if (contactErr) {
        // Lost a race with a parallel insert — fetch the row that won.
        if (contactErr.code === '23505') {
          const { data: retry } = await supabase
            .from('contacts')
            .select(CONTACT_FIELDS)
            .ilike('email', likeLiteral(email))
            .order('created_at', { ascending: true })
            .limit(1)
          contact = (retry?.[0] as ContactRow) || null
        } else {
          throw contactErr
        }
      } else {
        contact = created as ContactRow
      }
    }

    if (!contact) {
      return NextResponse.json({ error: 'Could not create the contact' }, { status: 500 })
    }

    // Link the contact to the case if they are not already on it in ANY role.
    // Checking every role rather than just this one matters: an adopted stub is
    // typically already linked as retaining_attorney, and adding a second row
    // for the dropdown value would put the same person on the case twice — the
    // case page groups retaining_attorney and co_counsel under one heading, so
    // they would visibly render twice. An existing role also outranks whatever
    // the inviter picked, since it was assigned deliberately when the case was
    // opened.
    const { data: existingLinks } = await supabase
      .from('case_contacts')
      .select('id, role')
      .eq('case_id', invite.case_id)
      .eq('contact_id', contact.id)
      .limit(1)

    if (!existingLinks?.length) {
      await supabase.from('case_contacts').insert({
        case_id: invite.case_id,
        contact_id: contact.id,
        role: caseRole,
        is_primary: false,
      })
    }

    if (matchedStub) {
      // Worth a line in the log: this path backfilled an existing case record
      // rather than creating a new one, and kept the role already on file.
      console.log(
        `add-contact: adopted existing stub ${contact.id} for ${email} on case ${invite.case_id}` +
          ` (kept role ${existingLinks?.[0]?.role ?? caseRole})`
      )
    }

    // Create a portal invite for the collaborator, inheriting the inviter's
    // view permissions. Colleagues skip the inquiry onboarding flow and can
    // never sign the retention agreement.
    const newToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: newInvite } = await supabase
      .from('portal_invites')
      .insert({
        case_id: invite.case_id,
        contact_id: contact.id,
        token: newToken,
        is_active: true,
        expires_at: expiresAt,
        onboarding_mode: false,
        can_view_summary: true,
        can_view_timeline: inviterPerms.can_view_timeline ?? true,
        can_message: inviterPerms.can_message ?? true,
        can_view_reports: false,
        can_upload_documents: inviterPerms.can_upload_documents ?? true,
        can_view_fee_schedule: inviterPerms.can_view_fee_schedule ?? true,
        can_view_depositions: false,
        can_view_billing: false,
        can_sign_contract: false,
        // Added people can add others too (invite chaining); still gated by the
        // same permission on their own link and rate-limited per token and IP.
        can_invite_contacts: true,
      })
      .select('id')
      .single()

    // Send the portal invite email. Passing caseId lets invite-email resolve
    // the case name; EMAIL_BCC means Dr. Ettinger is copied on every invite.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'
    const portalUrl = `${appUrl}/portal/${newToken}`

    let emailSent = false
    try {
      const emailResult = await sendPortalInviteEmail({
        // Use the validated address the inviter typed rather than whatever
        // casing the matched row happens to store, and skip null name parts so
        // a stub with no surname cannot render as "Tim null" in the greeting.
        recipientEmail: email,
        recipientName: [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim(),
        portalUrl,
        caseId: invite.case_id,
        addedByName: addedByName || undefined,
        isInquiry: false,
      })
      emailSent = emailResult.success
    } catch (emailErr) {
      console.error('add-contact: invite email failed', emailErr)
    }

    // Do not return the raw portal URL to the inviter — the link is delivered
    // only to the new contact's email on file.
    return NextResponse.json({ success: true, emailSent })
  } catch (error) {
    console.error('Add contact error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
