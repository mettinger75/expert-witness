import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { fetchPageContent } from '@/lib/notion'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const { id: caseId } = await params

    if (!caseId) {
      return NextResponse.json({ error: 'Missing case ID' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch all processed documents for this case
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, file_name, original_file_name, category, ai_summary, ai_key_findings, ai_extracted_dates, ai_extracted_medications, ai_extracted_providers, date_of_document')
      .eq('case_id', caseId)
      .eq('ocr_status', 'completed')
      .order('date_of_document', { ascending: true })

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Fetch Notion page content if linked
    let notionContent = ''
    if (caseData.notion_page_id || caseData.notion_page_url) {
      try {
        const pageId = caseData.notion_page_id ||
          (await import('@/lib/notion')).extractPageId(caseData.notion_page_url!)
        if (process.env.NOTION_API_KEY) {
          notionContent = await fetchPageContent(pageId)
        }
      } catch (err) {
        console.warn('Failed to fetch Notion content for synthesis:', err)
        // Continue without Notion content - not a fatal error
      }
    }

    if ((!documents || documents.length === 0) && !notionContent) {
      return NextResponse.json(
        { error: 'No processed documents or linked Notion page found. Upload documents or link a Notion page first.' },
        { status: 400 }
      )
    }

    // Build comprehensive context from all document analyses
    const documentContext = documents.map((doc, i) => {
      const parts = [
        `### Document ${i + 1}: ${doc.original_file_name || doc.file_name} (${doc.category || 'unknown'})`,
      ]
      if (doc.date_of_document) parts.push(`Date: ${doc.date_of_document}`)
      if (doc.ai_summary) parts.push(`Summary: ${doc.ai_summary}`)
      if (doc.ai_key_findings?.length) parts.push(`Key Findings:\n${doc.ai_key_findings.map((f: string) => `- ${f}`).join('\n')}`)
      if (doc.ai_extracted_dates) parts.push(`Dates: ${JSON.stringify(doc.ai_extracted_dates)}`)
      if (doc.ai_extracted_medications) parts.push(`Medications: ${JSON.stringify(doc.ai_extracted_medications)}`)
      if (doc.ai_extracted_providers?.length) parts.push(`Providers: ${doc.ai_extracted_providers.join(', ')}`)
      return parts.join('\n')
    }).join('\n\n---\n\n')

    // Build case context
    const caseContext = [
      '## Case Information',
      `Case: ${caseData.case_name}`,
      `Type: ${caseData.case_type}`,
      `Specialty: ${caseData.specialty_area || 'Not specified'}`,
      `Side: ${caseData.side}`,
      caseData.patient_name ? `Patient: ${caseData.patient_name}` : '',
      caseData.patient_dob ? `DOB: ${caseData.patient_dob}` : '',
      caseData.patient_outcome ? `Outcome: ${caseData.patient_outcome}` : '',
      caseData.date_of_incident ? `Date of Incident: ${caseData.date_of_incident}` : '',
      caseData.jurisdiction_state ? `Jurisdiction: ${caseData.jurisdiction_state}` : '',
    ].filter(Boolean).join('\n')

    const userMessage = [
      'Based on the following case information and analyzed medical documents, provide a comprehensive expert case analysis.',
      '',
      caseContext,
      '',
      documents && documents.length > 0 ? `## Analyzed Documents (${documents.length} total)` : '',
      '',
      documents && documents.length > 0 ? documentContext : '',
      notionContent ? '\n\n## Additional Case Notes (from Notion)\n\n' + notionContent : '',
      '',
      'Return ONLY a valid JSON object with these fields:',
      '{',
      '  "brief_summary": "comprehensive 2-4 paragraph case summary integrating all documents",',
      '  "key_issues": ["array of key medical-legal issues identified across all documents"],',
      '  "standard_of_care_issues": ["specific deviations from standard of care with supporting evidence"],',
      '  "causation_notes": "analysis of causation linking any deviations to patient outcome",',
      '  "damages_summary": "summary of injuries, complications, and damages suffered",',
      '  "preliminary_opinion": "one of: supportive, non_supportive, mixed, insufficient_records",',
      '  "opinion_summary": "detailed explanation of your preliminary expert opinion with reasoning"',
      '}',
    ].join('\n')

    const modelTier = MODEL_BY_TASK.case_synthesize
    const model = AI_CONFIG.models[modelTier]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        temperature: 0.2,
        system: SYSTEM_PROMPTS.case_synthesis,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `AI synthesis failed: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: response.status }
      )
    }

    let apiResult
    try {
      apiResult = await response.json()
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
    }

    const responseText = apiResult.content?.[0]?.text || ''

    // Parse structured JSON
    let synthesis: Record<string, unknown> = {}
    try {
      synthesis = JSON.parse(responseText)
    } catch {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try { synthesis = JSON.parse(jsonMatch[1].trim()) } catch { /* fallback below */ }
      }
      if (!synthesis.brief_summary) {
        const braceMatch = responseText.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          try { synthesis = JSON.parse(braceMatch[0]) } catch { /* use empty */ }
        }
      }
    }

    // Validate preliminary_opinion value
    const validOpinions = ['supportive', 'non_supportive', 'mixed', 'insufficient_records', 'pending']
    const opinion = validOpinions.includes(synthesis.preliminary_opinion as string)
      ? synthesis.preliminary_opinion as string
      : undefined

    // Update case record with synthesis results
    const updateData: Record<string, unknown> = {}
    if (synthesis.brief_summary) updateData.brief_summary = synthesis.brief_summary
    if (Array.isArray(synthesis.key_issues)) updateData.key_issues = synthesis.key_issues
    if (Array.isArray(synthesis.standard_of_care_issues)) updateData.standard_of_care_issues = synthesis.standard_of_care_issues
    if (synthesis.causation_notes) updateData.causation_notes = synthesis.causation_notes
    if (synthesis.damages_summary) updateData.damages_summary = synthesis.damages_summary
    if (opinion) updateData.preliminary_opinion = opinion
    if (synthesis.opinion_summary) updateData.opinion_summary = synthesis.opinion_summary

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', caseId)

      if (updateError) {
        console.error('Case update error:', updateError)
        return NextResponse.json(
          { error: `Failed to save case analysis: ${updateError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      caseId,
      documentsAnalyzed: documents.length,
      synthesis,
      model,
      usage: apiResult.usage,
    })
  } catch (error) {
    console.error('Case synthesis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
