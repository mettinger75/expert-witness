import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const categories = formData.getAll('categories') as string[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Extract text from files (for now, just use file names and categories as context)
    // In production, you'd use OCR or PDF text extraction here
    const fileDescriptions = files.map((file, i) => {
      return `File: ${file.name} (${categories[i] || 'unknown'}, ${(file.size / 1024).toFixed(1)} KB, type: ${file.type})`
    }).join('\n')

    // For PDF files, try to read text content
    const textContents: string[] = []
    for (const file of files) {
      if (file.type === 'text/plain') {
        const text = await file.text()
        textContents.push(`--- ${file.name} ---\n${text}`)
      }
      // Note: For PDF extraction in production, use a PDF parsing library
    }

    const modelTier = MODEL_BY_TASK.document_summarize
    const model = AI_CONFIG.models[modelTier]

    const userMessage = [
      'Extract case information from the following documents to populate an expert witness case management form.',
      '',
      'Files provided:',
      fileDescriptions,
      '',
      textContents.length > 0 ? 'Document contents:\n' + textContents.join('\n\n') : '',
      '',
      'Return ONLY a valid JSON object with these fields (use null for unknown values):',
      '{',
      '  "case_name": "string - case name, typically Patient Last v. Defendant Last",',
      '  "case_type": "medical_malpractice | wrongful_death | product_liability | personal_injury | other",',
      '  "specialty_area": "general_anesthesia | regional_anesthesia | obstetric_anesthesia | pediatric_anesthesia | cardiac_anesthesia | neuro_anesthesia | critical_care | sedation | airway_management | other",',
      '  "side": "plaintiff | defense | neutral",',
      '  "priority": "urgent | high | normal | low",',
      '  "date_of_incident": "YYYY-MM-DD or null",',
      '  "jurisdiction_state": "US state name or null",',
      '  "court_name": "court name or null",',
      '  "court_case_number": "case number or null",',
      '  "patient_name": "patient full name or null",',
      '  "patient_dob": "YYYY-MM-DD or null",',
      '  "patient_outcome": "full_recovery | partial_recovery | permanent_injury | permanent_disability | death | unknown",',
      '  "brief_summary": "brief case summary in 2-3 sentences",',
      '  "preliminary_opinion": "supports_standard | deviates_from_standard | mixed | insufficient_data | pending_review",',
      '}',
    ].filter(Boolean).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system: SYSTEM_PROMPTS.case_summary,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `AI extraction failed: ${response.status} - ${errorText.substring(0, 200)}` },
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
    const responseText = result.content?.[0]?.text || ''

    // Parse JSON from response
    let caseData: Record<string, unknown> = {}
    try {
      caseData = JSON.parse(responseText)
    } catch {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        caseData = JSON.parse(jsonMatch[1].trim())
      } else {
        const braceMatch = responseText.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          caseData = JSON.parse(braceMatch[0])
        }
      }
    }

    // Clean nulls - replace with empty strings for form compatibility
    const cleanedData = Object.fromEntries(
      Object.entries(caseData).map(([k, v]) => [k, v === null ? '' : v])
    )

    return NextResponse.json({
      caseData: cleanedData,
      model,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Case extraction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
