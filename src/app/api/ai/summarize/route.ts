import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS, assembleContext } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { caseId, summaryType = 'brief' } = body

    if (!caseId) {
      return NextResponse.json(
        { error: 'Missing required field: caseId' },
        { status: 400 }
      )
    }

    const validTypes = ['brief', 'detailed', 'timeline']
    if (!validTypes.includes(summaryType)) {
      return NextResponse.json(
        { error: `Invalid summaryType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Fetch related documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, filename, category, description, extracted_text')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    // Fetch timeline entries
    const { data: timelineEntries } = await supabase
      .from('timeline_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: true })

    // Assemble context using the helper
    const documentSummaries = documents?.map(
      (doc) =>
        `[${doc.category || 'Document'}] ${doc.name || doc.filename}: ${
          doc.extracted_text
            ? doc.extracted_text.substring(0, 2000)
            : doc.description || 'No content available'
        }`
    ) || []

    const timelineStrings = timelineEntries?.map(
      (entry) =>
        `${entry.event_date || 'Unknown date'} - ${entry.title || entry.event_type || 'Event'}: ${
          entry.description || ''
        }`
    ) || []

    const context = assembleContext(caseData, documentSummaries, timelineStrings)

    // Select system prompt - use timeline_generation for timeline type, case_summary otherwise
    const systemPrompt =
      summaryType === 'timeline'
        ? SYSTEM_PROMPTS.timeline_generation
        : SYSTEM_PROMPTS.case_summary

    // Build user message based on summary type
    const summaryInstructions: Record<string, string> = {
      brief:
        'Provide a concise summary of this case in 2-3 paragraphs. Focus on the key facts, allegations, and current status.',
      detailed:
        'Provide a comprehensive summary of this case. Include patient demographics, clinical timeline, allegations, standard of care analysis, key findings from the medical records, and current case status.',
      timeline:
        'Generate a detailed chronological timeline of all medical events in this case. Include dates, procedures, providers, clinical decisions, and any complications or adverse events.',
    }

    const userMessage = `${summaryInstructions[summaryType]}\n\n${context}`

    // Select model - use case_analysis for detailed, standard for others
    const modelTier =
      summaryType === 'detailed'
        ? MODEL_BY_TASK.case_analysis
        : MODEL_BY_TASK.document_summarize
    const model = AI_CONFIG.models[modelTier]

    // Call Anthropic API (non-streaming)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: AI_CONFIG.defaultParams.max_tokens,
        temperature: AI_CONFIG.defaultParams.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: response.status }
      )
    }

    let result
    try {
      result = await response.json()
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      )
    }
    const summaryText = result.content?.[0]?.text || ''

    return NextResponse.json({
      caseId,
      summaryType,
      summary: summaryText,
      model,
      documentCount: documents?.length || 0,
      timelineEntryCount: timelineEntries?.length || 0,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Case summarization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
