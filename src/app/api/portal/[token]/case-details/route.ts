import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// POST: Attorney enters case details during onboarding
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // Validate portal invite
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('id, case_id, onboarding_mode, onboarding_steps')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Portal invite not found' }, { status: 404 })
    }

    if (!invite.onboarding_mode) {
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
    if (body.key_issues) caseUpdate.key_issues = body.key_issues
    if (body.specialty_area) caseUpdate.specialty_area = body.specialty_area

    if (Object.keys(caseUpdate).length > 0) {
      caseUpdate.updated_at = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('cases')
        .update(caseUpdate)
        .eq('id', invite.case_id)

      if (updateError) {
        console.error('Case update error:', updateError)
        return NextResponse.json({ error: 'Failed to update case details' }, { status: 500 })
      }
    }

    // Mark the enter_case_details step as completed
    const steps: Record<string, string> =
      typeof invite.onboarding_steps === 'object' && invite.onboarding_steps !== null
        ? { ...(invite.onboarding_steps as Record<string, string>) }
        : {}

    steps.enter_case_details = 'completed'

    // Auto-unlock next step (sign_contract, or skip if not_applicable)
    if (steps.sign_contract === 'locked') {
      steps.sign_contract = 'pending'
    } else if (steps.sign_contract === 'not_applicable') {
      // Skip contract step — unlock retainer_payment or upload_documents
      if (steps.retainer_payment === 'locked') {
        steps.retainer_payment = 'pending'
      } else if (steps.retainer_payment === 'not_applicable' && steps.upload_documents === 'locked') {
        steps.upload_documents = 'pending'
      }
    }

    const { error: stepError } = await supabase
      .from('portal_invites')
      .update({
        onboarding_steps: steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (stepError) {
      console.error('Step update error:', stepError)
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
