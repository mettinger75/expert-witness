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
    const { caseId, templateId, sections } = body

    if (!caseId || !templateId || !sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, templateId, sections (non-empty array)' },
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

    // Fetch template with sections
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select('*, template_sections(*)')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Report template not found' },
        { status: 404 }
      )
    }

    // Fetch supporting case data
    const [
      { data: documents },
      { data: timelineEntries },
      { data: depositions },
    ] = await Promise.all([
      supabase
        .from('documents')
        .select('id, name, filename, category, description, extracted_text')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      supabase
        .from('timeline_entries')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: true }),
      supabase
        .from('depositions')
        .select('*')
        .eq('case_id', caseId)
        .order('deposition_date', { ascending: true }),
    ])

    // Assemble context
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

    // Add deposition context if available
    const depositionContext = depositions?.length
      ? '\n\n## Depositions\n' +
        depositions
          .map(
            (dep) =>
              `${dep.deponent_name || 'Unknown'} (${dep.deposition_date || 'No date'}): ${
                dep.summary || dep.notes || 'No summary'
              }`
          )
          .join('\n')
      : ''

    const fullContext = context + depositionContext

    // Use report_generation model and system prompt
    const modelTier = MODEL_BY_TASK.report_generation
    const model = AI_CONFIG.models[modelTier]
    const systemPrompt = SYSTEM_PROMPTS.report_generation

    // Get template sections keyed by section_key
    const templateSections = template.template_sections || []
    const sectionMap: Record<string, { title: string; prompt: string; order: number }> = {}
    for (const section of templateSections) {
      sectionMap[section.section_key] = {
        title: section.title,
        prompt: section.prompt || section.description || '',
        order: section.order || 0,
      }
    }

    // Generate content for each requested section
    const generatedSections: Record<string, string> = {}

    for (const sectionKey of sections) {
      const sectionInfo = sectionMap[sectionKey]
      if (!sectionInfo) {
        generatedSections[sectionKey] = `[Section "${sectionKey}" not found in template]`
        continue
      }

      const sectionPrompt = [
        `Generate the "${sectionInfo.title}" section of the expert witness report.`,
        '',
        sectionInfo.prompt
          ? `Section instructions: ${sectionInfo.prompt}`
          : '',
        '',
        `Use the following case data and evidence to write this section:`,
        '',
        fullContext,
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
          max_tokens: AI_CONFIG.defaultParams.max_tokens,
          temperature: AI_CONFIG.defaultParams.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: sectionPrompt }],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        generatedSections[sectionKey] = `[Error generating section: ${response.status} - ${errorText}]`
        continue
      }

      const result = await response.json()
      generatedSections[sectionKey] = result.content?.[0]?.text || '[No content generated]'
    }

    return NextResponse.json({
      caseId,
      templateId,
      sections: generatedSections,
      model,
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
