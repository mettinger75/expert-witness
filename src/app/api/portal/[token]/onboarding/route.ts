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

    const validSteps = ['review_fee_schedule', 'review_cv', 'enter_case_details', 'schedule_call', 'sign_contract', 'retainer_payment', 'upload_documents']
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
    // Cascades through any not_applicable, already-completed, or missing steps
    // to find the next locked one and promote it to pending.
    if (stepStatus === 'completed') {
      const stepOrder: (keyof typeof steps)[] = [
        'review_fee_schedule',
        'review_cv',
        'enter_case_details',
        'schedule_call',
        'sign_contract',
        'retainer_payment',
        'upload_documents',
      ]

      const completedIndex = stepOrder.indexOf(step)
      if (completedIndex >= 0) {
        // Walk forward from the completed step, unlocking the next actionable one
        for (let i = completedIndex + 1; i < stepOrder.length; i++) {
          const nextStep = stepOrder[i]
          const nextStatus = steps[nextStep]
          if (nextStatus === 'locked') {
            steps[nextStep] = 'pending'
            break // only unlock one step
          }
          if (
            nextStatus === 'not_applicable' ||
            nextStatus === 'completed' ||
            nextStatus === undefined
          ) {
            continue // skip past NA, already-done, or absent steps
          }
          break // stop at a pending step (another active path)
        }
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
