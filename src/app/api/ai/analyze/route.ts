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
    const { documentId, caseId, analysisType } = body

    if (!documentId || !caseId || !analysisType) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, caseId, analysisType' },
        { status: 400 }
      )
    }

    const validTypes = ['summary', 'timeline_extraction', 'standard_of_care', 'key_findings']
    if (!validTypes.includes(analysisType)) {
      return NextResponse.json(
        { error: `Invalid analysisType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch document metadata
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Fetch case data for additional context
    const { data: caseData } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    // Select system prompt based on analysis type
    const systemPromptMap: Record<string, string> = {
      summary: SYSTEM_PROMPTS.document_analysis,
      timeline_extraction: SYSTEM_PROMPTS.timeline_generation,
      standard_of_care: SYSTEM_PROMPTS.standard_of_care,
      key_findings: SYSTEM_PROMPTS.document_analysis,
    }

    const systemPrompt = systemPromptMap[analysisType]

    // Select model based on task type
    const modelTaskMap: Record<string, keyof typeof MODEL_BY_TASK> = {
      summary: 'document_summarize',
      timeline_extraction: 'timeline_extract',
      standard_of_care: 'case_analysis',
      key_findings: 'document_summarize',
    }

    const taskKey = modelTaskMap[analysisType]
    const modelTier = MODEL_BY_TASK[taskKey]
    const model = AI_CONFIG.models[modelTier]

    // Build the user message with document context
    const userMessage = [
      `Analyze the following document for: ${analysisType.replace(/_/g, ' ')}`,
      '',
      `Document: ${document.name || document.filename}`,
      `Category: ${document.category || 'Unspecified'}`,
      `Description: ${document.description || 'No description provided'}`,
      '',
      caseData ? `Case: ${caseData.title || caseData.case_name || 'Unknown'}` : '',
      caseData?.patient_name ? `Patient: ${caseData.patient_name}` : '',
      '',
      document.extracted_text
        ? `Document Content:\n${document.extracted_text}`
        : 'Note: Document text has not been extracted yet. Please analyze based on available metadata.',
    ].filter(Boolean).join('\n')

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
        { error: `Anthropic API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    const analysisText = result.content?.[0]?.text || ''

    return NextResponse.json({
      documentId,
      caseId,
      analysisType,
      analysis: analysisText,
      model,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
