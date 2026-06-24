import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { signContract } from '@/lib/contract-signing'

// GET: Fetch contract for portal signing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate the portal invite
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Portal link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This portal link has expired' },
        { status: 410 }
      )
    }

    // Check permission
    if (!invite.can_sign_contract || !invite.contract_id) {
      return NextResponse.json(
        { error: 'This portal does not have contract signing permission' },
        { status: 403 }
      )
    }

    // Fetch the contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, title, contract_type, status, rendered_html, signed_at, signed_by, firm_name, retainer_amount, hourly_rate, deposition_rate, trial_rate')
      .eq('id', invite.contract_id)
      .eq('case_id', invite.case_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        contractType: contract.contract_type,
        status: contract.status,
        renderedHtml: contract.rendered_html,
        signedAt: contract.signed_at,
        signedBy: contract.signed_by,
        firmName: contract.firm_name,
        retainerAmount: contract.retainer_amount,
        hourlyRate: contract.hourly_rate,
        depositionRate: contract.deposition_rate,
        trialRate: contract.trial_rate,
      },
    })
  } catch (error) {
    console.error('Portal contract fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Sign the contract through the portal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { signatureData, signerName, agreed } = await request.json()

    if (!signatureData || !signerName || !agreed) {
      return NextResponse.json(
        { error: 'Missing required fields: signatureData, signerName, agreed' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Validate the portal invite
    const { data: invite, error } = await supabase
      .from('portal_invites')
      .select('*, contacts(first_name, last_name, email)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      return NextResponse.json(
        { error: 'Portal link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This portal link has expired' },
        { status: 410 }
      )
    }

    // Check permission
    if (!invite.can_sign_contract || !invite.contract_id) {
      return NextResponse.json(
        { error: 'This portal does not have contract signing permission' },
        { status: 403 }
      )
    }

    // Check if already signed
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, status, signed_at')
      .eq('id', invite.contract_id)
      .eq('case_id', invite.case_id)
      .single()

    if (contract?.status === 'signed') {
      return NextResponse.json(
        { error: 'This contract has already been signed' },
        { status: 409 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = request.headers.get('user-agent') || null

    // Sign the contract using shared utility
    const { signedAt } = await signContract(supabase, {
      contractId: invite.contract_id,
      signatureData,
      signerName,
      ip,
      userAgent,
    })

    // Update onboarding steps if in onboarding mode
    if (invite.onboarding_mode && invite.onboarding_steps) {
      const steps =
        typeof invite.onboarding_steps === 'object'
          ? { ...(invite.onboarding_steps as Record<string, string>) }
          : {}
      steps.sign_contract = 'completed'
      // Unlock retainer_payment step
      if (steps.retainer_payment === 'locked') {
        steps.retainer_payment = 'pending'
      }

      await supabase
        .from('portal_invites')
        .update({
          onboarding_steps: steps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
    }

    // Send notification email to Dr. Ettinger
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        // Fetch case name for email
        const { data: caseData } = await supabase
          .from('cases')
          .select('case_name, case_number')
          .eq('id', invite.case_id)
          .single()

        const contact = invite.contacts as { first_name: string; last_name: string; email: string } | null
        const contactName = contact
          ? `${contact.first_name} ${contact.last_name}`
          : signerName

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
            to: 'markettingermd@gmail.com',
            subject: `Contract Signed: ${caseData?.case_name || 'Unknown Case'}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
                  <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">Contract Signed</h1>
                </div>
                <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                    <strong>${contactName}</strong> has signed the retention agreement for
                    <strong>${caseData?.case_name || 'a case'}</strong> (${caseData?.case_number || ''}).
                  </p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Signed by:</td>
                      <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${signerName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Timestamp:</td>
                      <td style="padding: 8px 0; font-size: 14px;">${new Date(signedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address:</td>
                      <td style="padding: 8px 0; font-size: 14px;">${ip || 'Unknown'}</td>
                    </tr>
                  </table>
                  <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                    View the signed contract in the
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'}/cases/${invite.case_id}/contracts" style="color: #DFC06A;">case dashboard</a>.
                  </p>
                </div>
              </div>
            `,
          }),
        })
      }
    } catch (emailError) {
      // Don't fail the signing if notification email fails
      console.error('Failed to send signing notification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      signedAt,
    })
  } catch (error) {
    console.error('Portal contract signing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
