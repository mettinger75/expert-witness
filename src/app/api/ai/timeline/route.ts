import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { caseId, documentIds, mode = 'generate' } = body

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
      .select('id, file_name, category:document_type, description, ocr_text, ai_summary, date_of_document:document_date')
      .eq('case_id', caseId)

    if (Array.isArray(documentIds) && documentIds.length > 0) {
      docsQuery = docsQuery.in('id', documentIds)
    } else {
      docsQuery = docsQuery.in('document_type', [
        'medical_record', 'anesthesia_record', 'operative_report',
        'nursing_notes', 'lab_results', 'imaging', 'pharmacy', 'consent_form',
        'discharge_summary', 'physician_notes', 'autopsy',
      ])
    }

    const { data: documents, error: docsError } = await docsQuery
      .order('document_date', { ascending: true })

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No medical record documents found for this case. Upload medical records first.' },
        { status: 400 }
      )
    }

    // Build a map of document ID -> file name for linking entries
    const docIdMap = new Map(documents.map((doc) => [doc.file_name, doc.id]))

    // Build context from document texts
    const documentTexts = documents
      .map((doc) => {
        const text = doc.ocr_text || doc.ai_summary || doc.description || ''
        if (!text) return null
        return `--- DOCUMENT: "${doc.file_name}" (${doc.category || 'unknown'}) ---\n${text}`
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
      '- event_type: one of "admission", "discharge", "surgery", "procedure", "consultation", "diagnosis", "medication_start", "medication_stop", "medication_change", "lab_result", "imaging", "vital_signs", "nursing_note", "physician_note", "anesthesia_event", "complication", "code_event", "transfer", "death", "office_visit", "er_visit", "icu_admission", "icu_discharge", "intubation", "extubation", "other"',
      '- event_datetime: ISO 8601 datetime string',
      '- title: short descriptive title',
      '- description: detailed description of the event',
      '- provider_name: name of provider (if available)',
      '- provider_role: role of provider (if available)',
      '- facility: facility name (if available)',
      '- is_significant: boolean, true if this is a critical/significant event',
      '- significance_note: explanation of why significant (if applicable)',
      '- source_document: the exact filename from which this event was extracted (must match one of the DOCUMENT names above)',
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

    // For update mode, get the max existing sort_order so new entries append after existing ones
    let sortOrderOffset = 0
    if (mode === 'update') {
      const { data: maxEntry } = await supabase
        .from('medical_records_timeline')
        .select('sort_order')
        .eq('case_id', caseId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      sortOrderOffset = (maxEntry?.sort_order ?? -1) + 1
    }

    // Insert entries into database
    const insertData = timelineEntries.map((entry, index) => {
      // Parse datetime into separate date and time fields
      let eventDate: string | null = null
      let eventTime: string | null = null
      if (entry.event_datetime) {
        const dt = new Date(entry.event_datetime as string)
        if (!isNaN(dt.getTime())) {
          eventDate = dt.toISOString().split('T')[0]
          const timeStr = dt.toISOString().split('T')[1]?.split('.')[0]
          if (timeStr && timeStr !== '00:00:00') {
            eventTime = timeStr
          }
        }
      }
      if (!eventDate) {
        eventDate = new Date().toISOString().split('T')[0]
      }

      // Resolve document_id from the source_document filename
      const documentId = entry.source_document
        ? docIdMap.get(entry.source_document as string) || null
        : null

      return {
        case_id: caseId,
        document_id: documentId,
        event_type: entry.event_type || 'other',
        event_date: eventDate,
        event_time: eventTime,
        event_title: entry.title || 'Untitled Event',
        event_description: entry.description || null,
        provider_name: entry.provider_name || null,
        provider_specialty: entry.provider_role || null,
        facility_name: entry.facility || null,
        is_critical_event: entry.is_significant || false,
        critical_event_reason: entry.significance_note || null,
        ai_generated: true,
        ai_confidence: 0.8,
        sort_order: sortOrderOffset + index,
      }
    })

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
