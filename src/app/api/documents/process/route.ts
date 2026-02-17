import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS, ANTHROPIC_API_VERSION_PDF } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 120 // 2 minutes for AI document processing

const MAX_PDF_SIZE = 32 * 1024 * 1024 // 32MB

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: 'Missing required field: documentId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Validate file is a PDF (check file_type or mime_type or filename)
    const isPdf =
      doc.file_type === 'pdf' ||
      doc.mime_type === 'application/pdf' ||
      doc.original_file_name?.toLowerCase().endsWith('.pdf') ||
      doc.file_name?.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      // For non-PDF files, mark as not needed
      await supabase.from('documents').update({ ocr_status: 'not_needed' }).eq('id', documentId)
      return NextResponse.json({ error: 'Only PDF files can be processed', status: 'skipped' }, { status: 400 })
    }

    // Validate file size
    if ((doc.file_size_bytes || doc.file_size) && (doc.file_size_bytes || doc.file_size) > MAX_PDF_SIZE) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', documentId)
      return NextResponse.json(
        { error: 'PDF exceeds 32MB size limit for AI processing' },
        { status: 400 }
      )
    }

    // Mark as processing
    await supabase.from('documents').update({ ocr_status: 'processing' }).eq('id', documentId)

    // Download PDF from Supabase storage (use storage_path, fall back to file_path)
    const storagePath = doc.storage_path || doc.file_path
    const storageBucket = doc.storage_bucket || 'case-documents'
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(storagePath)

    if (downloadError || !fileData) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', documentId)
      return NextResponse.json(
        { error: `Failed to download file: ${downloadError?.message || 'unknown error'}` },
        { status: 500 }
      )
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Build Claude API request with PDF document content block
    const modelTier = MODEL_BY_TASK.document_process
    const model = AI_CONFIG.models[modelTier]

    const userPrompt = [
      `Analyze this medical document (${doc.original_file_name || doc.file_name}, type: ${doc.document_type || doc.category || 'unknown'}).`,
      '',
      'Return ONLY a valid JSON object with these fields:',
      '{',
      '  "summary": "2-3 paragraph summary of the document contents",',
      '  "key_findings": ["array of key clinical findings, events, or notable items"],',
      '  "extracted_dates": [{"date": "YYYY-MM-DD", "event": "description of what happened"}],',
      '  "extracted_medications": [{"name": "medication name", "dose": "dosage if known", "route": "route if known"}],',
      '  "extracted_providers": ["array of provider/physician names mentioned"],',
      '  "diagnoses": ["array of diagnoses mentioned"],',
      '  "procedures": ["array of procedures or surgeries mentioned"],',
      '  "ocr_text": "key extracted text content - focus on findings, impressions, and clinical details rather than repeating every line verbatim"',
      '}',
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
        max_tokens: 16384,
        temperature: 0.1,
        system: SYSTEM_PROMPTS.document_processing,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: userPrompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText.substring(0, 500))
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', documentId)
      return NextResponse.json(
        { error: `AI processing failed: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: response.status }
      )
    }

    let apiResult
    try {
      apiResult = await response.json()
    } catch {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', documentId)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 })
    }

    const responseText = apiResult.content?.[0]?.text || ''

    // Parse structured JSON from Claude's response
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(responseText)
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[1].trim()) } catch { /* fallback below */ }
      }
      if (!parsed.summary) {
        // Try finding JSON object brackets
        const braceMatch = responseText.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          try { parsed = JSON.parse(braceMatch[0]) } catch { /* use empty */ }
        }
      }
    }

    // Update document record with AI analysis
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_text: (parsed.ocr_text as string) || null,
        ai_summary: (parsed.summary as string) || null,
        ai_key_findings: Array.isArray(parsed.key_findings) ? parsed.key_findings : null,
        ai_extracted_dates: Array.isArray(parsed.extracted_dates) ? parsed.extracted_dates : null,
        ai_extracted_medications: Array.isArray(parsed.extracted_medications) ? parsed.extracted_medications : null,
        ai_extracted_providers: Array.isArray(parsed.extracted_providers) ? parsed.extracted_providers : null,
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Document update error:', updateError)
      return NextResponse.json(
        { error: `Failed to save analysis: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documentId,
      status: 'completed',
      summary: parsed.summary || null,
      keyFindings: parsed.key_findings || [],
      model,
      usage: apiResult.usage,
    })
  } catch (error) {
    console.error('Document processing error:', error)

    // Try to mark as failed
    try {
      const body = await request.clone().json().catch(() => ({}))
      if (body.documentId) {
        const supabase = getSupabaseAdmin()
        await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', body.documentId)
      }
    } catch { /* best effort */ }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
