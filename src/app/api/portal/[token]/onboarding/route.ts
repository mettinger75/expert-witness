import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'

const STEP_ORDER = [
  'review_fee_schedule',
  'review_cv',
  'enter_case_details',
  'invite_colleague',
  'schedule_call',
  'sign_contract',
  'retainer_payment',
  'upload_documents',
]

// These two steps can only be satisfied when a signable contract is attached to
// the invite. The stepper is a strict chain, so leaving them actionable without
// one deadlocks every step behind them — the recipient sees "Review & Sign
// Agreement" erroring out and "Upload Medical Records" greyed out with no way
// through. Normalize them to not_applicable so the chain cascades past, and put
// them back in the chain if a contract is attached later.
const CONTRACT_DEPENDENT_STEPS = ['sign_contract', 'retainer_payment']

const INVITE_SELECT = 'id, onboarding_mode, onboarding_steps, can_sign_contract, contract_id'

type InviteRow = {
  id: string
  onboarding_mode?: boolean
  onboarding_steps?: Record<string, string> | null
  can_sign_contract?: boolean
  contract_id?: string | null
}

function defaultSteps(): Record<string, string> {
  return {
    review_fee_schedule: 'pending',
    review_cv: 'locked',
    enter_case_details: 'locked',
    sign_contract: 'locked',
    retainer_payment: 'locked',
    upload_documents: 'locked',
  }
}

function readSteps(inv: InviteRow): Record<string, string> {
  return typeof inv.onboarding_steps === 'object' && inv.onboarding_steps !== null
    ? { ...(inv.onboarding_steps as Record<string, string>) }
    : defaultSteps()
}

// Reconcile the agreement steps against whether a contract is actually attached.
// Never touches a step that is already completed — a signed agreement stays signed.
//
// Restoring is deliberately narrower than clearing: without a contract both steps
// are unsatisfiable, but once one is attached only the signature step is implied.
// Whether a retainer payment applies depends on the agreement's own terms (a $0
// bill-as-incurred engagement has none), so that step is left as the attach flow
// set it rather than being resurrected here.
function reconcileContractSteps(
  steps: Record<string, string>,
  hasSignableContract: boolean
): boolean {
  let changed = false
  for (const key of CONTRACT_DEPENDENT_STEPS) {
    const status = steps[key]
    if (status === undefined || status === 'completed') continue
    if (!hasSignableContract && status !== 'not_applicable') {
      steps[key] = 'not_applicable'
      changed = true
    } else if (hasSignableContract && status === 'not_applicable' && key === 'sign_contract') {
      steps[key] = 'locked'
      changed = true
    }
  }
  return changed
}

// The chain only advances when a step completes, so an invite whose sole pending
// step just became not_applicable would stall with nothing actionable. Promote
// the first remaining locked step so the recipient always has a way forward.
function ensureActionableStep(steps: Record<string, string>): boolean {
  if (STEP_ORDER.some((key) => steps[key] === 'pending')) return false
  for (const key of STEP_ORDER) {
    if (steps[key] === 'locked') {
      steps[key] = 'pending'
      return true
    }
  }
  return false
}

// Walk forward from a completed step, unlocking the next actionable one.
// Cascades through not_applicable, already-completed, or missing steps.
function unlockNextStep(steps: Record<string, string>, completedStep: string): void {
  const completedIndex = STEP_ORDER.indexOf(completedStep)
  if (completedIndex < 0) return

  for (let i = completedIndex + 1; i < STEP_ORDER.length; i++) {
    const nextStep = STEP_ORDER[i]
    const nextStatus = steps[nextStep]
    if (nextStatus === 'locked') {
      steps[nextStep] = 'pending'
      return // only unlock one step
    }
    if (
      nextStatus === 'not_applicable' ||
      nextStatus === 'completed' ||
      nextStatus === undefined
    ) {
      continue // skip past NA, already-done, or absent steps
    }
    return // stop at a pending step (another active path)
  }
}

async function persistSteps(
  supabase: Awaited<ReturnType<typeof validatePortalInvite>>['supabase'],
  inviteId: string,
  steps: Record<string, string>
) {
  return supabase!
    .from('portal_invites')
    .update({
      onboarding_steps: steps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
}

// GET: Return current onboarding steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const v = await validatePortalInvite(token, { select: INVITE_SELECT })
    if (v.error) return v.error
    const { supabase } = v
    const inv = v.invite as InviteRow

    const steps = readSteps(inv)

    // Self-heal a portal that is sitting on an unsatisfiable agreement step, so
    // an already-stuck recipient is unblocked on their next visit.
    if (inv.onboarding_mode) {
      const hasSignableContract = !!inv.can_sign_contract && !!inv.contract_id
      const reconciled = reconcileContractSteps(steps, hasSignableContract)
      const advanced = reconciled ? ensureActionableStep(steps) : false
      if (reconciled || advanced) {
        const { error: healError } = await persistSteps(supabase, inv.id, steps)
        if (healError) console.error('Onboarding self-heal failed:', healError)
      }
    }

    return NextResponse.json({
      onboardingMode: inv.onboarding_mode,
      onboardingSteps: steps,
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

    const validStatuses = ['pending', 'completed', 'locked', 'not_applicable']

    if (!STEP_ORDER.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Must be one of: ${STEP_ORDER.join(', ')}` },
        { status: 400 }
      )
    }

    if (!validStatuses.includes(stepStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const v = await validatePortalInvite(token, { select: INVITE_SELECT })
    if (v.error) return v.error
    const { supabase } = v
    const inv = v.invite as InviteRow

    if (!inv.onboarding_mode) {
      return NextResponse.json(
        { error: 'This portal is not in onboarding mode' },
        { status: 400 }
      )
    }

    const steps = readSteps(inv)

    // Update the step
    steps[step] = stepStatus

    if (stepStatus === 'completed') {
      unlockNextStep(steps, step)
    }

    // Keep the agreement steps consistent with the attached contract, then make
    // sure something is still actionable if that reconciliation cleared the only
    // pending step.
    const hasSignableContract = !!inv.can_sign_contract && !!inv.contract_id
    reconcileContractSteps(steps, hasSignableContract)
    ensureActionableStep(steps)

    const { error: updateError } = await persistSteps(supabase, inv.id, steps)

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
