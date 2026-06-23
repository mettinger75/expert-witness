import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

// POST: Attach a contract to an existing portal invite
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { portalInviteId, contractId } = body

    if (!portalInviteId || !contractId) {
      return NextResponse.json(
        { error: 'Missing portalInviteId or contractId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Verify portal invite exists and is active
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('id, case_id, is_active, onboarding_mode, onboarding_steps')
      .eq('id', portalInviteId)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Portal invite not found' },
        { status: 404 }
      )
    }

    if (!invite.is_active) {
      return NextResponse.json(
        { error: 'Portal invite is no longer active' },
        { status: 400 }
      )
    }

    // Verify contract exists and belongs to the same case as the invite
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, case_id, status')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    if (invite.case_id !== contract.case_id) {
      return NextResponse.json(
        { error: 'Contract does not belong to this case' },
        { status: 400 }
      )
    }

    // Update the portal invite to include contract signing
    const updateData: Record<string, unknown> = {
      can_sign_contract: true,
      contract_id: contractId,
      updated_at: now,
    }

    // Update onboarding steps if in onboarding mode
    if (invite.onboarding_mode && invite.onboarding_steps) {
      const steps =
        typeof invite.onboarding_steps === 'object'
          ? { ...(invite.onboarding_steps as Record<string, string>) }
          : {}
      steps.sign_contract = 'pending'
      updateData.onboarding_steps = steps
    }

    const { error: updateInviteError } = await supabase
      .from('portal_invites')
      .update(updateData)
      .eq('id', portalInviteId)

    if (updateInviteError) {
      throw updateInviteError
    }

    // Update the contract record
    const { error: updateContractError } = await supabase
      .from('contracts')
      .update({
        portal_invite_id: portalInviteId,
        sent_via_portal: true,
        sent_at: now,
        status: 'sent',
        updated_at: now,
      })
      .eq('id', contractId)

    if (updateContractError) {
      throw updateContractError
    }

    return NextResponse.json({
      success: true,
      message: 'Contract attached to portal invite',
    })
  } catch (error) {
    console.error('Attach contract error:', error)
    return NextResponse.json(
      { error: 'Failed to attach contract to portal invite' },
      { status: 500 }
    )
  }
}
