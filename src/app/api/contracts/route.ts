import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      caseId,
      contactId,
      firmName,
      firmContactName,
      firmEmail,
      firmAddress,
      firmPhone,
      hourlyRate = 500,
      depositionRate = 750,
      trialRate = 750,
      retainerAmount = 5000,
      cancellationFeeHours = 48,
      paymentTermsDays = 30,
      scopeDescription,
      additionalTerms,
    } = body

    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

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
        hourly_rate: hourlyRate,
        deposition_rate: depositionRate,
        trial_rate: trialRate,
        retainer_amount: retainerAmount,
        cancellation_fee_hours: cancellationFeeHours,
        payment_terms_days: paymentTermsDays,
        scope_description: scopeDescription || null,
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
