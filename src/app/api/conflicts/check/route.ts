import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

interface ConflictMatch {
  type: 'party' | 'attorney' | 'firm'
  name: string
  matchedIn: string
  caseId: string
  caseName: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const { caseId, partyNames, attorneyNames, firmNames } = body

    if (!caseId) {
      return NextResponse.json(
        { error: 'Missing required field: caseId' },
        { status: 400 }
      )
    }

    if (
      (!partyNames || partyNames.length === 0) &&
      (!attorneyNames || attorneyNames.length === 0) &&
      (!firmNames || firmNames.length === 0)
    ) {
      return NextResponse.json(
        { error: 'At least one of partyNames, attorneyNames, or firmNames must be provided' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const matches: ConflictMatch[] = []

    // Search for party name conflicts in existing cases (excluding current case)
    if (partyNames?.length) {
      for (const name of partyNames) {
        const normalizedName = name.trim().toLowerCase()
        if (!normalizedName) continue

        // Search in cases - patient name, plaintiff, defendant fields
        const { data: caseMatches } = await supabase
          .from('cases')
          .select('id, title, case_name, patient_name, plaintiff_name, defendant_name')
          .neq('id', caseId)
          .or(
            `patient_name.ilike.%${normalizedName}%,plaintiff_name.ilike.%${normalizedName}%,defendant_name.ilike.%${normalizedName}%`
          )

        if (caseMatches?.length) {
          for (const match of caseMatches) {
            const matchedFields: string[] = []
            if (match.patient_name?.toLowerCase().includes(normalizedName)) matchedFields.push('patient_name')
            if (match.plaintiff_name?.toLowerCase().includes(normalizedName)) matchedFields.push('plaintiff_name')
            if (match.defendant_name?.toLowerCase().includes(normalizedName)) matchedFields.push('defendant_name')

            matches.push({
              type: 'party',
              name,
              matchedIn: matchedFields.join(', '),
              caseId: match.id,
              caseName: match.title || match.case_name || 'Unknown case',
            })
          }
        }

        // Search in contacts table
        const { data: contactMatches } = await supabase
          .from('contacts')
          .select('id, name, full_name, case_id, type')
          .ilike('name', `%${normalizedName}%`)

        if (contactMatches?.length) {
          for (const contact of contactMatches) {
            if (contact.case_id === caseId) continue
            // Fetch the associated case name
            let caseName = 'Unknown case'
            if (contact.case_id) {
              const { data: relatedCase } = await supabase
                .from('cases')
                .select('title, case_name')
                .eq('id', contact.case_id)
                .single()
              if (relatedCase) {
                caseName = relatedCase.title || relatedCase.case_name || 'Unknown case'
              }
            }

            matches.push({
              type: 'party',
              name,
              matchedIn: `contacts (${contact.type || 'unknown type'})`,
              caseId: contact.case_id || '',
              caseName,
            })
          }
        }
      }
    }

    // Search for attorney name conflicts
    if (attorneyNames?.length) {
      for (const name of attorneyNames) {
        const normalizedName = name.trim().toLowerCase()
        if (!normalizedName) continue

        // Search in cases - attorney fields
        const { data: caseMatches } = await supabase
          .from('cases')
          .select('id, title, case_name, retaining_attorney, opposing_attorney')
          .neq('id', caseId)
          .or(
            `retaining_attorney.ilike.%${normalizedName}%,opposing_attorney.ilike.%${normalizedName}%`
          )

        if (caseMatches?.length) {
          for (const match of caseMatches) {
            const matchedFields: string[] = []
            if (match.retaining_attorney?.toLowerCase().includes(normalizedName)) matchedFields.push('retaining_attorney')
            if (match.opposing_attorney?.toLowerCase().includes(normalizedName)) matchedFields.push('opposing_attorney')

            matches.push({
              type: 'attorney',
              name,
              matchedIn: matchedFields.join(', '),
              caseId: match.id,
              caseName: match.title || match.case_name || 'Unknown case',
            })
          }
        }

        // Search contacts for attorney type
        const { data: contactMatches } = await supabase
          .from('contacts')
          .select('id, name, full_name, case_id, type')
          .eq('type', 'attorney')
          .ilike('name', `%${normalizedName}%`)

        if (contactMatches?.length) {
          for (const contact of contactMatches) {
            if (contact.case_id === caseId) continue
            let caseName = 'Unknown case'
            if (contact.case_id) {
              const { data: relatedCase } = await supabase
                .from('cases')
                .select('title, case_name')
                .eq('id', contact.case_id)
                .single()
              if (relatedCase) {
                caseName = relatedCase.title || relatedCase.case_name || 'Unknown case'
              }
            }

            matches.push({
              type: 'attorney',
              name,
              matchedIn: 'contacts (attorney)',
              caseId: contact.case_id || '',
              caseName,
            })
          }
        }
      }
    }

    // Search for firm name conflicts
    if (firmNames?.length) {
      for (const name of firmNames) {
        const normalizedName = name.trim().toLowerCase()
        if (!normalizedName) continue

        // Search in cases - firm fields
        const { data: caseMatches } = await supabase
          .from('cases')
          .select('id, title, case_name, retaining_firm, opposing_firm')
          .neq('id', caseId)
          .or(
            `retaining_firm.ilike.%${normalizedName}%,opposing_firm.ilike.%${normalizedName}%`
          )

        if (caseMatches?.length) {
          for (const match of caseMatches) {
            const matchedFields: string[] = []
            if (match.retaining_firm?.toLowerCase().includes(normalizedName)) matchedFields.push('retaining_firm')
            if (match.opposing_firm?.toLowerCase().includes(normalizedName)) matchedFields.push('opposing_firm')

            matches.push({
              type: 'firm',
              name,
              matchedIn: matchedFields.join(', '),
              caseId: match.id,
              caseName: match.title || match.case_name || 'Unknown case',
            })
          }
        }

        // Search contacts for firm type or organization
        const { data: contactMatches } = await supabase
          .from('contacts')
          .select('id, name, full_name, case_id, type, organization')
          .or(
            `organization.ilike.%${normalizedName}%,name.ilike.%${normalizedName}%`
          )

        if (contactMatches?.length) {
          for (const contact of contactMatches) {
            if (contact.case_id === caseId) continue
            let caseName = 'Unknown case'
            if (contact.case_id) {
              const { data: relatedCase } = await supabase
                .from('cases')
                .select('title, case_name')
                .eq('id', contact.case_id)
                .single()
              if (relatedCase) {
                caseName = relatedCase.title || relatedCase.case_name || 'Unknown case'
              }
            }

            matches.push({
              type: 'firm',
              name,
              matchedIn: `contacts (${contact.type || 'organization'})`,
              caseId: contact.case_id || '',
              caseName,
            })
          }
        }
      }
    }

    // Deduplicate matches
    const uniqueMatches = matches.filter(
      (match, index, self) =>
        index ===
        self.findIndex(
          (m) =>
            m.type === match.type &&
            m.name === match.name &&
            m.caseId === match.caseId &&
            m.matchedIn === match.matchedIn
        )
    )

    return NextResponse.json({
      caseId,
      hasConflict: uniqueMatches.length > 0,
      matches: uniqueMatches,
    })
  } catch (error) {
    console.error('Conflict check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
