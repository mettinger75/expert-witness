import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'

// GET: Fetch case details for summary display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const v = await validatePortalInvite(token)
    if (v.error) return v.error
    const { invite, supabase } = v

    const { data: caseData } = await supabase
      .from('cases')
      .select('case_name, case_type, side, patient_name, jurisdiction_state, brief_summary, date_of_incident')
      .eq('id', invite.case_id)
      .single()

    return NextResponse.json(caseData || {})
  } catch (error) {
    console.error('Get case details error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Attorney enters case details during onboarding
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate portal invite (active + unexpired)
    const v = await validatePortalInvite(token, {
      select: 'id, case_id, onboarding_mode, onboarding_steps, contacts(first_name, last_name)',
    })
    if (v.error) return v.error
    const { invite, supabase } = v
    const inv = invite as {
      id: string
      case_id: string
      onboarding_mode?: boolean
      onboarding_steps?: Record<string, string> | null
      contacts?: { first_name: string; last_name: string } | null
    }

    if (!inv.onboarding_mode) {
      return NextResponse.json({ error: 'This portal is not in onboarding mode' }, { status: 400 })
    }

    // Build update object from provided fields
    const caseUpdate: Record<string, unknown> = {}
    if (body.case_name) caseUpdate.case_name = body.case_name
    if (body.case_type) caseUpdate.case_type = body.case_type
    if (body.side) caseUpdate.side = body.side
    if (body.date_of_incident) caseUpdate.date_of_incident = body.date_of_incident
    if (body.jurisdiction_state) caseUpdate.jurisdiction_state = body.jurisdiction_state
    if (body.patient_name) caseUpdate.patient_name = body.patient_name
    if (body.patient_dob) caseUpdate.patient_dob = body.patient_dob
    if (body.brief_summary) caseUpdate.brief_summary = body.brief_summary
    // key_issues is a TEXT[] array column — convert string input to array
    if (body.key_issues) {
      if (Array.isArray(body.key_issues)) {
        caseUpdate.key_issues = body.key_issues
      } else {
        // Split by newlines or semicolons, trim whitespace, filter empties
        caseUpdate.key_issues = (body.key_issues as string)
          .split(/[\n;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      }
    }
    if (body.specialty_area) caseUpdate.specialty_area = body.specialty_area

    if (Object.keys(caseUpdate).length > 0) {
      caseUpdate.updated_at = new Date().toISOString()

      // Auto-update case status: inquiry/conflict_check → accepted when attorney provides case details
      const { data: currentCase } = await supabase
        .from('cases')
        .select('status')
        .eq('id', inv.case_id)
        .single()
      if (currentCase && ['inquiry', 'conflict_check'].includes(currentCase.status)) {
        caseUpdate.status = 'accepted'
      }

      const { error: updateError } = await supabase
        .from('cases')
        .update(caseUpdate)
        .eq('id', inv.case_id)

      if (updateError) {
        console.error('Case update error:', updateError, 'Update payload:', caseUpdate)
        return NextResponse.json({ error: `Failed to update case details: ${updateError.message}` }, { status: 500 })
      }
    }

    // Mark the enter_case_details step as completed
    const steps: Record<string, string> =
      typeof inv.onboarding_steps === 'object' && inv.onboarding_steps !== null
        ? { ...(inv.onboarding_steps as Record<string, string>) }
        : {}

    steps.enter_case_details = 'completed'

    // Auto-unlock next step after enter_case_details
    // Walk forward through the step order, skipping not_applicable, unlocking the first locked step
    const nextStepOrder = ['schedule_call', 'sign_contract', 'retainer_payment', 'upload_documents']
    for (const nextStep of nextStepOrder) {
      if (steps[nextStep] === 'locked') {
        steps[nextStep] = 'pending'
        break
      }
      if (steps[nextStep] === 'not_applicable') {
        continue
      }
      break // stop at pending or completed
    }

    const { error: stepError } = await supabase
      .from('portal_invites')
      .update({
        onboarding_steps: steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inv.id)

    if (stepError) {
      console.error('Step update error:', stepError)
    }

    // Send notification email to Dr. Ettinger
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const { data: caseData } = await supabase
          .from('cases')
          .select('case_name, case_number')
          .eq('id', inv.case_id)
          .single()

        const contact = inv.contacts
        const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

        const fieldsEntered = Object.keys(caseUpdate).filter(k => k !== 'updated_at')
        const fieldsList = fieldsEntered.map(f => `<li style="padding: 2px 0;">${f.replace(/_/g, ' ')}</li>`).join('')

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
            to: 'markettingermd@gmail.com',
            subject: `Case Details Submitted: ${caseData?.case_name || 'Unknown Case'}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
                  <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">Case Details Submitted</h1>
                </div>
                <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                    <strong>${contactName}</strong> has submitted case details for
                    <strong>${caseData?.case_name || 'a case'}</strong> (${caseData?.case_number || ''}).
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Fields provided:</p>
                  <ul style="color: #374151; font-size: 14px; line-height: 1.8; text-transform: capitalize;">${fieldsList}</ul>
                  ${body.brief_summary ? `<p style="color: #6b7280; font-size: 13px; margin-top: 16px; border-left: 3px solid #DFC06A; padding-left: 12px;"><strong>Summary:</strong> ${body.brief_summary.substring(0, 300)}${body.brief_summary.length > 300 ? '...' : ''}</p>` : ''}
                  <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                    View the case in the
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'}/cases/${inv.case_id}" style="color: #DFC06A;">case dashboard</a>.
                  </p>
                </div>
              </div>
            `,
          }),
        })
      }
    } catch (emailError) {
      console.error('Failed to send case details notification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      onboardingSteps: steps,
    })
  } catch (error) {
    console.error('Case details error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
