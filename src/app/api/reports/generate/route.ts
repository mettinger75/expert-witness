import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, MODEL_BY_TASK, SYSTEM_PROMPTS, assembleContext } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

export const maxDuration = 180 // 3 minutes for report generation

const ETTINGER_SYSTEM_PROMPT = `You are ghostwriting an expert witness report for Mark Ettinger, M.D., a board-certified anesthesiologist and critical care physician who serves as Chair and Medical Director of the Department of Anesthesiology at Medical City Arlington, a high-volume Level II trauma center in Texas.

WRITING STYLE GUIDELINES (based on Dr. Ettinger's actual reports):
- Use formal medical-legal language throughout
- Be authoritative and confident but measured in tone
- Explain complex medical concepts clearly for attorney and jury comprehension
- Use precise medical terminology (drug names, dosages, vital sign values, timestamps)
- Reference specific evidence from medical records to support every assertion
- Use numbered lists for standard-of-care violations
- Use bullet points with "Standard of Care:" and "Breach:" sub-headers when analyzing violations
- Include specific vital sign data (SpO₂, BP, HR) with timestamps when available
- Use phrases like:
  - "the standard of care required..."
  - "a clear violation of the standard of care"
  - "an ordinary anesthesiologist would have..."
  - "to a reasonable degree of medical certainty"
  - "more likely than not"
  - "but for the inadequate..."
  - "proximate cause"
  - "would have been avoided"
- When discussing what should have been done, explain WHY it matters clinically
- Be thorough but avoid unnecessary repetition
- Write in a style that demonstrates deep clinical expertise while remaining accessible

${SYSTEM_PROMPTS.report_generation}`

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { caseId, templateId, sectionKeys, reportId } = body

    if (!caseId || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, templateId' },
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
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch template with section mappings
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Report template not found' }, { status: 404 })
    }

    // Fetch section mappings with full section data
    const { data: mappings } = await supabase
      .from('template_section_mappings')
      .select('*, section:template_sections(*)')
      .eq('template_id', templateId)
      .eq('is_included', true)
      .order('sort_order', { ascending: true })

    if (!mappings?.length) {
      return NextResponse.json({ error: 'No sections found for template' }, { status: 404 })
    }

    // Fetch supporting case data
    const [
      { data: documents },
      { data: timelineEntries },
      { data: depositions },
      { data: caseNotes },
      { data: contacts },
    ] = await Promise.all([
      supabase
        .from('documents')
        .select('id, file_name, original_file_name, category:document_type, description, ocr_text, ai_summary, ai_key_findings')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      supabase
        .from('medical_records_timeline')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: true }),
      supabase
        .from('depositions')
        .select('*')
        .eq('case_id', caseId)
        .order('deposition_date', { ascending: true }),
      supabase
        .from('case_notes')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      supabase
        .from('case_contacts')
        .select('*, contact:contacts(*)')
        .eq('case_id', caseId),
    ])

    // Assemble rich context
    const documentSummaries = documents?.map(
      (doc) => {
        const parts = [`[${doc.category || 'Document'}] ${doc.file_name || doc.original_file_name}`]
        if (doc.ai_summary) parts.push(`Summary: ${doc.ai_summary}`)
        if (doc.ai_key_findings?.length) parts.push(`Key findings: ${doc.ai_key_findings.join('; ')}`)
        if (doc.ocr_text) parts.push(`Content: ${doc.ocr_text.substring(0, 3000)}`)
        return parts.join('\n')
      }
    ) || []

    const timelineStrings = timelineEntries?.map(
      (entry) =>
        `${entry.event_date || 'Unknown'}${entry.event_time ? ` ${entry.event_time}` : ''} - ${entry.event_title || entry.event_type}: ${entry.event_description || ''} ${entry.provider_name ? `(${entry.provider_name})` : ''} ${entry.facility_name ? `at ${entry.facility_name}` : ''}`
    ) || []

    const context = assembleContext(caseData, documentSummaries, timelineStrings)

    // Add deposition context
    const depositionContext = depositions?.length
      ? '\n\n## Depositions\n' +
        depositions
          .map((dep) =>
            `${dep.deponent_name || 'Unknown'} (${dep.deposition_date || 'No date'}, ${dep.deponent_role || 'Unknown role'}): ${dep.summary || dep.ai_summary || dep.preparation_notes || 'No summary'}`
          )
          .join('\n')
      : ''

    // Add case notes context
    const notesContext = caseNotes?.length
      ? '\n\n## Case Notes\n' +
        caseNotes
          .map((note) => `[${note.note_type}] ${note.title || ''}: ${note.content.substring(0, 500)}`)
          .join('\n')
      : ''

    // Add contacts context
    const contactsContext = contacts?.length
      ? '\n\n## Case Contacts\n' +
        contacts
          .map((cc: { role: string; is_primary: boolean; contact: { first_name: string; last_name: string; organization_name: string | null; contact_type: string } }) =>
            `${cc.role}${cc.is_primary ? ' (primary)' : ''}: ${cc.contact?.first_name} ${cc.contact?.last_name}${cc.contact?.organization_name ? ` - ${cc.contact.organization_name}` : ''} (${cc.contact?.contact_type})`
          )
          .join('\n')
      : ''

    const fullContext = context + depositionContext + notesContext + contactsContext

    // Determine which sections to generate
    const sectionsToGenerate = sectionKeys?.length
      ? mappings.filter((m: { section: { section_key: string } }) => sectionKeys.includes(m.section.section_key))
      : mappings

    // Use report_generation model
    const modelTier = MODEL_BY_TASK.report_generation
    const model = AI_CONFIG.models[modelTier]

    // Generate content for each section
    const generatedSections: Record<string, { title: string; content: string; is_ai_generated: boolean }> = {}

    for (const mapping of sectionsToGenerate) {
      const section = (mapping as { section: { section_key: string; section_name: string; is_ai_generated: boolean; ai_prompt: string | null; default_content: string | null; description: string | null } }).section
      if (!section) continue

      // If section has default content and is not AI-generated, use the default
      if (!section.is_ai_generated && section.default_content) {
        // Replace template variables in default content
        let content = section.default_content
        content = content.replace(/\{\{patient_name\}\}/g, caseData.patient_name || '[Patient Name]')
        content = content.replace(/\{\{date_of_incident\}\}/g, caseData.date_of_incident || '[Date of Incident]')
        content = content.replace(/\{\{case_name\}\}/g, caseData.case_name || '[Case Name]')

        generatedSections[section.section_key] = {
          title: section.section_name,
          content,
          is_ai_generated: false,
        }
        continue
      }

      // AI-generated section
      const sectionPrompt = [
        `Generate the "${section.section_name}" section of an expert witness report for the case: ${caseData.case_name}.`,
        '',
        section.ai_prompt || section.description || '',
        '',
        'Use the following case data and evidence:',
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
          max_tokens: 8192,
          temperature: 0.3,
          system: ETTINGER_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: sectionPrompt }],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        generatedSections[section.section_key] = {
          title: section.section_name,
          content: `[Error generating section: ${response.status} - ${errorText.substring(0, 200)}]`,
          is_ai_generated: true,
        }
        continue
      }

      let result
      try {
        result = await response.json()
      } catch {
        generatedSections[section.section_key] = {
          title: section.section_name,
          content: '[Error: Failed to parse AI response]',
          is_ai_generated: true,
        }
        continue
      }

      generatedSections[section.section_key] = {
        title: section.section_name,
        content: result.content?.[0]?.text || '[No content generated]',
        is_ai_generated: true,
      }
    }

    // Build the header from template
    let header = template.header_content || ''
    const retainingAttorney = contacts?.find((cc: { role: string; contact: { first_name: string; last_name: string } }) => cc.role === 'retaining_attorney')
    const attorneyName = retainingAttorney
      ? `${retainingAttorney.contact?.first_name} ${retainingAttorney.contact?.last_name}`
      : 'Counsel'
    header = header.replace(/\{\{attorney_name\}\}/g, `Counsel for ${caseData.side === 'plaintiff' ? 'Plaintiff' : 'Defense'} ${attorneyName}`)
    header = header.replace(/\{\{report_date\}\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
    header = header.replace(/\{\{case_name\}\}/g, caseData.case_name)

    // If we have a reportId, update it; otherwise create a new report
    if (reportId) {
      await supabase
        .from('reports')
        .update({
          sections_data: generatedSections,
          content: { header, footer: template.footer_content, sections: generatedSections },
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
    }

    return NextResponse.json({
      caseId,
      templateId,
      header,
      footer: template.footer_content || '',
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
