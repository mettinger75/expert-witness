import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, SYSTEM_PROMPTS, assembleContext } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const {
      messages,
      conversationType = 'general',
      caseId,
      modelTier = 'standard',
      maxTokens = AI_CONFIG.defaultParams.max_tokens,
      temperature = AI_CONFIG.defaultParams.temperature,
    } = body

    // Select system prompt based on conversation type
    const systemPromptMap: Record<string, string> = {
      case_analysis: SYSTEM_PROMPTS.case_summary,
      document_review: SYSTEM_PROMPTS.document_analysis,
      report_drafting: SYSTEM_PROMPTS.report_generation,
      research: SYSTEM_PROMPTS.research_assistant,
      deposition_prep: SYSTEM_PROMPTS.deposition_prep,
      standard_of_care: SYSTEM_PROMPTS.standard_of_care,
      general: SYSTEM_PROMPTS.research_assistant,
      timeline_review: SYSTEM_PROMPTS.timeline_generation,
      causation_analysis: SYSTEM_PROMPTS.standard_of_care,
    }

    let systemPrompt = systemPromptMap[conversationType] || SYSTEM_PROMPTS.research_assistant

    // If case-specific, assemble context with documents
    if (caseId) {
      const supabase = getSupabaseAdmin()
      const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      // Fetch processed documents with AI summaries
      const { data: documents } = await supabase
        .from('documents')
        .select('original_file_name, document_type, ai_summary, ai_key_findings, ai_extracted_dates, ai_extracted_medications, ai_extracted_providers')
        .eq('case_id', caseId)
        .not('ai_summary', 'is', null)
        .order('created_at', { ascending: true })
        .limit(20)

      if (caseData) {
        // Build document context strings
        const documentStrings = documents?.map((doc) => {
          const parts = [`**${doc.original_file_name}** (${doc.document_type || 'document'})`]
          if (doc.ai_summary) parts.push(`Summary: ${doc.ai_summary}`)
          if (doc.ai_key_findings) {
            const findings = Array.isArray(doc.ai_key_findings) ? doc.ai_key_findings : []
            if (findings.length > 0) parts.push(`Key Findings: ${findings.join('; ')}`)
          }
          if (doc.ai_extracted_dates) {
            const dates = Array.isArray(doc.ai_extracted_dates) ? doc.ai_extracted_dates : []
            if (dates.length > 0) parts.push(`Key Dates: ${dates.join('; ')}`)
          }
          if (doc.ai_extracted_medications) {
            const meds = Array.isArray(doc.ai_extracted_medications) ? doc.ai_extracted_medications : []
            if (meds.length > 0) parts.push(`Medications: ${meds.join(', ')}`)
          }
          if (doc.ai_extracted_providers) {
            const providers = Array.isArray(doc.ai_extracted_providers) ? doc.ai_extracted_providers : []
            if (providers.length > 0) parts.push(`Providers: ${providers.join(', ')}`)
          }
          return parts.join('\n')
        }) || []

        const context = assembleContext(caseData, documentStrings)
        systemPrompt = `${systemPrompt}\n\n${context}`
      }
    }

    // Select model
    const modelKey = modelTier as keyof typeof AI_CONFIG.models
    const model = AI_CONFIG.models[modelKey] || AI_CONFIG.models.standard

    // Call Anthropic API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    // Stream the response back, normalizing Anthropic SSE events
    // into simplified { content: "..." } format for the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const event = JSON.parse(data)

                // Extract text content from content_block_delta events
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  const simplified = JSON.stringify({ content: event.delta.text })
                  controller.enqueue(encoder.encode(`data: ${simplified}\n\n`))
                }

                // Extract usage info from message_delta events
                if (event.type === 'message_delta' && event.usage) {
                  const usage = JSON.stringify({
                    usage: {
                      input: event.usage.input_tokens || 0,
                      output: event.usage.output_tokens || 0,
                    },
                  })
                  controller.enqueue(encoder.encode(`data: ${usage}\n\n`))
                }

                // Also capture usage from message_start
                if (event.type === 'message_start' && event.message?.usage) {
                  const usage = JSON.stringify({
                    usage: {
                      input: event.message.usage.input_tokens || 0,
                      output: event.message.usage.output_tokens || 0,
                    },
                  })
                  controller.enqueue(encoder.encode(`data: ${usage}\n\n`))
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }

          // Signal done
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Stream error:', error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
