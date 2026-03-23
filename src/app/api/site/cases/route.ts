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

/** Extract a short, public-safe issue description from case data */
function deriveIssue(c: {
  key_issues: string[] | null
  standard_of_care_issues: string[] | null
  brief_summary: string | null
  specialty_area: string | null
}): string {
  // Try key_issues first — take the first clean one
  if (c.key_issues && c.key_issues.length > 0) {
    const first = c.key_issues[0]
      .replace(/^\*\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\s*-\s*/, '')
      .trim()
    // Only use if it's a short, clean description
    if (first.length > 5 && first.length < 120) {
      return first
    }
  }

  // Try standard_of_care_issues
  if (c.standard_of_care_issues && c.standard_of_care_issues.length > 0) {
    const first = c.standard_of_care_issues[0]
      .replace(/^\*\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^Plaintiff alleged\s*/i, '')
      .replace(/^Allegedly\s*/i, '')
      .trim()
    if (first.length > 5 && first.length < 120) {
      return first.charAt(0).toUpperCase() + first.slice(1)
    }
  }

  // Try brief_summary — extract first sentence
  if (c.brief_summary) {
    // Skip summaries that start with "Dear Dr." (intake letters)
    if (!c.brief_summary.startsWith('Dear')) {
      const firstSentence = c.brief_summary.split(/[.!]\s/)[0]
      if (firstSentence && firstSentence.length < 120 && firstSentence.length > 10) {
        return firstSentence.trim()
      }
    }
  }

  // Fallback based on specialty
  const fallbacks: Record<string, string> = {
    general_anesthesia: 'Anesthesia management standard of care',
    critical_care: 'Critical care management',
    pain_management: 'Pain management procedure complication',
    neuro: 'Neuroanesthesia and neuromonitoring',
    obstetric: 'Obstetric anesthesia complication',
    obstetric_anesthesia: 'Obstetric anesthesia complication',
  }
  return fallbacks[c.specialty_area || ''] || 'Standard of care evaluation'
}

// Statuses that indicate deposition occurred
const DEPO_STATUSES = ['deposition_complete', 'trial_scheduled', 'trial_complete']

export async function GET() {
  const { data: cases, error } = await supabase
    .from('cases')
    .select('case_name, side, specialty_area, case_type, status, deposition_date, trial_date, created_at, key_issues, standard_of_care_issues, brief_summary')
    .not('status', 'in', '("inquiry","declined","withdrawn")')
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const publicCases = (cases || []).map((c) => {
    // Determine involvement from status, dates, and key_issues presence
    let involvement = 'Report'
    if (c.trial_date || c.status === 'trial_complete' || c.status === 'trial_scheduled') {
      involvement = 'Report & Trial'
    } else if (
      c.deposition_date ||
      DEPO_STATUSES.includes(c.status) ||
      c.status === 'deposition_complete' ||
      c.status === 'deposition_scheduled'
    ) {
      involvement = 'Report & Deposition'
    } else if (c.status === 'closed' && c.key_issues && c.key_issues.length > 0) {
      // Closed cases with detailed key issues likely had depositions
      involvement = 'Report & Deposition'
    }

    const year = new Date(c.created_at).getFullYear().toString()

    return {
      year,
      side: c.side === 'plaintiff' ? 'Plaintiff' : c.side === 'defense' ? 'Defense' : 'Neutral',
      specialty: SPECIALTY_LABELS[c.specialty_area] || c.specialty_area || 'General Anesthesia',
      caseType: CASE_TYPE_LABELS[c.case_type] || c.case_type,
      involvement,
      issue: deriveIssue(c),
    }
  })

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
