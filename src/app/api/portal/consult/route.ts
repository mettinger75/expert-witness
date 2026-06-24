import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { EMAIL_COLORS } from '@/lib/email-config'
import { findOrCreateAttorneyContact, createInquiryCase } from '@/lib/inquiry-helpers'
import { caseEmailHeaders, caseEmailSubject } from '@/lib/email-threading'

/**
 * POST /api/portal/consult
 * Public endpoint — accepts a consultation request from an attorney.
 *
 * Behavior (post-collapse):
 *   1. Find or create attorney contact.
 *   2. Insert a `cases` row with status='inquiry' and link the contact as
 *      retaining_attorney.
 *   3. Send Mark a notification email tagged with the case's thread root
 *      Message-ID so every subsequent message about this case threads under
 *      the same Gmail conversation.
 *
 * Does NOT create a portal_invite — that happens when Mark clicks Convert
 * on the /inquiries page.
 */

const ALLOWED_CASE_TYPES = new Set([
  'medical_malpractice', 'personal_injury', 'product_liability',
  'criminal', 'peer_review', 'licensing_board', 'other',
])
const ALLOWED_SPECIALTIES = new Set([
  'general_anesthesia', 'regional', 'obstetric', 'pediatric', 'cardiac', 'neuro',
  'critical_care', 'airway_management', 'sedation', 'monitoring',
  'pharmacology', 'patient_safety', 'simulation', 'other',
])
const ALLOWED_SIDES = new Set(['plaintiff', 'defense', 'neutral'])

const TURNAROUND_LABELS: Record<string, string> = {
  urgent_1w: 'Urgent — within 1 week',
  fast_2w: '2 weeks',
  standard_30d: '30 days',
  flexible_60d: '60 days',
  flexible_90d: '90 days or flexible',
}

function humanize(v: string | null | undefined) {
  if (!v) return ''
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      organizationName,
      caseDescription,
      caseType,
      specialtyArea,
      side,
      requestedTurnaround,
      source,
    } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email' },
        { status: 400 }
      )
    }

    // Sanitize enum-like fields
    const caseTypeClean = caseType && ALLOWED_CASE_TYPES.has(caseType) ? caseType : null
    const specialtyClean = specialtyArea && ALLOWED_SPECIALTIES.has(specialtyArea) ? specialtyArea : null
    const sideClean = side && ALLOWED_SIDES.has(side) ? side : null
    const turnaroundClean = typeof requestedTurnaround === 'string' ? requestedTurnaround.slice(0, 60) : null
    const sourceClean = typeof source === 'string' && source.length > 0 ? source.slice(0, 40) : 'direct'

    const supabase = getSupabaseAdmin()

    // 1. Find or create contact
    const contactId = await findOrCreateAttorneyContact(supabase, {
      firstName,
      lastName,
      email,
      phone,
      organizationName,
    })

    // 2. Create inquiry case (status='inquiry') + link contact
    const { caseId, caseNumber } = await createInquiryCase(supabase, {
      contactId,
      firstName,
      lastName,
      organizationName,
      caseDescription,
      caseType: caseTypeClean,
      specialtyArea: specialtyClean,
      side: sideClean,
      requestedTurnaround: turnaroundClean,
      source: sourceClean,
    })

    // 3. Notify Dr. Ettinger — this is the THREAD ROOT for the case.
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const c = EMAIL_COLORS
      const fullName = `${firstName} ${lastName}`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
      const caseName = organizationName ? `${lastName} — ${organizationName}` : fullName

      const turnaroundLabel = turnaroundClean ? (TURNAROUND_LABELS[turnaroundClean] ?? turnaroundClean) : ''

      const detailRows = [
        { label: 'Name', value: fullName },
        { label: 'Email', value: email },
        phone ? { label: 'Phone', value: phone } : null,
        organizationName ? { label: 'Firm', value: organizationName } : null,
        caseTypeClean ? { label: 'Case Type', value: humanize(caseTypeClean) } : null,
        sideClean ? { label: 'Side', value: humanize(sideClean) } : null,
        specialtyClean ? { label: 'Clinical Area', value: humanize(specialtyClean) } : null,
        turnaroundLabel ? { label: 'Turnaround', value: turnaroundLabel } : null,
        sourceClean && sourceClean !== 'direct' ? { label: 'Source', value: sourceClean.toUpperCase() } : null,
        { label: 'Case', value: caseNumber },
      ]
        .filter(Boolean)
        .map(
          (row) =>
            `<tr>
              <td style="padding: 8px 12px 8px 0; color: ${c.textSecondary}; font-size: 13px; width: 120px; vertical-align: top;">${row!.label}</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 500; color: ${c.navy};">${row!.value}</td>
            </tr>`
        )
        .join('')

      const caseDescriptionHtml = caseDescription
        ? `<div style="background: #f8f9fb; border-left: 3px solid ${c.gold}; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
            <p style="font-size: 12px; font-weight: 700; color: ${c.navy}; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Case Description</p>
            <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.6; white-space: pre-wrap;">${caseDescription}</p>
          </div>`
        : ''

      const subject = caseEmailSubject(caseNumber, caseName, true)
      const headers = caseEmailHeaders(caseId, { isRoot: true })

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
          to: 'markettingermd@gmail.com',
          subject,
          headers,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${c.bgLight};">
<div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
<div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
  <div style="background: ${c.navyDark}; padding: 20px 24px;">
    <p style="font-family: Georgia, serif; font-size: 12px; color: ${c.gold}; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px;">New Inquiry</p>
    <h1 style="font-family: Georgia, serif; font-size: 18px; color: white; font-weight: 400; margin: 0;">${fullName}</h1>
  </div>
  <div style="height: 3px; background: ${c.gold};"></div>
  <div style="padding: 24px;">
    <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">${detailRows}</table>
    ${caseDescriptionHtml}
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${appUrl}/inquiries" style="display: inline-block; background: ${c.navy}; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review Inquiry</a>
    </div>
    <p style="text-align:center; font-size:12px; color:${c.textSecondary}; margin: 16px 0 0;">All future messages on this case will be threaded under this email.</p>
  </div>
</div>
</div>
</body>
</html>`,
        }),
      }).catch((err) => console.error('Consultation notification email error:', err))
    }

    return NextResponse.json({ success: true, caseId, caseNumber })
  } catch (error) {
    console.error('Consultation request error:', error)
    return NextResponse.json({ error: 'Failed to process consultation request' }, { status: 500 })
  }
}
