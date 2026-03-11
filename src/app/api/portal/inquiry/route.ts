import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
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

    // 6. Send inquiry email directly via Resend (not via internal fetch)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${token}`

    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Dr. Mark Ettinger <onboarding@resend.dev>'
      const recipientName = `${firstName} ${lastName}`
      const greeting = `Dear ${recipientName},`
      const logoUrl = `${appUrl}/logo-expert-witness.svg?v=2`

      const features = [
        'Review fee schedule and rates',
        'Review qualifications and curriculum vitae',
        'Provide case details for initial evaluation',
        'Schedule a consultation call',
      ]

      const featureListHtml = features
        .map(
          (feature) =>
            `<tr>
              <td style="padding: 6px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
                <span style="color: #C9A84C; font-size: 16px; margin-right: 8px;">&#10003;</span>
                ${feature}
              </td>
            </tr>`
        )
        .join('')

      const personalMessageHtml = invitationMessage ? `
        <div style="background-color: #fafaf9; border-left: 3px solid #C9A84C; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <p style="color: #44403c; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
            "${invitationMessage}"
          </p>
          <p style="color: #78716c; font-size: 12px; margin: 8px 0 0 0;">
            &mdash; Mark Ettinger, M.D.
          </p>
        </div>` : ''

      const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color: #0E1F35; padding: 28px 32px; text-align: center;">
          <img src="${logoUrl}" alt="Mark Ettinger, M.D. - Expert Witness" width="380" height="95" style="display: block; margin: 0 auto; max-width: 380px; height: auto;" />
        </td></tr>
        <tr><td style="background-color: #C9A84C; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr><td style="padding: 32px;">
          <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">${greeting}</p>
          <p style="color: #1e293b; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Mark Ettinger, M.D. would like to invite you to review his qualifications and fee schedule for a potential expert witness engagement in anesthesiology.
          </p>
          ${personalMessageHtml}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <tr><td style="background-color: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #0E1F35; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Getting Started</strong>
            </td></tr>
            <tr><td style="padding: 12px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">${featureListHtml}</table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
            <tr><td align="center">
              <a href="${portalUrl}" style="display: inline-block; background-color: #C9A84C; color: #0E1F35; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Review &amp; Get Started</a>
            </td></tr>
          </table>
          <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">This link is private and unique to you. Do not share it.</p>
        </td></tr>
        <tr><td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center; line-height: 1.6;">
            This email was sent from the Expert Witness Practice Manager.<br>If you did not expect this email, please disregard it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      const { error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: 'Expert Witness Consultation \u2014 Dr. Mark Ettinger',
        html: htmlBody,
      })

      if (emailError) {
        console.error('Resend error:', emailError)
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
