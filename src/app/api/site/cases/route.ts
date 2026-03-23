import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SPECIALTY_LABELS: Record<string, string> = {
  general_anesthesia: 'General Anesthesia',
  regional_anesthesia: 'Regional Anesthesia',
  neuraxial: 'Neuraxial Anesthesia',
  obstetric_anesthesia: 'Obstetric Anesthesia',
  obstetric: 'Obstetric Anesthesia',
  pediatric_anesthesia: 'Pediatric Anesthesia',
  cardiac_anesthesia: 'Cardiac Anesthesia',
  pain_management: 'Pain Management',
  critical_care: 'Critical Care',
  airway_management: 'Airway Management',
  sedation: 'Sedation',
  monitoring: 'Monitoring Standards',
  pharmacology: 'Pharmacology',
  patient_safety: 'Patient Safety',
  neuro: 'Neuroanesthesia',
}

const CASE_TYPE_LABELS: Record<string, string> = {
  medical_malpractice: 'Med Mal',
  personal_injury: 'PI',
  product_liability: 'Product Liability',
  criminal: 'Criminal',
  peer_review: 'Peer Review',
  licensing_board: 'Licensing Board',
  other: 'Other',
}

export async function GET() {
  const { data: cases, error } = await supabase
    .from('cases')
    .select('case_name, side, specialty_area, case_type, status, deposition_date, trial_date, created_at')
    .not('status', 'in', '("inquiry","declined","withdrawn")')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform for public display — strip patient names, just show structure
  const publicCases = (cases || []).map((c) => {
    // Determine involvement
    let involvement = 'Report'
    if (c.trial_date) involvement = 'Report & Trial'
    else if (c.deposition_date) involvement = 'Report & Deposition'

    // Determine year from created_at
    const year = new Date(c.created_at).getFullYear().toString()

    return {
      year,
      side: c.side === 'plaintiff' ? 'Plaintiff' : c.side === 'defense' ? 'Defense' : 'Neutral',
      specialty: SPECIALTY_LABELS[c.specialty_area] || c.specialty_area || 'General Anesthesia',
      caseType: CASE_TYPE_LABELS[c.case_type] || c.case_type,
      involvement,
    }
  })

  // Summary stats
  const stats = {
    total: publicCases.length,
    plaintiff: publicCases.filter((c) => c.side === 'Plaintiff').length,
    defense: publicCases.filter((c) => c.side === 'Defense').length,
    depositionsAndTrials: publicCases.filter((c) => c.involvement !== 'Report').length,
  }

  return NextResponse.json({ cases: publicCases, stats }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
