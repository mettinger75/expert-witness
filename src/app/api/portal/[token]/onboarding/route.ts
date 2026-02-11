import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: Return current onboarding steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('id, onboarding_mode, onboarding_steps')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Portal invite not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      onboardingMode: invite.onboarding_mode,
      onboardingSteps: invite.onboarding_steps,
    })
  } catch (error) {
    console.error('Onboarding fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update a specific onboarding step
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const step = body.step as string
    const stepStatus = body.status as string

    if (!step || !stepStatus) {
      return NextResponse.json(
        { error: 'Missing step or status' },
        { status: 400 }
      )
    }

    const validSteps = ['review_fee_schedule', 'review_cv', 'enter_case_details', 'sign_contract', 'retainer_payment', 'upload_documents']
    const validStatuses = ['pending', 'completed', 'locked', 'not_applicable']

    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Must be one of: ${validSteps.join(', ')}` },
        { status: 400 }
      )
    }

    if (!validStatuses.includes(stepStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('id, onboarding_mode, onboarding_steps')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Portal invite not found' },
        { status: 404 }
      )
    }

    if (!invite.onboarding_mode) {
      return NextResponse.json(
        { error: 'This portal is not in onboarding mode' },
        { status: 400 }
      )
    }

    const steps: Record<string, string> =
      typeof invite.onboarding_steps === 'object' && invite.onboarding_steps !== null
        ? { ...(invite.onboarding_steps as Record<string, string>) }
        : {
            review_fee_schedule: 'pending',
            review_cv: 'locked',
            enter_case_details: 'locked',
            sign_contract: 'locked',
            retainer_payment: 'locked',
            upload_documents: 'locked',
          }

    // Update the step
    steps[step] = stepStatus

    // Auto-unlock next step when a step is completed (6-step chain)
    if (stepStatus === 'completed') {
      if (step === 'review_fee_schedule' && steps.review_cv === 'locked') {
        steps.review_cv = 'pending'
      }
      if (step === 'review_cv' && steps.enter_case_details === 'locked') {
        steps.enter_case_details = 'pending'
      }
      if (step === 'enter_case_details' && steps.sign_contract === 'locked') {
        steps.sign_contract = 'pending'
      }
      if (step === 'sign_contract' && steps.retainer_payment === 'locked') {
        steps.retainer_payment = 'pending'
      }
      if (step === 'retainer_payment' && steps.upload_documents === 'locked') {
        steps.upload_documents = 'pending'
      }
      // If a step is completed and the next step is not_applicable, skip to the one after
      if (step === 'enter_case_details' && steps.sign_contract === 'not_applicable') {
        if (steps.retainer_payment === 'locked') steps.retainer_payment = 'pending'
        if (steps.retainer_payment === 'not_applicable' && steps.upload_documents === 'locked') {
          steps.upload_documents = 'pending'
        }
      }
      if (step === 'sign_contract' && steps.retainer_payment === 'not_applicable') {
        if (steps.upload_documents === 'locked') steps.upload_documents = 'pending'
      }
    }

    const { error: updateError } = await supabase
      .from('portal_invites')
      .update({
        onboarding_steps: steps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      onboardingSteps: steps,
    })
  } catch (error) {
    console.error('Onboarding update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
