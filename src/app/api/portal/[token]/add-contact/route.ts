import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate token
    const { data: invite, error: invErr } = await supabase
      .from('portal_invites')
      .select('id, case_id, contact_id, is_active')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (invErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired portal link' }, { status: 403 })
    }

    const { firstName, lastName, email, role } = await request.json()

    if (!firstName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'First name and email are required' }, { status: 400 })
    }

    // Get the inviting contact's organization to inherit
    const { data: invitingContact } = await supabase
      .from('contacts')
      .select('organization_name')
      .eq('id', invite.contact_id)
      .single()

    // Create new contact
    const { data: newContact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName?.trim() || '',
        email: email.trim().toLowerCase(),
        contact_type: role === 'retaining_attorney' || role === 'co_counsel' ? 'attorney' : 'paralegal',
        organization_name: invitingContact?.organization_name || null,
      })
      .select('id, first_name, last_name, email')
      .single()

    if (contactErr) {
      // Might be duplicate email — try to find existing
      if (contactErr.code === '23505') {
        return NextResponse.json({ error: 'A contact with this email already exists' }, { status: 409 })
      }
      throw contactErr
    }

    // Link contact to case
    const contactRole = role || 'paralegal'
    await supabase
      .from('case_contacts')
      .insert({
        case_id: invite.case_id,
        contact_id: newContact.id,
        role: contactRole,
        is_primary: false,
      })

    // Optionally create portal invite for the new contact
    const crypto = await import('crypto')
    const newToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: newInvite } = await supabase
      .from('portal_invites')
      .insert({
        case_id: invite.case_id,
        contact_id: newContact.id,
        token: newToken,
        is_active: true,
        expires_at: expiresAt,
        onboarding_mode: true,
        onboarding_steps: {
          review_fee_schedule: 'pending',
          review_cv: 'pending',
          upload_documents: 'pending',
        },
        can_view_summary: true,
        can_view_timeline: true,
        can_message: true,
        can_upload_documents: true,
        can_view_fee_schedule: true,
      })
      .select('id')
      .single()

    // Send portal invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${newToken}`

    await fetch(`${appUrl}/api/portal/invite-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: newContact.email,
        recipientName: `${newContact.first_name} ${newContact.last_name}`.trim(),
        portalUrl,
        caseName: null,
        isInquiry: false,
      }),
    })

    return NextResponse.json({
      contact: newContact,
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
