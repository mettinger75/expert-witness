import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate token and pull the inviter's view permissions so the new
    // collaborator inherits the same (never more) access — minus contract
    // signing, which stays with the retaining attorney.
    const { data: invite, error: invErr } = await supabase
      .from('portal_invites')
      .select(
        'id, case_id, contact_id, is_active, can_view_summary, can_view_timeline, can_message, can_view_reports, can_upload_documents, can_view_fee_schedule, can_view_depositions, can_view_billing'
      )
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (invErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired portal link' }, { status: 403 })
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

    // Inherit the inviting firm's organization for any newly created contact.
    const { data: invitingContact } = await supabase
      .from('contacts')
      .select('organization_name')
      .eq('id', invite.contact_id)
      .single()

    // Find an existing contact by email, or create one. Re-using the existing
    // record (instead of erroring on a duplicate) means a colleague who is
    // already in the system simply gets linked to this case.
    let contact: { id: string; first_name: string; last_name: string; email: string } | null = null

    const { data: existing } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      contact = existing
    } else {
      const { data: created, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          contact_type: contactType,
          organization_name: invitingContact?.organization_name || null,
        })
        .select('id, first_name, last_name, email')
        .single()

      if (contactErr) {
        // Lost a race with a parallel insert — fetch the row that won.
        if (contactErr.code === '23505') {
          const { data: retry } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email')
            .eq('email', email)
            .single()
          contact = retry
        } else {
          throw contactErr
        }
      } else {
        contact = created
      }
    }

    if (!contact) {
      return NextResponse.json({ error: 'Could not create the contact' }, { status: 500 })
    }

    // Link the contact to the case if not already linked in this role.
    const { data: existingLink } = await supabase
      .from('case_contacts')
      .select('id')
      .eq('case_id', invite.case_id)
      .eq('contact_id', contact.id)
      .eq('role', caseRole)
      .maybeSingle()

    if (!existingLink) {
      await supabase.from('case_contacts').insert({
        case_id: invite.case_id,
        contact_id: contact.id,
        role: caseRole,
        is_primary: false,
      })
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
        can_view_summary: invite.can_view_summary ?? true,
        can_view_timeline: invite.can_view_timeline ?? true,
        can_message: invite.can_message ?? true,
        can_view_reports: invite.can_view_reports ?? false,
        can_upload_documents: invite.can_upload_documents ?? true,
        can_view_fee_schedule: invite.can_view_fee_schedule ?? true,
        can_view_depositions: invite.can_view_depositions ?? false,
        can_view_billing: invite.can_view_billing ?? false,
        can_sign_contract: false,
      })
      .select('id')
      .single()

    // Send the portal invite email. Passing caseId lets invite-email resolve
    // the case name; EMAIL_BCC means Dr. Ettinger is copied on every invite.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${newToken}`

    try {
      await fetch(`${appUrl}/api/portal/invite-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: contact.email,
          recipientName: `${contact.first_name} ${contact.last_name}`.trim(),
          portalUrl,
          caseId: invite.case_id,
          isInquiry: false,
        }),
      })
    } catch (emailErr) {
      console.error('add-contact: invite email failed', emailErr)
    }

    return NextResponse.json({
      contact,
      inviteId: newInvite?.id,
      portalUrl,
    })
  } catch (error) {
    console.error('Add contact error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
