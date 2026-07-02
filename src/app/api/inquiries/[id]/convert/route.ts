import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import crypto from 'crypto'

/**
 * POST /api/inquiries/[id]/convert
 *
 * Promotes a case with status='inquiry' to an active engagement.
 * `[id]` is now a CASE id (post-collapse — consultation_requests no longer
 * exists as a separate row).
 *
 * Behavior:
 *  - Reject if case is missing or not in status='inquiry'.
 *  - Flip status to 'accepted' (or whatever `targetStatus` body field
 *    requests, restricted to a small allowlist).
 *  - Optional `{ createPortal: true }` — if the case has no portal_invites
 *    row yet, create one with onboarding defaults so the attorney has
 *    immediate access.
 */

const ALLOWED_TARGET_STATUSES = new Set(['accepted', 'conflict_check', 'active'])

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const { id: caseId } = await context.params
    if (!caseId) return NextResponse.json({ error: 'Missing case id' }, { status: 400 })

    let createPortal = false
    let targetStatus = 'accepted'
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        if (body.createPortal === true) createPortal = true
        if (typeof body.targetStatus === 'string' && ALLOWED_TARGET_STATUSES.has(body.targetStatus)) {
          targetStatus = body.targetStatus
        }
      }
    } catch {
      // No body — fine, use defaults
    }

    const supabase = getSupabaseAdmin()

    // 1. Load case + verify state
    const { data: caseRow, error: loadErr } = await supabase
      .from('cases')
      .select('id, case_number, status')
      .eq('id', caseId)
      .single()

    if (loadErr || !caseRow) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (caseRow.status !== 'inquiry') {
      return NextResponse.json(
        { error: `Case is not in inquiry status (current: ${caseRow.status})` },
        { status: 400 }
      )
    }

    // 2. Flip status
    const { error: updateErr } = await supabase
      .from('cases')
      .update({ status: targetStatus })
      .eq('id', caseId)

    if (updateErr) {
      console.error('Case status update error:', updateErr)
      return NextResponse.json({ error: 'Failed to update case status' }, { status: 500 })
    }

    // 3. Optional portal_invite creation
    let portalToken: string | null = null
    if (createPortal) {
      const { data: existingInvite } = await supabase
        .from('portal_invites')
        .select('id, token, is_active')
        .eq('case_id', caseId)
        .eq('is_active', true)
        .maybeSingle()

      if (existingInvite) {
        portalToken = (existingInvite as { token: string }).token
      } else {
        // Find primary contact
        const { data: primaryContact } = await supabase
          .from('case_contacts')
          .select('contact_id')
          .eq('case_id', caseId)
          .eq('is_primary', true)
          .limit(1)
          .maybeSingle()

        if (primaryContact?.contact_id) {
          const token = crypto.randomBytes(32).toString('hex')
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 90)

          const { error: inviteErr } = await supabase.from('portal_invites').insert({
            case_id: caseId,
            contact_id: primaryContact.contact_id,
            token,
            onboarding_mode: false,
            can_view_summary: true,
            can_view_timeline: true,
            can_message: true,
            can_view_reports: true,
            can_edit_reports: false,
            can_upload_documents: true,
            can_view_fee_schedule: true,
            can_view_depositions: true,
            can_view_billing: true,
            can_book_scheduling: true,
            can_sign_contract: false,
            expires_at: expiresAt.toISOString(),
          })

          if (!inviteErr) portalToken = token
        }
      }
    }

    return NextResponse.json({
      success: true,
      caseId: caseRow.id,
      caseNumber: caseRow.case_number,
      status: targetStatus,
      portalToken,
    })
  } catch (err) {
    console.error('Inquiry convert error:', err)
    return NextResponse.json({ error: 'Convert failed' }, { status: 500 })
  }
}
