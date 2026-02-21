import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { caseId, documentIds } = body

    if (!caseId) {
      return NextResponse.json({ error: 'Missing required field: caseId' }, { status: 400 })
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

    // Fetch case documents — either specific IDs or all medical categories
    let docsQuery = supabase
      .from('documents')
      .select('id, file_name, category, description, ocr_text, ai_summary, date_of_document')
      .eq('case_id', caseId)

    if (Array.isArray(documentIds) && documentIds.length > 0) {
      docsQuery = docsQuery.in('id', documentIds)
    } else {
      docsQuery = docsQuery.in('category', [
        'medical_record', 'anesthesia_record', 'operative_report',
        'nursing_notes', 'lab_results', 'imaging', 'pharmacy', 'consent_form',
      ])
    }

    const { data: documents, error: docsError } = await docsQuery
      .order('date_of_document', { ascending: true })

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No medical record documents found for this case. Upload medical records first.' },
        { status: 400 }
      )
    }

    // Build context from document texts
    const documentTexts = documents
      .map((doc) => {
        const text = doc.ocr_text || doc.ai_summary || doc.description || ''
        if (!text) return null
        return `--- ${doc.file_name} (${doc.category}) ---\n${text}`
      })
      .filter(Boolean)
      .join('\n\n')

    if (!documentTexts) {
      return NextResponse.json(
        { error: 'No extractable text found in documents. Documents may need OCR processing first.' },
        { status: 400 }
      )
    }

    const modelTier = MODEL_BY_TASK.timeline_extract
    const model = AI_CONFIG.models[modelTier]

    const userMessage = [
      `Extract a detailed chronological medical timeline from the following documents for case: ${caseData.case_name || 'Unknown'}.`,
      `Patient: ${caseData.patient_name || 'Unknown'}`,
      '',
      'Return ONLY a valid JSON array of timeline events. Each event should have these fields:',
      '- event_type: one of "admission", "discharge", "surgery", "procedure", "anesthesia_start", "anesthesia_end", "medication_given", "vital_signs", "lab_result", "imaging", "consultation", "nursing_assessment", "physician_note", "code_event", "complication", "death", "other"',
      '- event_datetime: ISO 8601 datetime string',
      '- title: short descriptive title',
      '- description: detailed description of the event',
      '- provider_name: name of provider (if available)',
      '- provider_role: role of provider (if available)',
      '- facility: facility name (if available)',
      '- is_significant: boolean, true if this is a critical/significant event',
      '- significance_note: explanation of why significant (if applicable)',
      '',
      'DOCUMENTS:',
      documentTexts,
    ].join('\n')

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
        temperature: 0.1,
        system: SYSTEM_PROMPTS.timeline_generation,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `AI generation failed: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: response.status }
      )
    }

    let result
    try {
      result = await response.json()
    } catch {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `Failed to parse AI response: ${text.substring(0, 200)}` },
        { status: 502 }
      )
    }
    const responseText = result.content?.[0]?.text || ''

    // Parse JSON from AI response - try to extract JSON array
    let timelineEntries: Array<Record<string, unknown>> = []
    try {
      // Try direct JSON parse first
      timelineEntries = JSON.parse(responseText)
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        timelineEntries = JSON.parse(jsonMatch[1].trim())
      } else {
        // Try finding array brackets
        const bracketMatch = responseText.match(/\[[\s\S]*\]/)
        if (bracketMatch) {
          timelineEntries = JSON.parse(bracketMatch[0])
        }
      }
    }

    if (!Array.isArray(timelineEntries) || timelineEntries.length === 0) {
      return NextResponse.json(
        { error: 'AI could not extract timeline events from the documents' },
        { status: 422 }
      )
    }

    // Insert entries into database
    const insertData = timelineEntries.map((entry, index) => ({
      case_id: caseId,
      event_type: entry.event_type || 'other',
      event_datetime: entry.event_datetime || new Date().toISOString(),
      title: entry.title || 'Untitled Event',
      description: entry.description || null,
      provider_name: entry.provider_name || null,
      provider_role: entry.provider_role || null,
      facility: entry.facility || null,
      is_significant: entry.is_significant || false,
      significance_note: entry.significance_note || null,
      ai_generated: true,
      ai_confidence: 0.8,
      sort_order: index,
    }))

    const { error: insertError } = await supabase
      .from('medical_records_timeline')
      .insert(insertData)

    if (insertError) {
      console.error('Timeline insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to save timeline entries: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: insertData.length,
      model,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Timeline generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
