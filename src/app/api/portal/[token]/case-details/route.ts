import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

// Allow-lists mirror the CHECK constraints on the cases table. Because this is
// a public (token-gated) write endpoint, an out-of-range value would otherwise
// trip the DB constraint and 500 the whole submission — so we validate here and
// simply skip any value we don't recognize.
const SPECIALTY_AREAS = new Set([
  'general_anesthesia', 'regional', 'obstetric', 'pediatric', 'cardiac', 'neuro',
  'pain_management', 'critical_care', 'airway_management', 'sedation', 'monitoring',
  'pharmacology', 'patient_safety', 'simulation', 'other',
])
const PATIENT_OUTCOMES = new Set([
  'death', 'permanent_injury', 'temporary_injury', 'no_injury', 'unknown',
  'full_recovery', 'partial_recovery', 'disability',
])
const CASE_TYPES = new Set([
  'medical_malpractice', 'personal_injury', 'product_liability', 'criminal',
  'peer_review', 'licensing_board', 'other',
])
const CASE_SIDES = new Set(['plaintiff', 'defense', 'neutral'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FIELDS_RETURNED =
  'case_name, case_type, side, specialty_area, patient_name, patient_dob, ' +
  'patient_age_at_incident, patient_outcome, jurisdiction_state, jurisdiction_county, ' +
  'court_name, court_case_number, brief_summary, date_of_incident, date_of_referral'

function cleanStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t.length > 0 ? t : undefined
}

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
      .select(FIELDS_RETURNED)
      .eq('id', invite.case_id)
      .single()

    return NextResponse.json(caseData || {})
  } catch (error) {
    console.error('Get case details error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Attorney enters the full case details during onboarding
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

    // Throttle per token and per IP — this endpoint can now create contact
    // records (opposing counsel / defendants), so guard against abuse.
    const ip = clientIp(request)
    const [tokenOk, ipOk] = await Promise.all([
      checkRateLimit(`case-details:token:${token}`, 30, 3600),
      checkRateLimit(`case-details:ip:${ip}`, 60, 3600),
    ])
    if (!tokenOk || !ipOk) {
      return NextResponse.json(
        { error: 'Too many submissions from this portal. Please try again later.' },
        { status: 429 }
      )
    }

    // Build update object from provided fields, validating enums against the
    // cases CHECK constraints.
    const caseUpdate: Record<string, unknown> = {}

    const caseName = cleanStr(body.case_name)
    if (caseName) caseUpdate.case_name = caseName

    const caseType = cleanStr(body.case_type)
    if (caseType && CASE_TYPES.has(caseType)) caseUpdate.case_type = caseType

    const side = cleanStr(body.side)
    if (side && CASE_SIDES.has(side)) caseUpdate.side = side

    const specialty = cleanStr(body.specialty_area)
    if (specialty && SPECIALTY_AREAS.has(specialty)) caseUpdate.specialty_area = specialty

    const dateOfIncident = cleanStr(body.date_of_incident)
    if (dateOfIncident) caseUpdate.date_of_incident = dateOfIncident

    const dateOfReferral = cleanStr(body.date_of_referral)
    if (dateOfReferral) caseUpdate.date_of_referral = dateOfReferral

    const jurisdictionState = cleanStr(body.jurisdiction_state)
    if (jurisdictionState) caseUpdate.jurisdiction_state = jurisdictionState

    const jurisdictionCounty = cleanStr(body.jurisdiction_county)
    if (jurisdictionCounty) caseUpdate.jurisdiction_county = jurisdictionCounty

    const courtName = cleanStr(body.court_name)
    if (courtName) caseUpdate.court_name = courtName

    const courtCaseNumber = cleanStr(body.court_case_number)
    if (courtCaseNumber) caseUpdate.court_case_number = courtCaseNumber

    const patientName = cleanStr(body.patient_name)
    if (patientName) caseUpdate.patient_name = patientName

    const patientDob = cleanStr(body.patient_dob)
    if (patientDob) caseUpdate.patient_dob = patientDob

    // patient_age_at_incident is an integer column
    if (body.patient_age_at_incident !== undefined && body.patient_age_at_incident !== null && body.patient_age_at_incident !== '') {
      const age = parseInt(String(body.patient_age_at_incident), 10)
      if (Number.isFinite(age) && age >= 0 && age <= 130) {
        caseUpdate.patient_age_at_incident = age
      }
    }

    const patientOutcome = cleanStr(body.patient_outcome)
    if (patientOutcome && PATIENT_OUTCOMES.has(patientOutcome)) caseUpdate.patient_outcome = patientOutcome

    const briefSummary = cleanStr(body.brief_summary)
    if (briefSummary) caseUpdate.brief_summary = briefSummary

    // key_issues is a TEXT[] array column — convert string input to array
    if (body.key_issues) {
      if (Array.isArray(body.key_issues)) {
        caseUpdate.key_issues = body.key_issues
      } else {
        caseUpdate.key_issues = (body.key_issues as string)
          .split(/[\n;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      }
    }

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

    // --- Other parties on the case ---------------------------------------
    // Opposing counsel and named defendants are RECORDED for conflict-checking
    // and case context only. Unlike the "invite a colleague" flow, they are
    // never sent a portal link and never receive an email.
    const partiesAdded: string[] = []

    /** Create (or reuse, when an email matches) a contact and link it to the
     *  case in the given role. Skips silently if the link already exists. */
    async function linkParty(opts: {
      firstName?: string
      lastName?: string
      organizationName?: string
      email?: string
      contactType: string
      caseRole: string
    }): Promise<void> {
      const { firstName, lastName, organizationName, email, contactType, caseRole } = opts
      let contactId: string | null = null

      if (email) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (existing) contactId = existing.id
      }

      if (!contactId) {
        const { data: created, error: contactErr } = await supabase
          .from('contacts')
          .insert({
            first_name: firstName || null,
            last_name: lastName || null,
            organization_name: organizationName || null,
            email: email || null,
            contact_type: contactType,
          })
          .select('id')
          .single()
        if (contactErr) {
          // Lost a race on the unique email — fetch the winner.
          if (contactErr.code === '23505' && email) {
            const { data: retry } = await supabase
              .from('contacts')
              .select('id')
              .eq('email', email)
              .single()
            contactId = retry?.id ?? null
          } else {
            console.error('linkParty: contact insert failed', contactErr)
            return
          }
        } else {
          contactId = created.id
        }
      }

      if (!contactId) return

      const { data: existingLink } = await supabase
        .from('case_contacts')
        .select('id')
        .eq('case_id', inv.case_id)
        .eq('contact_id', contactId)
        .eq('role', caseRole)
        .maybeSingle()

      if (!existingLink) {
        await supabase.from('case_contacts').insert({
          case_id: inv.case_id,
          contact_id: contactId,
          role: caseRole,
          is_primary: false,
        })
      }
    }

    // Opposing counsel — needs at least a name or a firm to be worth recording.
    const ocFirst = cleanStr(body.opposing_counsel_first_name)
    const ocLast = cleanStr(body.opposing_counsel_last_name)
    const ocFirm = cleanStr(body.opposing_counsel_firm)
    const ocEmailRaw = cleanStr(body.opposing_counsel_email)?.toLowerCase()
    const ocEmail = ocEmailRaw && EMAIL_RE.test(ocEmailRaw) ? ocEmailRaw : undefined
    if (ocFirst || ocLast || ocFirm) {
      await linkParty({
        firstName: ocFirst,
        lastName: ocLast,
        organizationName: ocFirm,
        email: ocEmail,
        contactType: 'attorney',
        caseRole: 'opposing_attorney',
      })
      partiesAdded.push(
        `Opposing counsel: ${[ocFirst, ocLast].filter(Boolean).join(' ')}${ocFirm ? ` (${ocFirm})` : ''}`.trim()
      )
    }

    // Defendant(s) / party being sued — a single free-text name (hospital,
    // practice, or provider). Stored as an organization-style contact so it
    // surfaces in conflict checks.
    const defendantName = cleanStr(body.defendant_name)
    if (defendantName) {
      await linkParty({
        organizationName: defendantName,
        contactType: 'other',
        caseRole: 'defendant',
      })
      partiesAdded.push(`Defendant / party: ${defendantName}`)
    }

    // Mark the enter_case_details step as completed
    const steps: Record<string, string> =
      typeof inv.onboarding_steps === 'object' && inv.onboarding_steps !== null
        ? { ...(inv.onboarding_steps as Record<string, string>) }
        : {}

    steps.enter_case_details = 'completed'

    // Auto-unlock next step after enter_case_details
    // Walk forward through the step order, skipping not_applicable, unlocking the first locked step
    const nextStepOrder = ['invite_colleague', 'schedule_call', 'sign_contract', 'retainer_payment', 'upload_documents']
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

        const fieldsEntered = Object.keys(caseUpdate).filter(k => k !== 'updated_at' && k !== 'status')
        const fieldsList = fieldsEntered.map(f => `<li style="padding: 2px 0;">${f.replace(/_/g, ' ')}</li>`).join('')
        const partiesList = partiesAdded.length
          ? `<p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Other parties recorded:</p>
             <ul style="color: #374151; font-size: 14px; line-height: 1.8;">${partiesAdded.map(p => `<li style="padding: 2px 0;">${p}</li>`).join('')}</ul>`
          : ''

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
                  ${partiesList}
                  ${body.brief_summary ? `<p style="color: #6b7280; font-size: 13px; margin-top: 16px; border-left: 3px solid #DFC06A; padding-left: 12px;"><strong>Summary:</strong> ${String(body.brief_summary).substring(0, 300)}${String(body.brief_summary).length > 300 ? '...' : ''}</p>` : ''}
                  <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                    View the case in the
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'}/cases/${inv.case_id}" style="color: #DFC06A;">case dashboard</a>.
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
