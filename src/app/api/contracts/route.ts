import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { deriveContractRates, STANDARD_SCOPE } from '@/lib/contract-terms'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const {
      caseId,
      contactId,
      firmName,
      firmContactName,
      firmEmail,
      firmAddress,
      firmPhone,
      hourlyRate,
      depositionRate,
      trialRate,
      retainerAmount,
      cancellationFeeHours,
      paymentTermsDays,
      scopeDescription,
      additionalTerms,
    } = body

    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Quote from billing_rates rather than a hard-coded default, so an agreement
    // can never go out at a rate the practice no longer charges. An explicit
    // value in the request still wins — this only supplies what was omitted.
    const { data: rateRows } = await supabase
      .from('billing_rates')
      .select('activity_type, rate_per_hour, daily_rate, is_active, end_date')
    const standard = deriveContractRates(rateRows)

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        case_id: caseId,
        contact_id: contactId || null,
        contract_type: 'retention_agreement',
        title: 'Expert Witness Retention Agreement',
        status: 'draft',
        firm_name: firmName || null,
        firm_contact_name: firmContactName || null,
        firm_address: firmAddress || null,
        firm_email: firmEmail || null,
        firm_phone: firmPhone || null,
        hourly_rate: hourlyRate ?? standard.hourlyRate,
        deposition_rate: depositionRate ?? standard.depositionRate,
        trial_rate: trialRate ?? standard.trialRate,
        retainer_amount: retainerAmount ?? standard.retainerAmount,
        cancellation_fee_hours: cancellationFeeHours ?? standard.cancellationFeeHours,
        payment_terms_days: paymentTermsDays ?? standard.paymentTermsDays,
        scope_description: scopeDescription || STANDARD_SCOPE,
        additional_terms: additionalTerms || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ contract })
  } catch (error) {
    console.error('Contract creation error:', error)
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}
