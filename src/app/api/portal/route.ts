import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

// POST: Create a portal invite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      caseId,
      contactId,
      expiresInDays = 90,
      canViewSummary = true,
      canViewTimeline = false,
      canMessage = true,
      canViewReports = true,
      canEditReports = false,
      canUploadDocuments = true,
      canViewFeeSchedule = true,
      canViewDepositions = true,
      canViewBilling = true,
      canBookScheduling = true,
      canSignContract = false,
      contractId = null,
      onboardingMode = false,
      invitationMessage,
    } = body

    if (!caseId || !contactId) {
      return NextResponse.json({ error: 'Missing caseId or contactId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const token = crypto.randomBytes(32).toString('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Build onboarding steps if onboarding mode is enabled
    // Check case state to auto-skip completed steps
    let caseDetailsAlreadyFilled = false
    let contractAlreadySigned = false
    if (onboardingMode) {
      const { data: caseData } = await supabase
        .from('cases')
        .select('case_name, case_type, side, patient_name')
        .eq('id', caseId)
        .single()
      if (caseData?.case_name && caseData?.case_type && caseData?.side && caseData?.patient_name) {
        caseDetailsAlreadyFilled = true
      }

      // Check if a retention agreement is already signed for this case
      if (contractId) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('status, signed_at')
          .eq('id', contractId)
          .single()
        if (contractData?.status === 'signed' && contractData?.signed_at) {
          contractAlreadySigned = true
        }
      } else {
        // Check if ANY contract for this case is signed
        const { data: existingContracts } = await supabase
          .from('contracts')
          .select('id, status')
          .eq('case_id', caseId)
          .eq('status', 'signed')
          .limit(1)
        if (existingContracts && existingContracts.length > 0) {
          contractAlreadySigned = true
        }
      }
    }

    const onboardingSteps = onboardingMode
      ? {
          review_fee_schedule: 'pending',
          review_cv: 'locked',
          enter_case_details: caseDetailsAlreadyFilled ? 'completed' : 'locked',
          sign_contract: contractAlreadySigned ? 'completed' : (canSignContract && contractId ? 'locked' : 'not_applicable'),
          retainer_payment: contractAlreadySigned ? 'completed' : (canSignContract && contractId ? 'locked' : 'not_applicable'),
          upload_documents: canUploadDocuments ? 'locked' : 'not_applicable',
        }
      : null

    const { data: invite, error } = await supabase
      .from('portal_invites')
      .insert({
        case_id: caseId,
        contact_id: contactId,
        token,
        can_view_summary: canViewSummary,
        can_view_timeline: canViewTimeline,
        can_message: canMessage,
        can_view_reports: canViewReports,
        can_edit_reports: canEditReports,
        can_upload_documents: canUploadDocuments,
        can_view_fee_schedule: canViewFeeSchedule,
        can_view_depositions: canViewDepositions,
        can_view_billing: canViewBilling,
        can_book_scheduling: canBookScheduling,
        can_sign_contract: canSignContract,
        contract_id: contractId || null,
        onboarding_mode: onboardingMode,
        onboarding_steps: onboardingSteps,
        expires_at: expiresAt.toISOString(),
        invitation_message: invitationMessage || null,
      })
      .select()
      .single()

    if (error) throw error

    // If edit access granted, auto-link any editable reports on this case
    if (canEditReports && invite) {
      const { data: reviewReports } = await supabase
        .from('reports')
        .select('id, collaboration_html, rendered_html, status')
        .eq('case_id', caseId)
        .in('status', ['draft', 'in_progress', 'review', 'attorney_review', 'revision'])
        .is('active_collaboration_invite_id', null)

      if (reviewReports && reviewReports.length > 0) {
        for (const rpt of reviewReports) {
          const collabHtml = rpt.collaboration_html || rpt.rendered_html || ''
          await supabase
            .from('reports')
            .update({
              active_collaboration_invite_id: invite.id,
              ...(collabHtml && !rpt.collaboration_html ? { collaboration_html: collabHtml } : {}),
            })
            .eq('id', rpt.id)
        }
      }
    }

    // If a contract is attached, update the contract record
    if (contractId && canSignContract) {
      await supabase
        .from('contracts')
        .update({
          portal_invite_id: invite.id,
          sent_via_portal: true,
          sent_at: new Date().toISOString(),
          status: 'sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${token}`

    return NextResponse.json({ invite, portalUrl })
  } catch (error) {
    console.error('Portal invite creation error:', error)
    return NextResponse.json({ error: 'Failed to create portal invite' }, { status: 500 })
  }
}

// GET: List portal invites for a case (optionally filtered by contactId)
export async function GET(request: NextRequest) {
  try {
    const caseId = request.nextUrl.searchParams.get('caseId')
    const contactId = request.nextUrl.searchParams.get('contactId')
    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('portal_invites')
      .select('*, contacts(*)')
      .eq('case_id', caseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: invites, error } = await query

    if (error) throw error

    return NextResponse.json({ invites: invites || [] })
  } catch (error) {
    console.error('Portal invites fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}
