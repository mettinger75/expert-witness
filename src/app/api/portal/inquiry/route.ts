import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

// POST: Create an inquiry portal — contact, case, link, invite, and email in one shot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, organizationName, invitationMessage } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Check for existing contact with same email to avoid duplicates
    let contactId: string
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (existingContact) {
      contactId = existingContact.id
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          contact_type: 'attorney',
          first_name: firstName,
          last_name: lastName,
          email,
          organization_name: organizationName || null,
        })
        .select('id')
        .single()

      if (contactError || !newContact) {
        console.error('Contact creation error:', contactError)
        return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
      }
      contactId = newContact.id
    }

    // 2. Generate case number (EW-YYYY-NNNN)
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
    const caseNumber = `EW-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

    // 3. Create minimal inquiry case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        case_name: `Inquiry — ${firstName} ${lastName}`,
        case_type: 'other',
        side: 'plaintiff',
        status: 'inquiry',
        priority: 'normal',
        date_of_referral: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (caseError || !newCase) {
      console.error('Case creation error:', caseError)
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
    }

    // 4. Link contact to case
    const { error: linkError } = await supabase
      .from('case_contacts')
      .insert({
        case_id: newCase.id,
        contact_id: contactId,
        role: 'retaining_attorney',
        is_primary: true,
      })

    if (linkError) {
      console.error('Case-contact link error:', linkError)
    }

    // 5. Create portal invite with inquiry onboarding steps
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const onboardingSteps = {
      review_fee_schedule: 'pending',
      review_cv: 'locked',
      enter_case_details: 'locked',
      schedule_call: 'locked',
      sign_contract: 'not_applicable',
      retainer_payment: 'not_applicable',
      upload_documents: 'not_applicable',
    }

    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .insert({
        case_id: newCase.id,
        contact_id: contactId,
        token,
        onboarding_mode: true,
        onboarding_steps: onboardingSteps,
        can_view_summary: false,
        can_view_timeline: false,
        can_message: true,
        can_view_reports: false,
        can_edit_reports: false,
        can_upload_documents: false,
        can_view_fee_schedule: true,
        can_view_depositions: false,
        can_view_billing: false,
        can_book_scheduling: true,
        can_sign_contract: false,
        invitation_message: invitationMessage || null,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (inviteError || !invite) {
      console.error('Portal invite creation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create portal invite' }, { status: 500 })
    }

    // 6. Send inquiry email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${token}`

    try {
      const emailRes = await fetch(`${appUrl}/api/portal/invite-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalUrl,
          recipientEmail: email,
          recipientName: `${firstName} ${lastName}`,
          caseName: `Inquiry — ${firstName} ${lastName}`,
          invitationMessage: invitationMessage || null,
          isInquiry: true,
        }),
      })

      if (!emailRes.ok) {
        console.error('Failed to send inquiry email:', await emailRes.text())
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
      // Don't fail the whole request if email fails — portal URL still works
    }

    return NextResponse.json({
      caseId: newCase.id,
      contactId,
      portalUrl,
      caseNumber,
      inviteId: invite.id,
    })
  } catch (error) {
    console.error('Inquiry portal creation error:', error)
    return NextResponse.json({ error: 'Failed to create inquiry portal' }, { status: 500 })
  }
}
